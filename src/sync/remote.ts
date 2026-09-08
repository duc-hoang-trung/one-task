import type { SyncTable } from '../lib/db'

/** Một dòng trên cloud. data = bản ghi Dexie nguyên vẹn (jsonb). */
export interface RemoteRow {
  table_name: SyncTable
  id: string
  data: Record<string, unknown>
  /** ms epoch */
  updated_at: number
  deleted: boolean
}

/** Giao diện tối thiểu để test được bằng bộ nhớ, và cắm Supabase vào. */
export interface RemoteStore {
  upsert(rows: RemoteRow[]): Promise<void>
  /** Mọi dòng có updated_at > sinceMs, tăng dần theo updated_at. */
  fetchSince(sinceMs: number): Promise<RemoteRow[]>
}

/** Remote trong bộ nhớ cho test. */
export class MemoryRemote implements RemoteStore {
  rows = new Map<string, RemoteRow>()
  async upsert(rows: RemoteRow[]) {
    for (const r of rows) this.rows.set(`${r.table_name}:${r.id}`, r)
  }
  async fetchSince(sinceMs: number) {
    return [...this.rows.values()].filter((r) => r.updated_at > sinceMs).sort((a, b) => a.updated_at - b.updated_at)
  }
}
