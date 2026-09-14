import { describe, expect, it } from 'vitest'
import { classifyAuthError } from './index'

describe('classifyAuthError', () => {
  it('60 giây giữa hai lần xin link → cooldown, lấy được số giây', () => {
    const r = classifyAuthError('For security purposes, you can only request this after 47 seconds.')
    expect(r).toEqual({ code: 'cooldown', retryAfterSec: 47 })
  })
  it('hết hạn mức mail của project → rate-limit', () => {
    expect(classifyAuthError('email rate limit exceeded', 429).code).toBe('rate-limit')
    expect(classifyAuthError('Request failed', 429).code).toBe('rate-limit')
    expect(classifyAuthError('Too Many Requests').code).toBe('rate-limit')
  })
  it('lỗi khác giữ nguyên để hiện nguyên văn', () => {
    expect(classifyAuthError('Failed to fetch').code).toBe('other')
  })
})
