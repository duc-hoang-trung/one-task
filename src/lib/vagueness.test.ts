import { describe, expect, it } from 'vitest'
import { checkEstimate, checkTitle } from './vagueness'

describe('checkTitle', () => {
  const rejects = [
    'Học AWS',
    'Nghiên cứu về Kubernetes',
    'Tìm hiểu React 19',
    'Xem lại bài giảng',
    'Learn Rust',
    'Work on the report',
    'Cải thiện CV',
    'Chuẩn bị phỏng vấn',
    'Viết bài blog',          // không số, không động từ kết thúc
    'AWS',                    // quá ngắn
    'Xem React 19',           // số phiên bản không phải số đếm
  ]
  const accepts = [
    'Làm 20 câu S3',
    'Đọc 10 trang chương 3',
    'Học 15 từ mới bài 4',    // động từ mơ hồ nhưng có số đếm → ok
    'Viết 300 chữ phần mở bài',
    'Gửi email cho anh A về hợp đồng',
    'Nộp báo cáo tuần',
    'Deploy bản v1.2 lên staging',
    'Fix bug login trên Safari',
    'Gọi điện đặt lịch nha sĩ',
    'Submit the expense form',
  ]
  it.each(rejects)('từ chối: %s', (t) => {
    expect(checkTitle(t).ok).toBe(false)
  })
  it.each(accepts)('chấp nhận: %s', (t) => {
    expect(checkTitle(t)).toEqual({ ok: true })
  })
  it('giải thích lý do khi từ chối', () => {
    const r = checkTitle('Học AWS')
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.reason).toContain('học')
      expect(r.hint).toContain('20 câu')
    }
  })
})

describe('checkEstimate', () => {
  it('chấp nhận ≤ 90', () => {
    expect(checkEstimate(10).ok).toBe(true)
    expect(checkEstimate(90).ok).toBe(true)
  })
  it('từ chối > 90 và không hợp lệ', () => {
    expect(checkEstimate(91).ok).toBe(false)
    expect(checkEstimate(0).ok).toBe(false)
    expect(checkEstimate(NaN).ok).toBe(false)
  })
})
