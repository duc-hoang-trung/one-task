import type { HM, ISODate } from './dates'

export type GoalStatus = 'open' | 'done' | 'dropped'
export interface WeekGoal {
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
export interface Task {
  id: string
  goalId?: string
  title: string
  dod: DodItem[]
  consequence: string
  estimateMin: number
  nextAction: string
  scheduledFor: ISODate
  status: TaskStatus
  deferrals: Deferral[]
  createdAt: number
  doneAt?: number
}

export interface Session {
  id: string
  taskId: string
  date: ISODate
  startedAt: number
  endedAt?: number
  /** Số phút dự định cho lượt này (10, 15, 25…) */
  plannedMin: number
}

export type ParkingResolution = 'drop' | 'later' | 'tomorrow'
export interface ParkingItem {
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

export interface DayLog {
  date: ISODate
  morningDoneAt?: HM
  shutdownAt?: HM
  locked: boolean
  worry?: { concern: string; nextStep: string }
  bedtimeActual?: HM
  mainTaskOutcome?: 'done' | 'progress' | 'none'
}

export interface Settings {
  id: 'default'
  shutdownTime: HM
  bedtimeTarget: HM
  morningTime: HM
  minFocusMin: number
  extendMin: number
  onboarded: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'default',
  shutdownTime: '21:00',
  bedtimeTarget: '23:00',
  morningTime: '07:30',
  minFocusMin: 10,
  extendMin: 15,
  onboarded: false,
}
