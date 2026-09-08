import { now } from './clock'
import { db, getOrCreateDayLog, patch, put, softDelete, uid } from './db'
import { addDays, toHM, toISODate, type HM, type ISODate } from './dates'
import type { DeferralReason, DodItem, ParkingResolution, Task, WeekGoal } from './types'

export interface NewTaskInput {
  title: string
  dod: string[]
  consequence: string
  estimateMin?: number
  nextAction: string
  scheduledFor: ISODate
  goalId?: string
}

export async function createTask(input: NewTaskInput): Promise<Task> {
  const task: Task = {
    id: uid(),
    goalId: input.goalId || undefined,
    title: input.title.trim(),
    dod: input.dod.map((text) => ({ text: text.trim(), done: false })).filter((d) => d.text),
    consequence: input.consequence.trim(),
    estimateMin: input.estimateMin && input.estimateMin > 0 ? input.estimateMin : undefined,
    nextAction: input.nextAction.trim(),
    scheduledFor: input.scheduledFor,
    status: 'planned',
    deferrals: [],
    createdAt: now().getTime(),
  }
  await put('tasks', task)
  return task
}

export async function setDod(taskId: string, dod: DodItem[]) {
  await patch('tasks', taskId, { dod })
}

export async function completeTask(taskId: string) {
  const t = await db.tasks.get(taskId)
  if (!t) return
  await patch('tasks', taskId, {
    status: 'done',
    doneAt: now().getTime(),
    dod: t.dod.map((d) => ({ ...d, done: true })),
  })
}

/** Huỷ/dời việc chính với lý do. 'new-info' → bỏ hẳn; 'urgent' → dời sang mai. */
export async function deferTask(taskId: string, fromDate: ISODate, reason: DeferralReason, note?: string) {
  const t = await db.tasks.get(taskId)
  if (!t) return
  const deferrals = [...t.deferrals, { at: now().getTime(), fromDate, reason, note }]
  if (reason === 'new-info') {
    await patch('tasks', taskId, { status: 'dropped', deferrals })
  } else if (reason === 'urgent') {
    await patch('tasks', taskId, { scheduledFor: addDays(fromDate, 1), deferrals })
  } else {
    // dont-want: chỉ ghi lại; việc vẫn là việc chính hôm nay
    await patch('tasks', taskId, { deferrals })
  }
}

export async function rescheduleTask(taskId: string, to: ISODate, nextAction: string) {
  await patch('tasks', taskId, { scheduledFor: to, nextAction: nextAction.trim(), status: 'planned' })
}

export async function dropTask(taskId: string, note?: string, fromDate?: ISODate) {
  const t = await db.tasks.get(taskId)
  if (!t) return
  await patch('tasks', taskId, {
    status: 'dropped',
    deferrals: [...t.deferrals, { at: now().getTime(), fromDate: fromDate ?? t.scheduledFor, reason: 'new-info', note }],
  })
}

// ---- Sessions ----------------------------------------------------------------

export async function activeSession() {
  const open = await db.sessions.filter((s) => s.endedAt === undefined).toArray()
  return open.sort((a, b) => b.startedAt - a.startedAt)[0]
}

export async function startSession(taskId: string, date: ISODate, plannedMin: number, nowMs = now().getTime()) {
  // Chỉ 1 phiên chạy tại một thời điểm.
  const open = await activeSession()
  if (open) await patch('sessions', open.id, { endedAt: nowMs })
  const id = uid()
  await put('sessions', { id, taskId, date, startedAt: nowMs, plannedMin, kind: 'focus' })
  await patch('tasks', taskId, { status: 'active' })
  return id
}

/** Nghỉ ngắn: kết thúc phiên đang chạy, mở phiên break. Không tính vào phút tập trung. */
export async function startBreak(date: ISODate, plannedMin: number, nowMs = now().getTime()) {
  const open = await activeSession()
  if (open) await patch('sessions', open.id, { endedAt: nowMs })
  const id = uid()
  await put('sessions', { id, taskId: '', date, startedAt: nowMs, plannedMin, kind: 'break' })
  return id
}

export async function extendSession(sessionId: string, byMin: number) {
  const s = await db.sessions.get(sessionId)
  if (!s) return
  await patch('sessions', sessionId, { plannedMin: s.plannedMin + byMin })
}

export async function endSession(sessionId: string, nowMs = now().getTime()) {
  await patch('sessions', sessionId, { endedAt: nowMs })
}

/** Phiên quên tắt từ ngày khác → kết thúc tại startedAt + plannedMin. */
export async function closeStaleSessions(today: ISODate) {
  const open = await db.sessions.filter((s) => s.endedAt === undefined && s.date !== today).toArray()
  for (const s of open) await patch('sessions', s.id, { endedAt: s.startedAt + s.plannedMin * 60_000 })
}

// ---- Parking lot -------------------------------------------------------------

export async function addParking(text: string, today: ISODate) {
  const t = text.trim()
  if (!t) return
  await put('parking', { id: uid(), text: t, createdAt: now().getTime(), createdOn: today })
}

export async function resolveParking(id: string, resolution: ParkingResolution, today: ISODate) {
  await patch('parking', id, {
    resolution,
    resolvedAt: now().getTime(),
    forDate: resolution === 'tomorrow' ? addDays(today, 1) : undefined,
  })
}

export async function toggleParkingDone(id: string, done: boolean) {
  await patch('parking', id, { doneAt: done ? now().getTime() : undefined })
}

export async function deleteParking(id: string) {
  await softDelete('parking', id)
}

// ---- Day lifecycle -----------------------------------------------------------

export async function openMorning(today: ISODate, bedtimeActual?: HM, now = new Date()) {
  await getOrCreateDayLog(today)
  await patch('dayLogs', today, { morningDoneAt: toHM(now) })
  if (bedtimeActual) {
    const y = addDays(today, -1)
    await getOrCreateDayLog(y)
    await patch('dayLogs', y, { bedtimeActual })
  }
}

export async function closeDay(args: {
  today: ISODate
  outcome: 'done' | 'progress' | 'none'
  worry?: { concern: string; nextStep: string }
  now?: Date
}) {
  const now = args.now ?? new Date()
  const open = await activeSession()
  if (open) await patch('sessions', open.id, { endedAt: now.getTime() })
  await getOrCreateDayLog(args.today)
  await patch('dayLogs', args.today, {
    shutdownAt: toHM(now),
    locked: true,
    mainTaskOutcome: args.outcome,
    worry: args.worry && (args.worry.concern || args.worry.nextStep) ? args.worry : undefined,
  })
}

// ---- Goals -------------------------------------------------------------------

export const MAX_GOALS_PER_WEEK = 2

export async function addGoal(weekStart: ISODate, title: string): Promise<WeekGoal | null> {
  const open = await db.goals.where('weekStart').equals(weekStart).filter((g) => !g.deleted && g.status === 'open').count()
  if (open >= MAX_GOALS_PER_WEEK) return null
  const g: WeekGoal = { id: uid(), weekStart, title: title.trim(), status: 'open', createdAt: now().getTime() }
  await put('goals', g)
  return g
}

export async function setGoalStatus(id: string, status: WeekGoal['status']) {
  await patch('goals', id, { status })
}

export async function wipeAll() {
  await Promise.all([
    db.goals.clear(), db.tasks.clear(), db.sessions.clear(), db.parking.clear(), db.dayLogs.clear(), db.settings.clear(), db.outbox.clear(),
  ])
  localStorage.removeItem('sync.lastPulledAt')
}

export const todayISO = (d: Date) => toISODate(d)
