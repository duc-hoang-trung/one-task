import type { Settings } from './types'

type Prefs = Settings['notifications']

let ctx: AudioContext | null = null

/** Âm ngắn hai nốt bằng WebAudio, không cần file. Chỉ chạy sau một tương tác người dùng. */
export function beep(kind: 'done' | 'break' | 'gentle' = 'done') {
  try {
    ctx ??= new AudioContext()
    const notes = kind === 'done' ? [660, 880] : kind === 'break' ? [523, 659] : [440]
    notes.forEach((f, i) => {
      const o = ctx!.createOscillator()
      const g = ctx!.createGain()
      o.type = 'sine'
      o.frequency.value = f
      g.gain.value = 0.0001
      o.connect(g).connect(ctx!.destination)
      const t0 = ctx!.currentTime + i * 0.18
      g.gain.exponentialRampToValueAtTime(0.2, t0 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35)
      o.start(t0)
      o.stop(t0 + 0.4)
    })
  } catch {
    /* không có audio: bỏ qua */
  }
}

export function vibrate(pattern: number | number[] = [80, 40, 80]) {
  try {
    // Chrome chặn vibrate khi người dùng chưa chạm vào trang; tránh log lỗi vô ích.
    if (typeof navigator === 'undefined' || (navigator.userActivation && !navigator.userActivation.hasBeenActive)) return
    navigator.vibrate?.(pattern)
  } catch {
    /* ignore */
  }
}

/** Xin quyền Notification (gọi khi người dùng bấm Bắt đầu lần đầu). */
export async function requestNotifyPermission() {
  if (typeof Notification === 'undefined') return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  try {
    return (await Notification.requestPermission()) === 'granted'
  } catch {
    return false
  }
}

export function systemNotify(title: string, body?: string, tag?: string) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  try {
    // Ưu tiên qua service worker để hiện được khi tab ở nền (Android PWA).
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => reg.showNotification(title, { body, tag, icon: `${import.meta.env.BASE_URL}icon.svg`, badge: `${import.meta.env.BASE_URL}icon.svg` }))
        .catch(() => new Notification(title, { body, tag }))
    } else {
      new Notification(title, { body, tag })
    }
  } catch {
    /* ignore */
  }
}

/** Một lần báo đủ ba kênh theo cài đặt. */
export function alertUser(prefs: Prefs, title: string, body?: string, kind: 'done' | 'break' | 'gentle' = 'done', tag?: string) {
  if (prefs.sound) beep(kind)
  if (prefs.vibrate) vibrate(kind === 'gentle' ? 60 : [80, 40, 80])
  if (prefs.system) systemNotify(title, body, tag)
}

/** Bộ nhớ "đã báo" trong phiên tab, để mỗi sự kiện chỉ báo một lần. */
const fired = new Set<string>()
export function once(key: string, fn: () => void) {
  if (fired.has(key)) return
  fired.add(key)
  fn()
}
