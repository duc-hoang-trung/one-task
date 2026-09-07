import { describe, expect, it } from 'vitest'
import { addDays, bedtimeDelta, logicalDate, toISODate, weekStart } from './dates'

describe('logicalDate', () => {
  it('00:30 vẫn là hôm qua; 04:00 là hôm nay', () => {
    expect(logicalDate(new Date(2026, 8, 8, 0, 30))).toBe('2026-09-07')
    expect(logicalDate(new Date(2026, 8, 8, 3, 59))).toBe('2026-09-07')
    expect(logicalDate(new Date(2026, 8, 8, 4, 0))).toBe('2026-09-08')
    expect(logicalDate(new Date(2026, 8, 8, 21, 0))).toBe('2026-09-08')
  })
})

describe('weekStart', () => {
  it('trả về thứ Hai', () => {
    expect(weekStart('2026-09-07')).toBe('2026-09-07') // Mon
    expect(weekStart('2026-09-13')).toBe('2026-09-07') // Sun
    expect(weekStart('2026-09-10')).toBe('2026-09-07') // Thu
  })
})

describe('bedtimeDelta', () => {
  it('xử lý qua nửa đêm', () => {
    expect(bedtimeDelta('23:00', '00:30')).toBe(90)
    expect(bedtimeDelta('23:00', '22:30')).toBe(-30)
    expect(bedtimeDelta('23:00', '23:00')).toBe(0)
  })
})

describe('addDays / toISODate', () => {
  it('cộng ngày qua tháng', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01')
    expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})
