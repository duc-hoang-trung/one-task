import type { HM, ISODate } from './dates'

/** Mọi bản ghi đồng bộ được đều mang updatedAt (ms) và có thể bị soft-delete. */
export interface Synced {
  updatedAt?: number
  deleted?: boolean
}

export type Area = 'work' | 'personal'
/** Eisenhower: q1 khẩn+quan trọng · q2 quan trọng · q3 khẩn · q4 còn lại */
export type Quadrant = 'q1' | 'q2' | 'q3' | 'q4'
export const QUADRANTS: Quadrant[] = ['q1', 'q2', 'q3', 'q4']

export type GoalStatus = 'open' | 'done' | 'dropped'
export type Horizon = 'week' | 'quarter' | 'year'
export type CheckinState = 'on-track' | 'behind' | 'blocked'
export interface Checkin {
  at: number
  state: CheckinState
  note?: string
}
export interface Goal extends Synced {
  id: string
  horizon: Horizon
  /** '2026-W37' | '2026-Q3' | '2026' (xem lib/period.ts) */
  periodKey: string
  title: string
  area: Area
  parentId?: string
  status: GoalStatus
  checkins: Checkin[]
  createdAt: number
}
/** @deprecated tên cũ, giữ để đọc code cũ */
export type WeekGoal = Goal

export type TaskStatus = 'planned' | 'active' | 'done' | 'dropped'
export type DeferralReason = 'new-info' | 'urgent' | 'dont-want'
export interface Deferral {
  at: number
  fromDate: ISODate
  reason: DeferralReason
  note?: string
}
export interface DodItem {
  text: string
  done: boolean
}
export interface Task extends Synced {
  id: string
  goalId?: string
  title: string
  area: Area
  quadrant?: Quadrant
  /** Việc quan trọng nhất của ngày (MIT). Tối đa 1 mỗi ngày, enforce trong actions.setMain. */
  isMain?: boolean
  /** Thứ tự trong ngày / trong ô ma trận. */
  order: number
  dod: DodItem[]
  consequence: string
  estimateMin?: number
  nextAction: string
  /** undefined = Backlog (chưa lên lịch) */
  scheduledFor?: ISODate
  /** Giờ dự định bắt đầu, để nhắc. */
  startAt?: HM
  status: TaskStatus
  deferrals: Deferral[]
  createdAt: number
  doneAt?: number
}

export type SessionKind = 'focus' | 'break'
export interface Session extends Synced {
  id: string
  /** với break: '' */
  taskId: string
  date: ISODate
  startedAt: number
  endedAt?: number
  /** Số phút dự định cho lượt này (10, 15, 25…) */
  plannedMin: number
  /** undefined = focus (bản ghi cũ) */
  kind?: SessionKind
  /** Đang tạm dừng từ lúc này (ms). undefined = đang chạy hoặc đã kết thúc. */
  pausedAt?: number
  /** Tổng ms đã tạm dừng, không tính vào phút tập trung. */
  pausedMs?: number
}

export type ParkingResolution = 'drop' | 'later' | 'tomorrow'
export interface ParkingItem extends Synced {
  id: string
  text: string
  createdAt: number
  createdOn: ISODate
  resolvedAt?: number
  resolution?: ParkingResolution
  /** với resolution 'tomorrow': ngày sẽ hiện lên làm việc nhỏ */
  forDate?: ISODate
  doneAt?: number
  /** đã biến thành task */
  promotedTaskId?: string
}

export interface DayLog extends Synced {
  date: ISODate
  morningDoneAt?: HM
  shutdownAt?: HM
  locked: boolean
  worry?: { concern: string; nextStep: string }
  bedtimeActual?: HM
  mainTaskOutcome?: 'done' | 'progress' | 'none'
}

export type LangSetting = 'auto' | 'vi' | 'en'
export interface Settings extends Synced {
  id: 'default'
  shutdownTime: HM
  bedtimeTarget: HM
  morningTime: HM
  minFocusMin: number
  extendMin: number
  onboarded: boolean
  lang: LangSetting
  /** Sau bao nhiêu phút tập trung liền thì gợi ý nghỉ */
  pomodoroMin: number
  breakMin: number
  defaultArea: Area
  notifications: { sound: boolean; vibrate: boolean; system: boolean }
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'default',
  shutdownTime: '21:00',
  bedtimeTarget: '23:00',
  morningTime: '07:30',
  minFocusMin: 10,
  extendMin: 15,
  onboarded: false,
  lang: 'auto',
  pomodoroMin: 25,
  breakMin: 5,
  defaultArea: 'work',
  notifications: { sound: true, vibrate: true, system: true },
}
