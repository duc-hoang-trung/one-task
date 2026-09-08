import { describe, expect, it } from 'vitest'
import { en } from './en'
import { vi } from './vi'
import { fmtDate, translate } from './index'

describe('i18n', () => {
  it('en có đủ mọi key của vi', () => {
    const missing = (Object.keys(vi) as (keyof typeof vi)[]).filter((k) => !(k in en) || !en[k])
    expect(missing).toEqual([])
  })
  it('thay biến', () => {
    expect(translate('vi', 'morn.start', { n: 10 })).toBe('Bắt đầu 10 phút')
    expect(translate('en', 'morn.start', { n: 10 })).toBe('Start 10 minutes')
  })
  it('định dạng ngày theo ngôn ngữ', () => {
    expect(fmtDate('vi', '2026-09-08')).toBe('Thứ 3 · 08/09')
    expect(fmtDate('en', '2026-09-08')).toBe('Tue · 8 Sep')
  })
})
