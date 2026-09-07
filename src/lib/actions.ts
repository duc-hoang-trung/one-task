import { now } from './clock'
import { db, getOrCreateDayLog, uid } from './db'
import { addDays, toHM, toISODate, type HM, type ISODate } from './dates'
import type { DeferralReason, DodItem, ParkingResolution, Task, WeekGoal } from './types'

export interface NewTaskInput {
  title: string
  dod: string[]
  consequence: string
  estimateMin: number
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
    estimateMin: input.estimateMin,
    nextAction: input.nextAction.trim(),
    scheduledFor: input.scheduledFor,
    status: 'planned',
    deferrals: [],
    createdAt: now().getTime(),
  }
  await db.tasks.add(task)
  return task
}

export async function setDod(taskId: string, dod: DodItem[]) {
  await db.tasks.update(taskId, { dod })
}

export async function completeTask(taskId: string) {
  const t = await db.tasks.get(taskId)
  if (!t) return
  await db.tasks.update(taskId, {
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
    await db.tasks.update(taskId, { status: 'dropped', deferrals })
  } else if (reason === 'urgent') {
    await db.tasks.update(taskId, { scheduledFor: addDays(fromDate, 1), deferrals })
  } else {
    // dont-want: chỉ ghi lại; việc vẫn là việc chính hôm nay
    await db.tasks.update(taskId, { deferrals })
  }
}

export async function rescheduleTask(taskId: string, to: ISODate, nextAction: string) {
  await db.tasks.update(taskId, { scheduledFor: to, nextAction: nextAction.trim(), status: 'planned' })
}

export async function dropTask(taskId: string, note?: string, fromDate?: ISODate) {
  const t = await db.tasks.get(taskId)
  if (!t) return
  await db.tasks.update(taskId, {
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
  if (open) await db.sessions.update(open.id, { endedAt: nowMs })
  const id = uid()
  await db.sessions.add({ id, taskId, date, startedAt: nowMs, plannedMin })
  await db.tasks.update(taskId, { status: 'active' })
  return id
}

export async function extendSession(sessionId: string, byMin: number) {
  const s = await db.sessions.get(sessionId)
  if (!s) return
  await db.sessions.update(sessionId, { plannedMin: s.plannedMin + byMin })
}

export async function endSession(sessionId: string, nowMs = now().getTime()) {
  await db.sessions.update(sessionId, { endedAt: nowMs })
}

/** Phiên quên tắt từ ngày khác → kết thúc tại startedAt + plannedMin. */
export async function closeStaleSessions(today: ISODate) {
  const open = await db.sessions.filter((s) => s.endedAt === undefined && s.date !== today).toArray()
  for (const s of open) await db.sessions.update(s.id, { endedAt: s.startedAt + s.plannedMin * 60_000 })
}

// ---- Parking lot -------------------------------------------------------------

export async function addParking(text: string, today: ISODate) {
  const t = text.trim()
  if (!t) return
  await db.parking.add({ id: uid(), text: t, createdAt: now().getTime(), createdOn: today })
}

export async function resolveParking(id: string, resolution: ParkingResolution, today: ISODate) {
  await db.parking.update(id, {
    resolution,
    resolvedAt: now().getTime(),
    forDate: resolution === 'tomorrow' ? addDays(today, 1) : undefined,
  })
}

export async function toggleParkingDone(id: string, done: boolean) {
  await db.parking.update(id, { doneAt: done ? now().getTime() : undefined })
}

export async function deleteParking(id: string) {
  await db.parking.delete(id)
}

// ---- Day lifecycle -----------------------------------------------------------

export async function openMorning(today: ISODate, bedtimeActual?: HM, now = new Date()) {
  await getOrCreateDayLog(today)
  await db.dayLogs.update(today, { morningDoneAt: toHM(now) })
  if (bedtimeActual) {
    const y = addDays(today, -1)
    await getOrCreateDayLog(y)
    await db.dayLogs.update(y, { bedtimeActual })
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
  if (open) await db.sessions.update(open.id, { endedAt: now.getTime() })
  await getOrCreateDayLog(args.today)
  await db.dayLogs.update(args.today, {
    shutdownAt: toHM(now),
    locked: true,
    mainTaskOutcome: args.outcome,
    worry: args.worry && (args.worry.concern || args.worry.nextStep) ? args.worry : undefined,
  })
}

// ---- Goals -------------------------------------------------------------------

export const MAX_GOALS_PER_WEEK = 2

export async function addGoal(weekStart: ISODate, title: string): Promise<WeekGoal | null> {
  const open = await db.goals.where('weekStart').equals(weekStart).filter((g) => g.status === 'open').count()
  if (open >= MAX_GOALS_PER_WEEK) return null
  const g: WeekGoal = { id: uid(), weekStart, title: title.trim(), status: 'open', createdAt: now().getTime() }
  await db.goals.add(g)
  return g
}

export async function setGoalStatus(id: string, status: WeekGoal['status']) {
  await db.goals.update(id, { status })
}

export async function wipeAll() {
  await Promise.all([
    db.goals.clear(), db.tasks.clear(), db.sessions.clear(), db.parking.clear(), db.dayLogs.clear(), db.settings.clear(),
  ])
}

export const todayISO = (d: Date) => toISODate(d)
