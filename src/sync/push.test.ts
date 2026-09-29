import { describe, expect, it } from 'vitest'
import { urlBase64ToUint8Array } from './push'

describe('urlBase64ToUint8Array', () => {
  it('giải base64url (thiếu padding, có - và _) ra đúng byte', () => {
    // 'Hello' = SGVsbG8= ; base64url bỏ '='
    expect([...urlBase64ToUint8Array('SGVsbG8')]).toEqual([72, 101, 108, 108, 111])
    // 0xFB 0xFF 0xBE → '-_--' trong base64url, '+/++' trong base64 thường
    expect([...urlBase64ToUint8Array('-_--')]).toEqual([251, 255, 190])
  })
  it('khoá VAPID thật dài 65 byte và bắt đầu bằng 0x04 (điểm EC chưa nén)', () => {
    const key = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
    const bytes = urlBase64ToUint8Array(key)
    expect(bytes.length).toBe(65)
    expect(bytes[0]).toBe(4)
  })
})
