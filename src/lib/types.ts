import type { HM, ISODate } from './dates'

/** Mọi bản ghi đồng bộ được đều mang updatedAt (ms) và có thể bị soft-delete. */
export interface Synced {
  updatedAt?: number
  deleted?: boolean
}

export type GoalStatus = 'open' | 'done' | 'dropped'
export interface WeekGoal extends Synced {
  id: string
  weekStart: ISODate
  title: string
  status: GoalStatus
  createdAt: number
}

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
  dod: DodItem[]
  consequence: string
  estimateMin?: number
  nextAction: string
  scheduledFor: ISODate
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
}
