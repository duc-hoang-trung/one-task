import { useSyncExternalStore } from 'react'
import { db, onLocalWrite } from '../lib/db'
import { enqueueAll, syncOnce, type Cursor } from './engine'
import { getSupabase, supabaseConfigured, SupabaseRemote } from './supabase'

export type SyncStatus = 'off' | 'signed-out' | 'idle' | 'syncing' | 'offline' | 'error'
export interface SyncState {
  status: SyncStatus
  email?: string
  lastSyncAt?: number
  pending: number
  error?: string
}

let state: SyncState = { status: supabaseConfigured ? 'signed-out' : 'off', pending: 0 }
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

  sb.auth.onAuthStateChange((_event, session) => {
    const u = session?.user
    if (!u) {
      userId = null
      set({ status: 'signed-out', email: undefined })
      return
    }
    userId = u.id
    set({ status: 'idle', email: u.email ?? undefined })
    const key = `sync.initialized:${u.id}`
    const first = !localStorage.getItem(key)
    void (async () => {
      // Lần đầu đăng nhập trên máy này: đẩy toàn bộ local để merge hai chiều (LWW).
      if (first) {
        await enqueueAll()
        localStorage.setItem(key, '1')
      }
      await refreshPending()
      await syncNow()
    })()
  })
}

export async function signInWithEmail(email: string) {
  const sb = getSupabase()
  if (!sb) throw new Error('Supabase not configured')
  const redirectTo = `${location.origin}${import.meta.env.BASE_URL}`
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } })
  if (error) throw new Error(error.message)
}

export async function signOut() {
  const sb = getSupabase()
  if (!sb) return
  await sb.auth.signOut()
  userId = null
  set({ status: 'signed-out', email: undefined, lastSyncAt: undefined })
}
