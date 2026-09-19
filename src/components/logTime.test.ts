import { describe, expect, it } from 'vitest'
import { defaultLogMin } from './LogTimeModal'

describe('defaultLogMin', () => {
  it('ưu tiên phút đã đo → ước lượng → 30', () => {
    expect(defaultLogMin({ estimateMin: 45 }, 17)).toBe(17)
    expect(defaultLogMin({ estimateMin: 45 }, 0)).toBe(45)
    expect(defaultLogMin({}, 0)).toBe(30)
  })
})
