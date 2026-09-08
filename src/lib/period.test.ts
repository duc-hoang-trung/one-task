import { describe, expect, it } from 'vitest'
import { horizonOf, parentKey, periodLabel, periodRange, quarterKey, shiftPeriod, weekKey, yearKey } from './period'

describe('period keys', () => {
  it('weekKey theo ISO 8601', () => {
    expect(weekKey('2026-09-08')).toBe('2026-W37')
    expect(weekKey('2026-09-13')).toBe('2026-W37') // CN cùng tuần
    expect(weekKey('2026-09-14')).toBe('2026-W38')
    expect(weekKey('2026-01-01')).toBe('2026-W01') // 1/1/2026 là thứ Năm
    expect(weekKey('2027-01-01')).toBe('2026-W53') // 1/1/2027 là thứ Sáu → thuộc tuần 53 của 2026
  })
  it('quarter / year', () => {
    expect(quarterKey('2026-09-08')).toBe('2026-Q3')
    expect(quarterKey('2026-12-31')).toBe('2026-Q4')
    expect(yearKey('2026-09-08')).toBe('2026')
  })
  it('horizonOf', () => {
    expect(horizonOf('2026-W37')).toBe('week')
    expect(horizonOf('2026-Q3')).toBe('quarter')
    expect(horizonOf('2026')).toBe('year')
  })
})

describe('periodRange / parentKey / shiftPeriod', () => {
  it('range tuần, quý, năm', () => {
    expect(periodRange('2026-W37')).toEqual({ from: '2026-09-07', to: '2026-09-13' })
    expect(periodRange('2026-Q3')).toEqual({ from: '2026-07-01', to: '2026-09-30' })
    expect(periodRange('2026')).toEqual({ from: '2026-01-01', to: '2026-12-31' })
    expect(periodRange('2026-W01')).toEqual({ from: '2025-12-29', to: '2026-01-04' })
  })
  it('cha của tuần là quý theo thứ Năm', () => {
    expect(parentKey('2026-W37')).toBe('2026-Q3')
    expect(parentKey('2026-W40')).toBe('2026-Q4') // 28/09–04/10, thứ Năm 01/10
    expect(parentKey('2026-Q3')).toBe('2026')
    expect(parentKey('2026')).toBeNull()
  })
  it('shift', () => {
    expect(shiftPeriod('2026-W37', 1)).toBe('2026-W38')
    expect(shiftPeriod('2026-W01', -1)).toBe('2025-W52')
    expect(shiftPeriod('2026-Q4', 1)).toBe('2027-Q1')
    expect(shiftPeriod('2026', -1)).toBe('2025')
  })
  it('label', () => {
    expect(periodLabel('2026-W37', 'vi')).toBe('Tuần 37 · 07/09–13/09')
    expect(periodLabel('2026-Q3', 'en')).toBe('Q3 2026')
  })
})
