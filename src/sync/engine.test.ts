import { beforeEach, describe, expect, it } from 'vitest'
import { createTask, addParking, deleteParking, completeTask } from '../lib/actions'
import { applyRemote, db, put } from '../lib/db'
import { enqueueAll, MemoryCursor, pull, push, syncOnce } from './engine'
import { MemoryRemote } from './remote'

const base = { title: 'Làm 20 câu S3', dod: [], consequence: '', nextAction: '', scheduledFor: '2026-09-08' }

beforeEach(async () => {
  await Promise.all([db.goals.clear(), db.tasks.clear(), db.sessions.clear(), db.parking.clear(), db.dayLogs.clear(), db.settings.clear(), db.outbox.clear()])
})

describe('outbox', () => {
  it('put/patch ghi outbox một dòng cho mỗi bản ghi', async () => {
    const t = await createTask(base)
    await completeTask(t.id)
    const ob = await db.outbox.toArray()
    expect(ob).toHaveLength(1)
    expect(ob[0]).toMatchObject({ table: 'tasks', rowId: t.id })
  })
  it('push đẩy lên remote và xoá outbox', async () => {
    const t = await createTask(base)
    await addParking('x', '2026-09-08')
    const remote = new MemoryRemote()
    expect(await push(remote)).toBe(2)
    expect(await db.outbox.count()).toBe(0)
    expect(remote.rows.get(`tasks:${t.id}`)!.data).toMatchObject({ title: 'Làm 20 câu S3' })
  })
  it('xoá mềm được đẩy lên với deleted=true', async () => {
    await addParking('x', '2026-09-08')
    const p = (await db.parking.toArray())[0]
    await deleteParking(p.id)
    const remote = new MemoryRemote()
    await push(remote)
    expect(remote.rows.get(`parking:${p.id}`)!.deleted).toBe(true)
  })
})

describe('pull (last-write-wins)', () => {
  it('ghi bản mới hơn từ remote, giữ bản local mới hơn', async () => {
    const remote = new MemoryRemote()
    const cursor = new MemoryCursor()
    await applyRemote('tasks', { ...base, id: 'a', status: 'planned', deferrals: [], createdAt: 0, updatedAt: 100 })
    await applyRemote('tasks', { ...base, id: 'b', status: 'planned', deferrals: [], createdAt: 0, updatedAt: 900 })
    await remote.upsert([
      { table_name: 'tasks', id: 'a', data: { ...base, id: 'a', status: 'done', deferrals: [], createdAt: 0 }, updated_at: 500, deleted: false },
      { table_name: 'tasks', id: 'b', data: { ...base, id: 'b', status: 'done', deferrals: [], createdAt: 0 }, updated_at: 500, deleted: false },
      { table_name: 'dayLogs', id: '2026-09-08', data: { date: '2026-09-08', locked: true }, updated_at: 700, deleted: false },
    ])
    expect(await pull(remote, cursor)).toBe(2)
    expect((await db.tasks.get('a'))!.status).toBe('done')
    expect((await db.tasks.get('b'))!.status).toBe('planned')
    expect((await db.dayLogs.get('2026-09-08'))!.locked).toBe(true)
    expect(cursor.get()).toBe(700)
    // pull lại không có gì mới
    expect(await pull(remote, cursor)).toBe(0)
  })
  it('pull không tạo outbox (không vòng lặp)', async () => {
    const remote = new MemoryRemote()
    await remote.upsert([{ table_name: 'parking', id: 'p', data: { id: 'p', text: 'x', createdAt: 0, createdOn: '2026-09-08' }, updated_at: 5, deleted: false }])
    await pull(remote, new MemoryCursor())
    expect(await db.outbox.count()).toBe(0)
  })
})

describe('first login merge', () => {
  it('enqueueAll + syncOnce hợp nhất hai máy', async () => {
    const remote = new MemoryRemote()
    // máy B đã có dữ liệu trên cloud
    await remote.upsert([{ table_name: 'goals', id: 'g1', data: { id: 'g1', weekStart: '2026-09-07', title: 'Nộp 2 CV', status: 'open', createdAt: 0 }, updated_at: 10, deleted: false }])
    // máy A có dữ liệu local chưa từng sync
    await put('settings', { id: 'default', shutdownTime: '21:00', bedtimeTarget: '23:00', morningTime: '07:30', minFocusMin: 10, extendMin: 15, onboarded: true, lang: 'vi', pomodoroMin: 25, breakMin: 5 })
    await db.outbox.clear() // giả lập: đã tồn tại trước khi có sync
    await enqueueAll()
    const r = await syncOnce(remote, new MemoryCursor())
    expect(r.pushed).toBe(1)
    expect(r.pulled).toBe(1)
    expect(await db.goals.get('g1')).toMatchObject({ title: 'Nộp 2 CV' })
    expect(remote.rows.has('settings:default')).toBe(true)
  })
})
