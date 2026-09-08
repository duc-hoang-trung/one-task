import { describe, expect, it } from 'vitest'
import { computePhase, isWithinAfter, isShutdownDue, isShutdownOnTime } from './phase'

describe('computePhase', () => {
  it('chưa có log → morning', () => {
    expect(computePhase({ todayLog: null })).toBe('morning')
  })
  it('đã mở ngày → day', () => {
    expect(computePhase({ todayLog: { morningDoneAt: '07:31' } })).toBe('day')
  })
  it('đã đóng ngày → night, bất kể morning', () => {
    expect(computePhase({ todayLog: { locked: true } })).toBe('night')
    expect(computePhase({ todayLog: { locked: true, morningDoneAt: '07:31' } })).toBe('night')
  })
})

describe('isShutdownDue', () => {
  const at = (h: number, m: number) => new Date(2026, 8, 7, h, m)
  it('trước giờ → false, đúng/sau giờ → true', () => {
    expect(isShutdownDue(at(20, 59), '21:00')).toBe(false)
    expect(isShutdownDue(at(21, 0), '21:00')).toBe(true)
    expect(isShutdownDue(at(23, 30), '21:00')).toBe(true)
  })
})

describe('isShutdownOnTime', () => {
  it('trong 30 phút sau giờ là đúng giờ', () => {
    expect(isShutdownOnTime('20:40', '21:00')).toBe(true)
    expect(isShutdownOnTime('21:30', '21:00')).toBe(true)
    expect(isShutdownOnTime('21:31', '21:00')).toBe(false)
  })
})

describe('isWithinAfter', () => {
  const d = (h: number, m: number) => new Date(2026, 8, 8, h, m)
  it('trong [t, t+5) → true', () => {
    expect(isWithinAfter(d(21, 0), '21:00')).toBe(true)
    expect(isWithinAfter(d(21, 4), '21:00')).toBe(true)
  })
  it('ngoài cửa sổ → false', () => {
    expect(isWithinAfter(d(21, 5), '21:00')).toBe(false)
    expect(isWithinAfter(d(20, 59), '21:00')).toBe(false)
    expect(isWithinAfter(d(22, 30), '21:00')).toBe(false)
  })
})
