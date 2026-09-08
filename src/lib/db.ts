import Dexie, { type EntityTable } from 'dexie'
import type { DayLog, Goal, ParkingItem, Session, Settings, Task } from './types'
import { weekKey } from './period'
import { DEFAULT_SETTINGS } from './types'
import type { ISODate } from './dates'
import { now } from './clock'

export type SyncTable = 'goals' | 'tasks' | 'sessions' | 'parking' | 'dayLogs' | 'settings'
export const SYNC_TABLES: SyncTable[] = ['goals', 'tasks', 'sessions', 'parking', 'dayLogs', 'settings']

/** Hàng chờ đẩy lên cloud. id = `${table}:${rowId}` để ghi nhiều lần chỉ giữ 1 dòng. */
export interface OutboxRow {
  id: string
  table: SyncTable
  rowId: string
  updatedAt: number
}

export class MotViecDB extends Dexie {
  goals!: EntityTable<Goal, 'id'>
  tasks!: EntityTable<Task, 'id'>
  sessions!: EntityTable<Session, 'id'>
  parking!: EntityTable<ParkingItem, 'id'>
  dayLogs!: EntityTable<DayLog, 'date'>
  settings!: EntityTable<Settings, 'id'>
  outbox!: EntityTable<OutboxRow, 'id'>

  constructor(name = 'motviec') {
    super(name)
    this.version(1).stores({
      goals: 'id, weekStart, status',
      tasks: 'id, scheduledFor, status, goalId',
      sessions: 'id, taskId, date, startedAt',
      parking: 'id, createdAt, resolution, forDate',
      dayLogs: 'date',
      settings: 'id',
    })
    // v2: phiên có loại focus/break
    this.version(2)
      .stores({ sessions: 'id, taskId, date, startedAt, kind' })
      .upgrade((tx) => tx.table('sessions').toCollection().modify((s) => { s.kind ??= 'focus' }))
    // v3: updatedAt cho mọi bảng + outbox để đồng bộ cloud
    this.version(3)
      .stores({ outbox: 'id, table' })
      .upgrade(async (tx) => {
        const t = Date.now()
        for (const name of SYNC_TABLES) {
          await tx.table(name).toCollection().modify((r) => { r.updatedAt ??= t })
        }
      })
    // v4: nhiều việc mỗi ngày (area, quadrant, isMain, order, backlog) + goals theo tuần/quý/năm
    this.version(4)
      .stores({
        tasks: 'id, scheduledFor, status, goalId, area, quadrant',
        goals: 'id, horizon, periodKey, parentId, status',
      })
      .upgrade(async (tx) => {
        await tx.table('tasks').toCollection().modify((t) => {
          t.area ??= 'personal'
          t.isMain ??= true // trước v4 mỗi ngày đúng 1 việc chính
          t.order ??= 0
        })
        await tx.table('goals').toCollection().modify((g) => {
          if (!g.horizon) {
            g.horizon = 'week'
            g.periodKey = g.weekStart ? weekKey(g.weekStart) : ''
            g.area ??= 'personal'
            g.checkins ??= []
            delete g.weekStart
          }
        })
      })
  }
}

export const db = new MotViecDB()

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)

/** Khoá chính của một bảng (dayLogs dùng date). */
export function keyOf(table: SyncTable, row: { id?: string; date?: string }): string {
  return table === 'dayLogs' ? (row.date as string) : (row.id as string)
}

type Listener = () => void
const listeners = new Set<Listener>()
/** Sync module đăng ký để biết khi có thay đổi cần đẩy. */
export function onLocalWrite(fn: Listener) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/**
 * Ghi có theo dõi: đặt updatedAt và ghi outbox trong cùng transaction.
 * Mọi thao tác ghi của UI phải đi qua put/patch/softDelete, không gọi db.x trực tiếp.
 */
export async function put<T extends object>(table: SyncTable, row: T) {
  const updatedAt = now().getTime()
  const full = { ...row, updatedAt } as T & { updatedAt: number }
  await db.transaction('rw', db.table(table), db.outbox, async () => {
    await db.table(table).put(full)
    const rowId = keyOf(table, full as never)
    await db.outbox.put({ id: `${table}:${rowId}`, table, rowId, updatedAt })
  })
  listeners.forEach((l) => l())
  return full
}

export async function patch(table: SyncTable, rowId: string, changes: object) {
  const updatedAt = now().getTime()
  await db.transaction('rw', db.table(table), db.outbox, async () => {
    const n = await db.table(table).update(rowId, { ...changes, updatedAt })
    if (n === 0) return
    await db.outbox.put({ id: `${table}:${rowId}`, table, rowId, updatedAt })
  })
  listeners.forEach((l) => l())
}

export async function softDelete(table: SyncTable, rowId: string) {
  await patch(table, rowId, { deleted: true })
}

/** Ghi từ cloud về: không đụng outbox (tránh vòng lặp). */
export async function applyRemote(table: SyncTable, row: object) {
  await db.table(table).put(row)
}

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get('default')
  if (s) return { ...DEFAULT_SETTINGS, ...s }
  await put('settings', DEFAULT_SETTINGS)
  return DEFAULT_SETTINGS
}

export async function getOrCreateDayLog(date: ISODate): Promise<DayLog> {
  const existing = await db.dayLogs.get(date)
  if (existing) return existing
  const fresh: DayLog = { date, locked: false }
  return put('dayLogs', fresh)
}

export const isOpen = (t: Task) => !t.deleted && (t.status === 'planned' || t.status === 'active')

/** Việc quan trọng nhất (MIT) của một ngày, chưa đóng. */
export async function mainTaskFor(date: ISODate): Promise<Task | undefined> {
  const list = await db.tasks.where('scheduledFor').equals(date).toArray()
  return list.find((t) => t.isMain && isOpen(t))
}

/** Mọi task của một ngày (kể cả đã xong), bỏ đã xoá, theo order. */
export async function tasksFor(date: ISODate): Promise<Task[]> {
  const list = await db.tasks.where('scheduledFor').equals(date).toArray()
  return list.filter((t) => !t.deleted && t.status !== 'dropped').sort(byOrder)
}

/** Backlog: chưa lên lịch, chưa đóng. */
export async function backlogTasks(): Promise<Task[]> {
  const list = await db.tasks.filter((t) => t.scheduledFor === undefined && isOpen(t)).toArray()
  return list.sort(byOrder)
}

export const byOrder = (a: Task, b: Task) => (a.order ?? 0) - (b.order ?? 0) || a.createdAt - b.createdAt

export const notDeleted = <T extends { deleted?: boolean }>(r: T) => !r.deleted

export async function exportAll() {
  const [goals, tasks, sessions, parking, dayLogs, settings] = await Promise.all([
    db.goals.toArray(), db.tasks.toArray(), db.sessions.toArray(), db.parking.toArray(), db.dayLogs.toArray(), db.settings.toArray(),
  ])
  return { exportedAt: new Date().toISOString(), goals, tasks, sessions, parking, dayLogs, settings }
}
