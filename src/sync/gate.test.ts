import { describe, expect, it } from 'vitest'
import { gateFor } from './index'

describe('gateFor', () => {
  it('đang khôi phục session → loading', () => expect(gateFor('loading')).toBe('loading'))
  it('chưa đăng nhập → login', () => expect(gateFor('signed-out')).toBe('login'))
  it('không cấu hình Supabase → vào app (chạy local)', () => expect(gateFor('off')).toBe('app'))
  it('đã đăng nhập, mọi trạng thái đồng bộ → app', () => {
    for (const s of ['idle', 'syncing', 'offline', 'error'] as const) expect(gateFor(s)).toBe('app')
  })
})
