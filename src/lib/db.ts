import Dexie, { type EntityTable } from 'dexie'
import type { DayLog, ParkingItem, Session, Settings, Task, WeekGoal } from './types'
import { DEFAULT_SETTINGS } from './types'
import type { ISODate } from './dates'

export class MotViecDB extends Dexie {
  goals!: EntityTable<WeekGoal, 'id'>
  tasks!: EntityTable<Task, 'id'>
  sessions!: EntityTable<Session, 'id'>
  parking!: EntityTable<ParkingItem, 'id'>
  dayLogs!: EntityTable<DayLog, 'date'>
  settings!: EntityTable<Settings, 'id'>

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
  }
}

export const db = new MotViecDB()

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get('default')
  if (s) return { ...DEFAULT_SETTINGS, ...s }
  await db.settings.put(DEFAULT_SETTINGS)
  return DEFAULT_SETTINGS
}

export async function getOrCreateDayLog(date: ISODate): Promise<DayLog> {
  const existing = await db.dayLogs.get(date)
  if (existing) return existing
  const fresh: DayLog = { date, locked: false }
  await db.dayLogs.put(fresh)
  return fresh
}

/** Việc chính của một ngày: task lên lịch cho ngày đó, chưa đóng. */
export async function mainTaskFor(date: ISODate): Promise<Task | undefined> {
  const list = await db.tasks.where('scheduledFor').equals(date).toArray()
  return list.find((t) => t.status === 'planned' || t.status === 'active')
}

export async function exportAll() {
  const [goals, tasks, sessions, parking, dayLogs, settings] = await Promise.all([
    db.goals.toArray(),
    db.tasks.toArray(),
    db.sessions.toArray(),
    db.parking.toArray(),
    db.dayLogs.toArray(),
    db.settings.toArray(),
  ])
  return { exportedAt: new Date().toISOString(), goals, tasks, sessions, parking, dayLogs, settings }
}
