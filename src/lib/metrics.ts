import { addDays, bedtimeDelta, weekDays, type ISODate } from './dates'
import { isShutdownOnTime } from './phase'
import type { DayLog, DeferralReason, Session, Settings, Task } from './types'

export interface WeekMetrics {
  weekStart: ISODate
  /** Số ngày trong tuần có ≥ minFocusMin phút làm việc chính */
  daysWithFocus: number
  /** Số ngày đóng ngày trong vòng 30' sau giờ Shutdown */
  shutdownOnTime: number
  /** Số ngày có ấn Đóng ngày (bất kể giờ) */
  daysClosed: number
  /** Trung bình phút ngủ muộn hơn mục tiêu (âm = sớm hơn). null nếu không có dữ liệu */
  bedtimeDeltaMin: number | null
  /** Số lần quay lại: ngày có focus ngay sau ≥1 ngày trống (và trước đó đã từng có focus) */
  returns: number
  deferrals: Record<DeferralReason, number>
  tasksDone: number
  /** Chỉ tính các ngày ≤ hôm nay */
  daysCounted: number
}

/**
 * Phút tập trung liên tục kể từ lần nghỉ cuối (hoặc từ đầu ngày). Dùng để gợi ý nghỉ.
 * "Liên tục" hiểu theo phiên: mọi phiên focus sau phiên break cuối cùng.
 */
export function focusStreakMin(sessionsToday: Session[], nowMs: number): number {
  const sorted = [...sessionsToday].sort((a, b) => a.startedAt - b.startedAt)
  let streak = 0
  for (const s of sorted) {
    if (s.kind === 'break') {
      streak = 0
      continue
    }
    streak += sessionMinutes(s, nowMs)
  }
  return streak
}

/** Phiên quên tắt không được tính vô hạn: trần = plannedMin + FORGOT_GRACE_MIN. */
export const FORGOT_GRACE_MIN = 30
export function sessionMinutes(s: Session, nowMs: number): number {
  const raw = Math.max(0, Math.round(((s.endedAt ?? nowMs) - s.startedAt) / 60_000))
  return Math.min(raw, s.plannedMin + FORGOT_GRACE_MIN)
}

export function focusMinutesByDate(sessions: Session[], nowMs: number): Map<ISODate, number> {
  const m = new Map<ISODate, number>()
  for (const s of sessions) {
    if (s.kind === 'break') continue
    m.set(s.date, (m.get(s.date) ?? 0) + sessionMinutes(s, nowMs))
  }
  return m
}

export function computeWeekMetrics(args: {
  weekStart: ISODate
  today: ISODate
  sessions: Session[] // toàn bộ lịch sử (để tính returns)
  dayLogs: DayLog[]
  tasks: Task[]
  settings: Pick<Settings, 'minFocusMin' | 'shutdownTime' | 'bedtimeTarget'>
  nowMs?: number
}): WeekMetrics {
  const { weekStart: ws, today, sessions, dayLogs, tasks, settings } = args
  const nowMs = args.nowMs ?? Date.now()
  const days = weekDays(ws).filter((d) => d <= today)
  const focus = focusMinutesByDate(sessions, nowMs)
  const hasFocus = (d: ISODate) => (focus.get(d) ?? 0) >= settings.minFocusMin

  let daysWithFocus = 0
  let shutdownOnTime = 0
  let daysClosed = 0
  let returns = 0
  const deltas: number[] = []

  const anyFocusBefore = (d: ISODate) => {
    for (const [date, min] of focus) if (date < d && min >= settings.minFocusMin) return true
    return false
  }

  for (const d of days) {
    if (hasFocus(d)) {
      daysWithFocus++
      if (!hasFocus(addDays(d, -1)) && anyFocusBefore(d)) returns++
    }
    const log = dayLogs.find((l) => l.date === d)
    if (log?.shutdownAt) {
      daysClosed++
      if (isShutdownOnTime(log.shutdownAt, settings.shutdownTime)) shutdownOnTime++
    }
    if (log?.bedtimeActual) deltas.push(bedtimeDelta(settings.bedtimeTarget, log.bedtimeActual))
  }

  const deferrals: Record<DeferralReason, number> = { 'new-info': 0, urgent: 0, 'dont-want': 0 }
  let tasksDone = 0
  const weekEnd = addDays(ws, 6)
  for (const t of tasks) {
    for (const df of t.deferrals) {
      if (df.fromDate >= ws && df.fromDate <= weekEnd) deferrals[df.reason]++
    }
    if (t.status === 'done' && t.scheduledFor && t.scheduledFor >= ws && t.scheduledFor <= weekEnd) tasksDone++
  }

  return {
    weekStart: ws,
    daysWithFocus,
    shutdownOnTime,
    daysClosed,
    bedtimeDeltaMin: deltas.length ? Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length) : null,
    returns,
    deferrals,
    tasksDone,
    daysCounted: days.length,
  }
}
