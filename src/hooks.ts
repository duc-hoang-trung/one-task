import { useEffect, useState } from 'react'
import { now } from './lib/clock'

/** Đồng hồ app, tick mỗi giây (dùng cho timer và đổi phase). */
export function useNow(intervalMs = 1000) {
  const [t, setT] = useState(() => now())
  useEffect(() => {
    const id = setInterval(() => setT(now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return t
}
