import { minutesOfDay, parseHM, type HM } from './dates'

export type Phase = 'morning' | 'day' | 'night'

export interface PhaseInput {
  /** DayLog của ngày logic hôm nay (nếu có) */
  todayLog?: { locked?: boolean; morningDoneAt?: string } | null
}

/**
 * Trạng thái màn hình theo ngày:
 *  - night   : đã ấn "Đóng ngày" → khoá cho tới 04:00 hôm sau (ngày logic đổi)
 *  - morning : chưa "mở ngày" (chưa bấm Bắt đầu / Huỷ ở màn hình sáng)
 *  - day     : đang trong ngày làm việc
 */
export function computePhase({ todayLog }: PhaseInput): Phase {
  if (todayLog?.locked) return 'night'
  if (!todayLog?.morningDoneAt) return 'morning'
  return 'day'
}

/** Đã tới giờ Shutdown chưa (so trong ngày). */
export function isShutdownDue(now: Date, shutdownTime: HM): boolean {
  return minutesOfDay(now) >= parseHM(shutdownTime)
}

/** Đóng ngày "đúng giờ" = trong vòng graceMin phút sau giờ Shutdown. */
export function isShutdownOnTime(shutdownAt: HM, shutdownTime: HM, graceMin = 30): boolean {
  const delta = parseHM(shutdownAt) - parseHM(shutdownTime)
  return delta <= graceMin
}
