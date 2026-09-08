import { describe, expect, it } from 'vitest'
import { AUTO_RESUME_MS, decideReconcile, elapsedMs, isPaused, isRunning } from './session'
import type { Session } from './types'

const M = 60_000
const base: Session = { id: 's1', taskId: 't', date: '2026-09-08', startedAt: 0, plannedMin: 25, kind: 'focus' }

describe('elapsedMs', () => {
  it('đang chạy: now - startedAt', () => expect(elapsedMs(base, 5 * M)).toBe(5 * M))
  it('đang pause: dừng tại pausedAt, bất kể now', () => {
    const s = { ...base, pausedAt: 3 * M }
    expect(elapsedMs(s, 50 * M)).toBe(3 * M)
    expect(isPaused(s)).toBe(true)
    expect(isRunning(s)).toBe(false)
  })
  it('trừ pausedMs cộng dồn', () => expect(elapsedMs({ ...base, pausedMs: 2 * M }, 10 * M)).toBe(8 * M))
  it('đã kết thúc: endedAt - startedAt - pausedMs', () => expect(elapsedMs({ ...base, endedAt: 20 * M, pausedMs: 4 * M }, 99 * M)).toBe(16 * M))
  it('không âm', () => expect(elapsedMs({ ...base, startedAt: 10 * M }, 5 * M)).toBe(0))
})

describe('decideReconcile', () => {
  it('break → none', () => expect(decideReconcile({ session: { ...base, kind: 'break' }, hiddenAt: M, nowMs: 60 * M })).toEqual({ kind: 'none' }))
  it('đã kết thúc → none', () => expect(decideReconcile({ session: { ...base, endedAt: 5 * M }, hiddenAt: M, nowMs: 60 * M })).toEqual({ kind: 'none' }))
  it('không có dấu vết → none', () => expect(decideReconcile({ session: base, nowMs: 60 * M })).toEqual({ kind: 'none' }))
  it('ẩn 30s → resume từ hiddenAt (trừ khoảng ẩn)', () => {
    expect(decideReconcile({ session: base, hiddenAt: 5 * M, nowMs: 5 * M + 30_000 })).toEqual({ kind: 'resume', from: 5 * M })
  })
  it('ẩn 3 giờ → pause tại hiddenAt', () => {
    expect(decideReconcile({ session: base, hiddenAt: 5 * M, nowMs: 185 * M })).toEqual({ kind: 'pause', at: 5 * M })
  })
  it('chỉ có heartbeat (crash) → dùng seenAt', () => {
    expect(decideReconcile({ session: base, seenAt: 7 * M, nowMs: 60 * M })).toEqual({ kind: 'pause', at: 7 * M })
  })
  it('đã pause 1 phút → resume', () => {
    expect(decideReconcile({ session: { ...base, pausedAt: 10 * M }, nowMs: 11 * M })).toEqual({ kind: 'resume', from: 10 * M })
  })
  it('đã pause 10 phút → none (giữ pause, chờ bấm)', () => {
    expect(decideReconcile({ session: { ...base, pausedAt: 10 * M }, nowMs: 20 * M })).toEqual({ kind: 'none' })
  })
  it('đa tab: seenAt mới hơn hiddenAt, gap ≈ 0 → none', () => {
    expect(decideReconcile({ session: base, hiddenAt: 5 * M, seenAt: 60 * M - 500, nowMs: 60 * M })).toEqual({ kind: 'none' })
  })
  it('dấu vết trước startedAt bị bỏ qua', () => {
    expect(decideReconcile({ session: { ...base, startedAt: 10 * M }, hiddenAt: 2 * M, nowMs: 60 * M })).toEqual({ kind: 'none' })
  })
  it('ngưỡng đúng bằng AUTO_RESUME_MS → pause', () => {
    expect(decideReconcile({ session: base, hiddenAt: M, nowMs: M + AUTO_RESUME_MS })).toEqual({ kind: 'pause', at: M })
  })
})
