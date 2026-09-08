import { applyRemote, db, keyOf, SYNC_TABLES, type SyncTable } from '../lib/db'
import type { RemoteRow, RemoteStore } from './remote'

const LAST_PULLED_KEY = 'sync.lastPulledAt'

export interface Cursor {
  get(): number
  set(ms: number): void
}

export const localStorageCursor: Cursor = {
  get: () => Number((typeof localStorage !== 'undefined' && localStorage.getItem(LAST_PULLED_KEY)) || 0),
  set: (ms) => typeof localStorage !== 'undefined' && localStorage.setItem(LAST_PULLED_KEY, String(ms)),
}

export class MemoryCursor implements Cursor {
  v = 0
  get() { return this.v }
  set(ms: number) { this.v = ms }
}

/** Đẩy outbox lên cloud theo lô. Trả về số dòng đã đẩy. */
export async function push(remote: RemoteStore, batch = 200): Promise<number> {
  let total = 0
  for (;;) {
    const pending = await db.outbox.limit(batch).toArray()
    if (pending.length === 0) return total
    const rows: RemoteRow[] = []
    for (const o of pending) {
      const local = (await db.table(o.table).get(o.rowId)) as Record<string, unknown> | undefined
      if (!local) continue
      rows.push({
        table_name: o.table,
        id: o.rowId,
        data: local,
        updated_at: Number(local.updatedAt ?? o.updatedAt),
        deleted: Boolean(local.deleted),
      })
    }
    if (rows.length) await remote.upsert(rows)
    // Chỉ xoá outbox nếu không có ghi mới hơn chen vào trong lúc đẩy.
    await db.transaction('rw', db.outbox, async () => {
      for (const o of pending) {
        const cur = await db.outbox.get(o.id)
        if (cur && cur.updatedAt === o.updatedAt) await db.outbox.delete(o.id)
      }
    })
    total += rows.length
  }
}

/** Kéo về các dòng mới hơn con trỏ; last-write-wins theo updatedAt. Trả về số dòng đã ghi. */
export async function pull(remote: RemoteStore, cursor: Cursor): Promise<number> {
  const since = cursor.get()
  const rows = await remote.fetchSince(since)
  let applied = 0
  let maxTs = since
  for (const r of rows) {
    maxTs = Math.max(maxTs, r.updated_at)
    if (!SYNC_TABLES.includes(r.table_name)) continue
    const local = (await db.table(r.table_name).get(r.id)) as { updatedAt?: number } | undefined
    if (local && (local.updatedAt ?? 0) >= r.updated_at) continue
    const data = { ...r.data, updatedAt: r.updated_at, deleted: r.deleted || undefined }
    // đảm bảo khoá đúng chỗ (dayLogs dùng date)
    const k = keyOf(r.table_name as SyncTable, data as never)
    if (k !== r.id) continue
    await applyRemote(r.table_name, data)
    applied++
  }
  if (maxTs > since) cursor.set(maxTs)
  return applied
}

/** Lần đăng nhập đầu: đánh dấu mọi bản ghi local là cần đẩy, để merge hai chiều bằng LWW. */
export async function enqueueAll() {
  await db.transaction('rw', [...SYNC_TABLES.map((t) => db.table(t)), db.outbox], async () => {
    for (const t of SYNC_TABLES) {
      const rows = (await db.table(t).toArray()) as Record<string, unknown>[]
      for (const r of rows) {
        const rowId = keyOf(t, r as never)
        const updatedAt = Number(r.updatedAt ?? Date.now())
        await db.outbox.put({ id: `${t}:${rowId}`, table: t, rowId, updatedAt })
      }
    }
  })
}

export async function syncOnce(remote: RemoteStore, cursor: Cursor) {
  const pushed = await push(remote)
  const pulled = await pull(remote, cursor)
  return { pushed, pulled }
}
