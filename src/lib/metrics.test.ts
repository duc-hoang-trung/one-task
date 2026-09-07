import { describe, expect, it } from 'vitest'
import { computeWeekMetrics } from './metrics'
import type { DayLog, Session, Task } from './types'

const settings = { minFocusMin: 10, shutdownTime: '21:00', bedtimeTarget: '23:00' }
const ms = (date: string, h: number, m = 0) => {
  const [y, mo, d] = date.split('-').map(Number)
  return new Date(y, mo - 1, d, h, m).getTime()
}
const sess = (date: string, minutes: number): Session => ({
  id: date + minutes,
  taskId: 't',
  date,
  startedAt: ms(date, 9),
  endedAt: ms(date, 9) + minutes * 60_000,
  plannedMin: 10,
})
const log = (date: string, p: Partial<DayLog>): DayLog => ({ date, locked: false, ...p })

describe('computeWeekMetrics', () => {
  it('đếm ngày focus, đóng ngày đúng giờ, giờ ngủ, quay lại, dời việc', () => {
    // Tuần 07/09 (Mon) → 13/09. Hôm nay là 12/09 (Sat) → 6 ngày tính.
    const sessions = [
      sess('2026-09-04', 20), // tuần trước, để "returns" có nền
      sess('2026-09-07', 12), // Mon focus (sau 05,06 trống → return)
      sess('2026-09-08', 5),  // Tue quá ngắn → không tính
      sess('2026-09-10', 30), // Thu focus, sau Wed trống → return
      sess('2026-09-11', 10), // Fri focus, liền Thu → không phải return
    ]
    const dayLogs = [
      log('2026-09-07', { shutdownAt: '21:10', bedtimeActual: '23:30' }),
      log('2026-09-08', { shutdownAt: '22:00', bedtimeActual: '00:30' }),
      log('2026-09-10', { shutdownAt: '20:50', bedtimeActual: '22:30' }),
    ]
    const tasks: Task[] = [
      {
        id: 't', title: 'Làm 20 câu S3', dod: [], consequence: '', estimateMin: 30, nextAction: '',
        scheduledFor: '2026-09-10', status: 'done', createdAt: 0,
        deferrals: [
          { at: 0, fromDate: '2026-09-08', reason: 'dont-want' },
          { at: 0, fromDate: '2026-09-09', reason: 'urgent' },
          { at: 0, fromDate: '2026-09-01', reason: 'urgent' }, // tuần trước, bỏ
        ],
      },
    ]
    const m = computeWeekMetrics({
      weekStart: '2026-09-07', today: '2026-09-12', sessions, dayLogs, tasks, settings,
    })
    expect(m.daysCounted).toBe(6)
    expect(m.daysWithFocus).toBe(3)
    expect(m.daysClosed).toBe(3)
    expect(m.shutdownOnTime).toBe(2)
    expect(m.bedtimeDeltaMin).toBe(Math.round((30 + 90 - 30) / 3))
    expect(m.returns).toBe(2)
    expect(m.deferrals).toEqual({ 'new-info': 0, urgent: 1, 'dont-want': 1 })
    expect(m.tasksDone).toBe(1)
  })

  it('tuần trống → null bedtime, 0 hết', () => {
    const m = computeWeekMetrics({
      weekStart: '2026-09-07', today: '2026-09-07', sessions: [], dayLogs: [], tasks: [], settings,
    })
    expect(m.bedtimeDeltaMin).toBeNull()
    expect(m.daysWithFocus).toBe(0)
    expect(m.returns).toBe(0)
  })

  it('session đang chạy (chưa endedAt) tính tới nowMs', () => {
    const s: Session = { id: 'x', taskId: 't', date: '2026-09-07', startedAt: ms('2026-09-07', 9), plannedMin: 10 }
    const m = computeWeekMetrics({
      weekStart: '2026-09-07', today: '2026-09-07', sessions: [s], dayLogs: [], tasks: [], settings,
      nowMs: ms('2026-09-07', 9, 12),
    })
    expect(m.daysWithFocus).toBe(1)
  })
})
