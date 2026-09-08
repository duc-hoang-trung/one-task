import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import {
  addGoal, closeDay, closeStaleSessions, createTask, deferTask, endSession, extendSession, openMorning,
  resolveParking, addParking, startSession, activeSession, startBreak, setMain, scheduleTask, promoteToTask, carryOver, checkinGoal, goalsFor, reorderTasks, completeTask,
} from './actions'

const base = {
  title: 'Làm 20 câu S3', area: 'personal' as const, dod: ['20 câu có đáp án', 'Ghi 3 lỗi sai'], consequence: 'Trượt kỳ thi tháng 10',
  estimateMin: 45, nextAction: 'Mở quiz S3, làm câu 1–5', scheduledFor: '2026-09-08',
}

beforeEach(async () => {
  await Promise.all([db.goals.clear(), db.tasks.clear(), db.sessions.clear(), db.parking.clear(), db.dayLogs.clear()])
})

describe('tasks', () => {
  it('tạo task với dod chưa tick', async () => {
    const t = await createTask(base)
    expect(t.status).toBe('planned')
    expect(t.dod).toHaveLength(2)
    expect(t.dod.every((d) => !d.done)).toBe(true)
  })
  it('urgent → dời sang mai và ghi deferral', async () => {
    const t = await createTask(base)
    await deferTask(t.id, '2026-09-08', 'urgent')
    const u = (await db.tasks.get(t.id))!
    expect(u.scheduledFor).toBe('2026-09-09')
    expect(u.deferrals[0].reason).toBe('urgent')
    expect(u.status).toBe('planned')
  })
  it('new-info → bỏ hẳn', async () => {
    const t = await createTask(base)
    await deferTask(t.id, '2026-09-08', 'new-info')
    expect((await db.tasks.get(t.id))!.status).toBe('dropped')
  })
  it('dont-want → chỉ ghi lại, việc vẫn hôm nay', async () => {
    const t = await createTask(base)
    await deferTask(t.id, '2026-09-08', 'dont-want')
    const u = (await db.tasks.get(t.id))!
    expect(u.scheduledFor).toBe('2026-09-08')
    expect(u.deferrals).toHaveLength(1)
  })
})

describe('sessions', () => {
  it('chỉ 1 phiên chạy; phiên cũ bị đóng khi mở phiên mới', async () => {
    const t = await createTask(base)
    const a = await startSession(t.id, '2026-09-08', 10, 1000)
    await startSession(t.id, '2026-09-08', 10, 5000)
    expect((await db.sessions.get(a))!.endedAt).toBe(5000)
    expect((await activeSession())!.startedAt).toBe(5000)
    expect((await db.tasks.get(t.id))!.status).toBe('active')
  })
  it('extend cộng phút, end đặt endedAt', async () => {
    const t = await createTask(base)
    const id = await startSession(t.id, '2026-09-08', 10, 0)
    await extendSession(id, 15)
    expect((await db.sessions.get(id))!.plannedMin).toBe(25)
    await endSession(id, 60_000)
    expect((await db.sessions.get(id))!.endedAt).toBe(60_000)
  })
  it('phiên quên tắt từ hôm khác được đóng tại startedAt + plannedMin', async () => {
    const t = await createTask(base)
    const id = await startSession(t.id, '2026-09-07', 10, 0)
    await closeStaleSessions('2026-09-08')
    expect((await db.sessions.get(id))!.endedAt).toBe(10 * 60_000)
  })
})

describe('day lifecycle', () => {
  it('openMorning ghi giờ ngủ vào hôm qua', async () => {
    await openMorning('2026-09-08', '23:45', new Date(2026, 8, 8, 7, 31))
    expect((await db.dayLogs.get('2026-09-08'))!.morningDoneAt).toBe('07:31')
    expect((await db.dayLogs.get('2026-09-07'))!.bedtimeActual).toBe('23:45')
  })
  it('closeDay khoá ngày và tắt phiên đang chạy', async () => {
    const t = await createTask(base)
    await startSession(t.id, '2026-09-08', 10, 0)
    await closeDay({ today: '2026-09-08', outcome: 'progress', worry: { concern: 'a', nextStep: 'b' }, now: new Date(2026, 8, 8, 21, 5) })
    const log = (await db.dayLogs.get('2026-09-08'))!
    expect(log.locked).toBe(true)
    expect(log.shutdownAt).toBe('21:05')
    expect(log.worry).toEqual({ concern: 'a', nextStep: 'b' })
    expect(await activeSession()).toBeUndefined()
  })
})

describe('parking + goals', () => {
  it('lên mai đặt forDate = ngày mai', async () => {
    await addParking('Hỏi HR về bảo hiểm', '2026-09-08')
    const p = (await db.parking.toArray())[0]
    await resolveParking(p.id, 'tomorrow', '2026-09-08')
    expect((await db.parking.get(p.id))!.forDate).toBe('2026-09-09')
  })
  it('goal theo kỳ + check-in', async () => {
    const g = await addGoal({ horizon: 'week', periodKey: '2026-W37', title: 'Nộp 2 CV', area: 'work' })
    await addGoal({ horizon: 'quarter', periodKey: '2026-Q3', title: 'Đổi việc', area: 'work' })
    await checkinGoal(g.id, 'behind', 'mới nộp 1')
    const week = await goalsFor('2026-W37')
    expect(week).toHaveLength(1)
    expect(week[0].checkins[0]).toMatchObject({ state: 'behind', note: 'mới nộp 1' })
  })
  it('promoteToTask biến parking thành task backlog', async () => {
    await addParking('Hỏi HR về bảo hiểm', '2026-09-08')
    const p = (await db.parking.toArray())[0]
    const t = await promoteToTask(p.id, { area: 'work', quadrant: 'q3' })
    expect(t).toMatchObject({ title: 'Hỏi HR về bảo hiểm', area: 'work', quadrant: 'q3', scheduledFor: undefined })
    expect((await db.parking.get(p.id))!.promotedTaskId).toBe(t!.id)
  })
})

describe('multi-task day', () => {
  it('nhiều task một ngày, order tăng dần, chỉ 1 MIT', async () => {
    const a = await createTask({ ...base, title: 'A' })
    const b = await createTask({ ...base, title: 'B', area: 'work' })
    const c = await createTask({ ...base, title: 'C', isMain: true })
    expect([a.order, b.order, c.order]).toEqual([0, 1, 2])
    expect((await db.tasks.get(c.id))!.isMain).toBe(true)
    await setMain(a.id)
    expect((await db.tasks.get(a.id))!.isMain).toBe(true)
    expect((await db.tasks.get(c.id))!.isMain).toBe(false)
    await reorderTasks([c.id, a.id, b.id])
    expect((await db.tasks.get(c.id))!.order).toBe(0)
  })
  it('scheduleTask về backlog gỡ sao; lên ngày mới giữ sao và xuống cuối', async () => {
    const a = await createTask({ ...base, title: 'A', isMain: true })
    await createTask({ ...base, title: 'X', scheduledFor: '2026-09-09' })
    await scheduleTask(a.id, undefined)
    let t = (await db.tasks.get(a.id))!
    expect(t.scheduledFor).toBeUndefined()
    expect(t.isMain).toBe(false)
    await setMain(a.id) // backlog: không có ngày → chỉ set flag
    await scheduleTask(a.id, '2026-09-09')
    t = (await db.tasks.get(a.id))!
    expect(t.scheduledFor).toBe('2026-09-09')
    expect(t.order).toBe(1)
  })
  it('carryOver dời mọi việc chưa xong sang mai', async () => {
    const a = await createTask({ ...base, title: 'A' })
    const b = await createTask({ ...base, title: 'B' })
    await completeTask(a.id)
    expect(await carryOver('2026-09-08', '2026-09-09')).toBe(1)
    expect((await db.tasks.get(b.id))!.scheduledFor).toBe('2026-09-09')
    expect((await db.tasks.get(a.id))!.scheduledFor).toBe('2026-09-08')
  })
})

describe('breaks', () => {
  it('startBreak đóng phiên focus và mở phiên break', async () => {
    const t = await createTask(base)
    const f = await startSession(t.id, '2026-09-08', 10, 0)
    const b = await startBreak('2026-09-08', 5, 25 * 60_000)
    expect((await db.sessions.get(f))!.endedAt).toBe(25 * 60_000)
    const br = (await db.sessions.get(b))!
    expect(br.kind).toBe('break')
    expect(br.taskId).toBe('')
    expect((await activeSession())!.id).toBe(b)
  })
})
