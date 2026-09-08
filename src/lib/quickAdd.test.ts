import { describe, expect, it } from 'vitest'
import { parseQuickAdd } from './quickAdd'

describe('parseQuickAdd', () => {
  it('chỉ title', () => {
    expect(parseQuickAdd('  Gửi báo cáo tuần ')).toEqual({ title: 'Gửi báo cáo tuần' })
  })
  it('đủ token, thứ tự bất kỳ', () => {
    expect(parseQuickAdd('#w Gửi báo cáo !1 tuần ~30m')).toEqual({ title: 'Gửi báo cáo tuần', area: 'work', quadrant: 'q1', estimateMin: 30 })
    expect(parseQuickAdd('Đọc 10 trang #cn !2 ~45')).toEqual({ title: 'Đọc 10 trang', area: 'personal', quadrant: 'q2', estimateMin: 45 })
  })
  it('không nhầm số bình thường với token', () => {
    expect(parseQuickAdd('Làm 20 câu S3 #hashtag')).toEqual({ title: 'Làm 20 câu S3 #hashtag' })
    expect(parseQuickAdd('!5 không hợp lệ')).toEqual({ title: '!5 không hợp lệ' })
  })
})
