import { fromISODate, parseHM, type HM, type ISODate } from './dates'

/**
 * Nguồn thời gian duy nhất của app. Cho phép ghi đè bằng URL để test/demo:
 *   ?d=2026-09-08&t=21:05   → coi như bây giờ là 21:05 ngày 08/09/2026
 * Ghi đè giữ nguyên trong tab (sessionStorage) cho tới khi mở ?reset-clock.
 */
let override: { base: number; realAt: number } | null = null

function readOverride() {
  if (typeof window === 'undefined') return
  const q = new URLSearchParams(window.location.search)
  if (q.has('reset-clock')) {
    sessionStorage.removeItem('clock-override')
    history.replaceState(null, '', window.location.pathname)
    return
  }
  const d = q.get('d') as ISODate | null
  const t = q.get('t') as HM | null
  if (d || t) {
    const base = d ? fromISODate(d) : new Date()
    const mins = t ? parseHM(t) : new Date().getHours() * 60 + new Date().getMinutes()
    base.setHours(Math.floor(mins / 60), mins % 60, 0, 0)
    override = { base: base.getTime(), realAt: Date.now() }
    sessionStorage.setItem('clock-override', JSON.stringify(override))
    history.replaceState(null, '', window.location.pathname)
    return
  }
  const saved = sessionStorage.getItem('clock-override')
  if (saved) override = JSON.parse(saved)
}
readOverride()

export function now(): Date {
  if (!override) return new Date()
  return new Date(override.base + (Date.now() - override.realAt))
}

export function isClockOverridden() {
  return override !== null
}
