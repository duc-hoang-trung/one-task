import { getSupabase, supabaseConfigured } from './supabase'

const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

/** Chỉ bật được khi có cả Supabase (để lưu subscription) lẫn khoá VAPID công khai. */
export const pushConfigured = Boolean(supabaseConfigured && VAPID_PUBLIC)

/**
 * Trình duyệt có hỗ trợ push không. Trên iOS chỉ đúng khi PWA đã được Thêm vào màn hình chính —
 * mở trong tab Safari thì PushManager không tồn tại, nên chính phép thử này đã phân biệt được.
 */
export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && typeof Notification !== 'undefined'
}

/** Khoá VAPID là base64url; PushManager đòi Uint8Array. */
export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
  const raw = atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

/** Lấy hai khoá của subscription về dạng base64url để cất lên server. */
export function subscriptionKeys(sub: PushSubscription): { p256dh: string; auth: string } {
  const json = sub.toJSON()
  return { p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' }
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null
  const reg = await navigator.serviceWorker.ready
  return reg.pushManager.getSubscription()
}

export type PushResult = 'on' | 'denied' | 'unsupported' | 'error'

/**
 * Bật nhắc qua push. Phải gọi từ một thao tác chạm của người dùng (iOS bắt buộc).
 * Lưu subscription kèm múi giờ IANA để phía server so giờ địa phương — server tự lo DST.
 */
export async function enablePush(): Promise<PushResult> {
  if (!pushConfigured || !pushSupported()) return 'unsupported'
  const sb = getSupabase()
  if (!sb) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  if (Notification.permission !== 'granted' && (await Notification.requestPermission()) !== 'granted') return 'denied'
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = (await reg.pushManager.getSubscription())
      ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC!) }))
    const { data } = await sb.auth.getUser()
    if (!data.user) return 'error'
    const { error } = await sb.from('push_subscriptions').upsert({
      endpoint: sub.endpoint,
      user_id: data.user.id,
      ...subscriptionKeys(sub),
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    }, { onConflict: 'endpoint' })
    if (error) return 'error'
    return 'on'
  } catch {
    return 'error'
  }
}

/** Tắt: gỡ subscription ở trình duyệt và xoá dòng trên server để khỏi bắn vào hư không. */
export async function disablePush(): Promise<void> {
  const sb = getSupabase()
  const sub = await currentSubscription()
  if (!sub) return
  if (sb) await sb.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}
