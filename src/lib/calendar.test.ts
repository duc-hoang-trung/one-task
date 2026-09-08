import { describe, expect, it } from 'vitest'
import { monthDays, monthGrid, monthRange, relation, shiftMonth } from './calendar'

describe('monthGrid', () => {
  it('tháng 9/2026 bắt đầu thứ Ba → 1 ô trống đầu, 5 tuần', () => {
    const g = monthGrid(2026, 9)
    expect(g[0][0]).toBeNull()
    expect(g[0][1]).toBe('2026-09-01')
    expect(g.length).toBe(5)
    expect(g.at(-1)!.filter(Boolean).at(-1)).toBe('2026-09-30')
    expect(g.every((w) => w.length === 7)).toBe(true)
  })
  it('tháng 2/2027 bắt đầu thứ Hai, 28 ngày → đúng 4 tuần', () => {
    const g = monthGrid(2027, 2)
    expect(g[0][0]).toBe('2027-02-01')
    expect(g.length).toBe(4)
  })
})

describe('shiftMonth / monthRange / relation', () => {
  it('qua năm', () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 })
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 })
  })
  it('range', () => {
    expect(monthRange(2026, 9)).toEqual({ from: '2026-09-01', to: '2026-09-30' })
  })
  it('quan hệ với hôm nay', () => {
    expect(relation('2026-09-07', '2026-09-08')).toBe('past')
    expect(relation('2026-09-08', '2026-09-08')).toBe('today')
    expect(relation('2026-12-23', '2026-09-08')).toBe('future')
    expect(monthDays(2026, 9)).toHaveLength(30)
    expect(monthDays(2026, 2)[0]).toBe('2026-02-01')
  })
})
