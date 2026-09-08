import { useSyncExternalStore } from 'react'
import { wipeAll } from '../lib/actions'
import { db, onLocalWrite } from '../lib/db'
import { enqueueAll, syncOnce, type Cursor } from './engine'
import { getSupabase, supabaseConfigured, SupabaseRemote } from './supabase'

/** loading: đã cấu hình Supabase, đang khôi phục session (chưa biết đã đăng nhập hay chưa). */
export type SyncStatus = 'off' | 'loading' | 'signed-out' | 'idle' | 'syncing' | 'offline' | 'error'
export interface SyncState {
  status: SyncStatus
  email?: string
  lastSyncAt?: number
  pending: number
  error?: string
}

let state: SyncState = { status: supabaseConfigured ? 'loading' : 'off', pending: 0 }
const subs = new Set<() => void>()
function set(partial: Partial<SyncState>) {
  state = { ...state, ...partial }
  subs.forEach((f) => f())
}
export function useSync(): SyncState {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => state, () => state)
}

let userId: string | null = null
let running = false
let timer: ReturnType<typeof setTimeout> | null = null
let initialized = false

const cursorFor = (uid: string): Cursor => ({
  get: () => Number(localStorage.getItem(`sync.lastPulledAt:${uid}`) || 0),
  set: (ms) => localStorage.setItem(`sync.lastPulledAt:${uid}`, String(ms)),
})

async function refreshPending() {
  set({ pending: await db.outbox.count() })
}

/** Đồng bộ ngay (push rồi pull). An toàn khi gọi nhiều lần. */
export async function syncNow() {
  const sb = getSupabase()
  if (!sb || !userId || running) return
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    set({ status: 'offline' })
    return
  }
  running = true
  set({ status: 'syncing', error: undefined })
  try {
    await syncOnce(new SupabaseRemote(sb, userId), cursorFor(userId))
    set({ status: 'idle', lastSyncAt: Date.now() })
  } catch (e) {
    set({ status: navigator.onLine ? 'error' : 'offline', error: e instanceof Error ? e.message : String(e) })
  } finally {
    running = false
    await refreshPending()
  }
}

function schedule(delayMs = 2000) {
  if (!userId) return
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => void syncNow(), delayMs)
}

/** Gọi một lần khi app mở. */
export function initSync() {
  if (initialized) return
  initialized = true
  const sb = getSupabase()
  if (!sb) return

  onLocalWrite(() => {
    void refreshPending()
    schedule()
  })
  window.addEventListener('online', () => schedule(0))
  setInterval(() => schedule(0), 5 * 60_000)

  const onSession = (session: { user: { id: string; email?: string } } | null) => {
    const u = session?.user
    if (!u) {
      userId = null
      set({ status: 'signed-out', email: undefined })
      return
    }
    if (userId === u.id) return
    userId = u.id
    set({ status: 'idle', email: u.email ?? undefined })
    const key = `sync.initialized:${u.id}`
    void (async () => {
      // Tài khoản khác với lần trước trên máy này: xoá local để không trộn dữ liệu hai người.
      const last = localStorage.getItem(LAST_USER_KEY)
      if (last && last !== u.id) await wipeLocal()
      localStorage.setItem(LAST_USER_KEY, u.id)
      // Lần đầu đăng nhập trên máy này: đẩy toàn bộ local để merge hai chiều (LWW).
      if (!localStorage.getItem(key)) {
        await enqueueAll()
        localStorage.setItem(key, '1')
      }
      await refreshPending()
      await syncNow()
    })()
  }
  // Khôi phục session ngay để cổng đăng nhập không nháy; sau đó theo dõi thay đổi.
  void sb.auth.getSession().then(({ data }) => onSession(data.session))
  sb.auth.onAuthStateChange((_event, session) => onSession(session))
}

const LAST_USER_KEY = 'sync.lastUserId'

/** Xoá toàn bộ dữ liệu trên máy này + mọi cursor/cờ đồng bộ. Bản trên cloud giữ nguyên. */
export async function wipeLocal() {
  await wipeAll()
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith('sync.') || k.startsWith('focus.')) localStorage.removeItem(k)
  } catch { /* ignore */ }
}

/** Trạng thái → màn nào: đang kiểm tra / đăng nhập / vào app. Không cấu hình Supabase → vào app (chạy local). */
export function gateFor(status: SyncStatus): 'loading' | 'login' | 'app' {
  if (status === 'loading') return 'loading'
  if (status === 'signed-out') return 'login'
  return 'app'
}

export async function signInWithEmail(email: string) {
  const sb = getSupabase()
  if (!sb) throw new Error('Supabase not configured')
  const redirectTo = `${location.origin}${import.meta.env.BASE_URL}`
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } })
  if (error) throw new Error(error.message)
}

/**
 * Đăng xuất: đẩy nốt thay đổi chờ; còn kẹt (offline) thì ném 'pending' để UI báo, không đăng xuất.
 * Thành công → xoá dữ liệu local, tải lại về màn đăng nhập.
 */
export async function signOut() {
  const sb = getSupabase()
  if (!sb) return
  if (state.pending > 0 && navigator.onLine) await syncNow()
  await refreshPending()
  if (state.pending > 0) throw new Error('pending')
  await sb.auth.signOut()
  userId = null
  await wipeLocal()
  set({ status: 'signed-out', email: undefined, lastSyncAt: undefined, pending: 0 })
  location.reload()
}
