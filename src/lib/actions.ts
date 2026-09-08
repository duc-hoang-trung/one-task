import { now } from './clock'
import { backlogTasks, db, getOrCreateDayLog, isOpen, patch, put, softDelete, tasksFor, uid } from './db'
import { addDays, toHM, toISODate, type HM, type ISODate } from './dates'
import { isFocus, isRunning, type Reconcile } from './session'
import type { Area, CheckinState, DeferralReason, DodItem, Goal, Horizon, ParkingResolution, Quadrant, Session, Task } from './types'

// ---- Tasks -------------------------------------------------------------------

export interface NewTaskInput {
  title: string
  area?: Area
  quadrant?: Quadrant
  dod?: string[]
  consequence?: string
  estimateMin?: number
  nextAction?: string
  /** undefined = Backlog */
  scheduledFor?: ISODate
  startAt?: HM
  goalId?: string
  /** Gắn sao MIT ngay khi tạo (chỉ khi có scheduledFor). */
  isMain?: boolean
}

async function nextOrder(scheduledFor?: ISODate): Promise<number> {
  const list = scheduledFor ? await tasksFor(scheduledFor) : await backlogTasks()
  return list.length ? Math.max(...list.map((t) => t.order ?? 0)) + 1 : 0
}

export async function createTask(input: NewTaskInput): Promise<Task> {
  const task: Task = {
    id: uid(),
    goalId: input.goalId || undefined,
    title: input.title.trim(),
    area: input.area ?? 'personal',
    quadrant: input.quadrant,
    order: await nextOrder(input.scheduledFor),
    dod: (input.dod ?? []).map((text) => ({ text: text.trim(), done: false })).filter((d) => d.text),
    consequence: (input.consequence ?? '').trim(),
    estimateMin: input.estimateMin && input.estimateMin > 0 ? input.estimateMin : undefined,
    nextAction: (input.nextAction ?? '').trim(),
    scheduledFor: input.scheduledFor,
    startAt: input.startAt || undefined,
    status: 'planned',
    deferrals: [],
    createdAt: now().getTime(),
  }
  await put('tasks', task)
  if (input.isMain && input.scheduledFor) await setMain(task.id, true)
  return task
}

export type TaskPatch = Partial<Pick<Task, 'title' | 'area' | 'quadrant' | 'goalId' | 'estimateMin' | 'nextAction' | 'consequence' | 'startAt'>> & { dod?: string[] }

export async function updateTask(taskId: string, changes: TaskPatch) {
  const { dod, ...rest } = changes
  const clean: Partial<Task> = { ...rest }
  if (dod) clean.dod = dod.map((text) => ({ text: text.trim(), done: false })).filter((d) => d.text)
  if (clean.title !== undefined) clean.title = clean.title.trim()
  await patch('tasks', taskId, clean)
}

/** Gắn/bỏ sao MIT. Tối đa một MIT mở mỗi ngày: sao cũ trong ngày bị gỡ. */
export async function setMain(taskId: string, on = true) {
  const t = await db.tasks.get(taskId)
  if (!t) return
  if (on && t.scheduledFor) {
    const others = (await tasksFor(t.scheduledFor)).filter((x) => x.isMain && x.id !== taskId)
    for (const o of others) await patch('tasks', o.id, { isMain: false })
  }
  await patch('tasks', taskId, { isMain: on })
}

/** Lên lịch / về Backlog (undefined). Đưa xuống cuối danh sách đích. */
export async function scheduleTask(taskId: string, to: ISODate | undefined) {
  const t = await db.tasks.get(taskId)
  if (!t) return
  const order = await nextOrder(to)
  await patch('tasks', taskId, {
    scheduledFor: to,
    order,
    // sao MIT chỉ có nghĩa trong một ngày; về backlog thì gỡ
    isMain: to ? t.isMain : false,
    status: t.status === 'active' ? 'planned' : t.status,
  })
  if (to && t.isMain) await setMain(taskId, true)
}

/** Ghi lại thứ tự mới cho một nhóm task (cùng ngày hoặc cùng ô). */
export async function reorderTasks(idsInOrder: string[]) {
  for (let i = 0; i < idsInOrder.length; i++) await patch('tasks', idsInOrder[i], { order: i })
}

export async function setQuadrant(taskId: string, quadrant: Quadrant | undefined) {
  await patch('tasks', taskId, { quadrant })
}

export async function setDod(taskId: string, dod: DodItem[]) {
  await patch('tasks', taskId, { dod })
}

export async function completeTask(taskId: string) {
  const t = await db.tasks.get(taskId)
  if (!t) return
  await patch('tasks', taskId, { status: 'done', doneAt: now().getTime(), dod: t.dod.map((d) => ({ ...d, done: true })) })
}

export async function uncompleteTask(taskId: string) {
  await patch('tasks', taskId, { status: 'planned', doneAt: undefined })
}

/** Huỷ/dời việc chính với lý do. 'new-info' → bỏ hẳn; 'urgent' → dời sang mai. */
export async function deferTask(taskId: string, fromDate: ISODate, reason: DeferralReason, note?: string) {
  const t = await db.tasks.get(taskId)
  if (!t) return
  const deferrals = [...t.deferrals, { at: now().getTime(), fromDate, reason, note }]
  if (reason === 'new-info') {
    await patch('tasks', taskId, { status: 'dropped', deferrals })
  } else if (reason === 'urgent') {
    await patch('tasks', taskId, { deferrals })
    await scheduleTask(taskId, addDays(fromDate, 1))
  } else {
    await patch('tasks', taskId, { deferrals })
  }
}

export async function rescheduleTask(taskId: string, to: ISODate, nextAction: string) {
  await patch('tasks', taskId, { nextAction: nextAction.trim() })
  await scheduleTask(taskId, to)
}

export async function dropTask(taskId: string, note?: string, fromDate?: ISODate) {
  const t = await db.tasks.get(taskId)
  if (!t) return
  await patch('tasks', taskId, {
    status: 'dropped',
    deferrals: [...t.deferrals, { at: now().getTime(), fromDate: fromDate ?? t.scheduledFor ?? toISODate(now()), reason: 'new-info', note }],
  })
}

export async function deleteTask(taskId: string) {
  await softDelete('tasks', taskId)
}

/** Cuối ngày: mọi task chưa xong của ngày → mai / backlog. */
export async function carryOver(date: ISODate, to: ISODate | undefined) {
  const open = (await tasksFor(date)).filter(isOpen)
  for (const t of open) await scheduleTask(t.id, to)
  return open.length
}

// ---- Sessions ----------------------------------------------------------------

export async function activeSession() {
  const open = await db.sessions.filter((s) => s.endedAt === undefined).toArray()
  return open.sort((a, b) => b.startedAt - a.startedAt)[0]
}

/** Đóng một phiên đang mở: nếu đang tạm dừng thì kết thúc tại lúc tạm dừng (thời gian ẩn không tính). */
async function closeOpenSession(s: Session, nowMs: number) {
  await patch('sessions', s.id, { endedAt: s.pausedAt ?? nowMs, pausedAt: undefined })
}

export async function startSession(taskId: string, date: ISODate, plannedMin: number, nowMs = now().getTime()) {
  const open = await activeSession()
  if (open) await closeOpenSession(open, nowMs)
  const id = uid()
  await put('sessions', { id, taskId, date, startedAt: nowMs, plannedMin, kind: 'focus', pausedMs: 0 })
  await patch('tasks', taskId, { status: 'active' })
  return id
}

/** Nghỉ ngắn: kết thúc phiên đang chạy, mở phiên break. Không tính vào phút tập trung. */
export async function startBreak(date: ISODate, plannedMin: number, nowMs = now().getTime()) {
  const open = await activeSession()
  if (open) await closeOpenSession(open, nowMs)
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
  const s = await db.sessions.get(sessionId)
  if (!s || s.endedAt !== undefined) return
  await closeOpenSession(s, nowMs)
}

/** Tạm dừng (chỉ phiên focus đang chạy). */
export async function pauseSession(sessionId: string, atMs = now().getTime()) {
  const s = await db.sessions.get(sessionId)
  if (!s || !isRunning(s) || !isFocus(s)) return
  await patch('sessions', sessionId, { pausedAt: Math.max(s.startedAt, atMs) })
}

/** Tiếp tục: cộng khoảng dừng vào pausedMs. `from` cho phép trừ khoảng ẩn khi phiên chưa kịp ghi pausedAt. */
export async function resumeSession(sessionId: string, nowMs = now().getTime(), from?: number) {
  const s = await db.sessions.get(sessionId)
  if (!s || s.endedAt !== undefined) return
  const start = s.pausedAt ?? from
  if (start === undefined) return
  await patch('sessions', sessionId, { pausedAt: undefined, pausedMs: (s.pausedMs ?? 0) + Math.max(0, nowMs - start) })
}

/** Áp kết quả decideReconcile lên phiên. */
export async function reconcileSession(sessionId: string, r: Reconcile, nowMs = now().getTime()) {
  if (r.kind === 'resume') await resumeSession(sessionId, nowMs, r.from)
  else if (r.kind === 'pause') await pauseSession(sessionId, r.at)
}

/**
 * Phiên từ ngày khác còn mở: đang tạm dừng → kết thúc tại lúc dừng;
 * đang chạy (quên tắt) → kết thúc tại startedAt + pausedMs + plannedMin.
 */
export async function closeStaleSessions(today: ISODate) {
  const open = await db.sessions.filter((s) => s.endedAt === undefined && s.date !== today).toArray()
  for (const s of open) {
    await patch('sessions', s.id, {
      endedAt: s.pausedAt ?? s.startedAt + (s.pausedMs ?? 0) + s.plannedMin * 60_000,
      pausedAt: undefined,
    })
  }
}

// ---- Parking lot (inbox ghi nhanh) ------------------------------------------

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

/** Biến một ý trong Parking Lot thành task (backlog hoặc một ngày). */
export async function promoteToTask(parkingId: string, opts: { area: Area; quadrant?: Quadrant; scheduledFor?: ISODate }) {
  const p = await db.parking.get(parkingId)
  if (!p) return
  const t = await createTask({ title: p.text, area: opts.area, quadrant: opts.quadrant, scheduledFor: opts.scheduledFor })
  await patch('parking', parkingId, { resolution: 'later', resolvedAt: now().getTime(), promotedTaskId: t.id })
  return t
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
  const at = args.now ?? now()
  const open = await activeSession()
  if (open) await closeOpenSession(open, at.getTime())
  await getOrCreateDayLog(args.today)
  await patch('dayLogs', args.today, {
    shutdownAt: toHM(at),
    locked: true,
    mainTaskOutcome: args.outcome,
    worry: args.worry && (args.worry.concern || args.worry.nextStep) ? args.worry : undefined,
  })
}

// ---- Goals (tuần / quý / năm) ------------------------------------------------

/** Quá số này thì nhắc nhẹ, không chặn. */
export const SOFT_MAX_WEEK_GOALS = 3

export async function addGoal(input: { horizon: Horizon; periodKey: string; title: string; area: Area; parentId?: string }): Promise<Goal> {
  const g: Goal = {
    id: uid(),
    horizon: input.horizon,
    periodKey: input.periodKey,
    title: input.title.trim(),
    area: input.area,
    parentId: input.parentId || undefined,
    status: 'open',
    checkins: [],
    createdAt: now().getTime(),
  }
  await put('goals', g)
  return g
}

export async function updateGoal(id: string, changes: Partial<Pick<Goal, 'title' | 'area' | 'parentId'>>) {
  await patch('goals', id, changes)
}

export async function setGoalStatus(id: string, status: Goal['status']) {
  await patch('goals', id, { status })
}

/** Follow-up: ghi một check-in vào goal. */
export async function checkinGoal(id: string, state: CheckinState, note?: string) {
  const g = await db.goals.get(id)
  if (!g) return
  await patch('goals', id, { checkins: [...(g.checkins ?? []), { at: now().getTime(), state, note: note?.trim() || undefined }] })
}

export async function goalsFor(periodKey: string): Promise<Goal[]> {
  const list = await db.goals.where('periodKey').equals(periodKey).toArray()
  return list.filter((g) => !g.deleted).sort((a, b) => a.createdAt - b.createdAt)
}

export async function wipeAll() {
  await Promise.all([
    db.goals.clear(), db.tasks.clear(), db.sessions.clear(), db.parking.clear(), db.dayLogs.clear(), db.settings.clear(), db.outbox.clear(),
  ])
}

export const todayISO = (d: Date) => toISODate(d)
