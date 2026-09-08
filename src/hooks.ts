import { useEffect, useState } from 'react'
import { activeSession, closeStaleSessions, reconcileSession } from './lib/actions'
import { now } from './lib/clock'
import type { ISODate } from './lib/dates'
import { decideReconcile, isFocus, isRunning, marks } from './lib/session'

/** Đồng hồ app cho phase và nhắc nhở. Timer KHÔNG dùng hook này (tự tick, xem useTicker). */
export function useNow(intervalMs = 30_000) {
  const [t, setT] = useState(() => now())
  useEffect(() => {
    const id = setInterval(() => setT(now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return t
}

/**
 * Tick cho timer: 250ms, chỉ đổi state khi số giây đổi; dừng khi không chạy hoặc tab ẩn.
 * Trả về nowMs (theo lib/clock để giữ được giờ giả lập).
 */
export function useTicker(running: boolean) {
  const [nowMs, setNowMs] = useState(() => now().getTime())
  useEffect(() => {
    setNowMs(now().getTime())
    if (!running) return
    let lastSec = -1
    const tick = () => {
      if (document.hidden) return
      const ms = now().getTime()
      const sec = Math.floor(ms / 1000)
      if (sec !== lastSec) {
        lastSec = sec
        setNowMs(ms)
      }
    }
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [running])
  return nowMs
}

/**
 * Bảo vệ phiên tập trung qua các lần ẩn/đóng app:
 *  - ẩn / pagehide → ghi mốc vào localStorage (đồng bộ, không chờ IndexedDB)
 *  - hiện lại / khởi động → đối soát: ẩn ngắn thì trừ khoảng ẩn và chạy tiếp, ẩn lâu thì để ở trạng thái tạm dừng
 *  - sau đó mới đóng phiên treo từ ngày khác
 */
export function useSessionGuard(today: ISODate) {
  useEffect(() => {
    let cancelled = false
    async function reconcile() {
      const s = await activeSession()
      if (cancelled || !s || !isFocus(s)) return
      const r = decideReconcile({ session: s, ...marks.for(s.id), nowMs: now().getTime() })
      if (r.kind !== 'none') await reconcileSession(s.id, r)
      marks.clear()
    }
    async function onHide() {
      const s = await activeSession()
      if (s && isFocus(s) && isRunning(s)) marks.hidden(s.id, now().getTime())
    }
    const onVisibility = () => { if (document.hidden) void onHide(); else void reconcile() }
    void reconcile().then(() => { if (!cancelled) void closeStaleSessions(today) })
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onVisibility)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onVisibility)
    }
  }, [today])
}
