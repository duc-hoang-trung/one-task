import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { SyncTable } from '../lib/db'
import type { RemoteRow, RemoteStore } from './remote'

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Không có cấu hình → app chạy thuần local, ẩn mục đăng nhập. */
export const supabaseConfigured = Boolean(URL && KEY)

let client: SupabaseClient | null = null
export function getSupabase(): SupabaseClient | null {
  if (!supabaseConfigured) return null
  client ??= createClient(URL!, KEY!, { auth: { persistSession: true, detectSessionInUrl: true, flowType: 'pkce' } })
  return client
}

/** Bảng public.records (xem supabase/migrations/0001_records.sql). */
export class SupabaseRemote implements RemoteStore {
  constructor(private sb: SupabaseClient, private userId: string) {}

  async upsert(rows: RemoteRow[]) {
    const payload = rows.map((r) => ({
      user_id: this.userId,
      table_name: r.table_name,
      id: r.id,
      data: r.data,
      updated_at: new Date(r.updated_at).toISOString(),
      deleted: r.deleted,
    }))
    const { error } = await this.sb.from('records').upsert(payload, { onConflict: 'user_id,table_name,id' })
    if (error) throw new Error(error.message)
  }

  async fetchSince(sinceMs: number): Promise<RemoteRow[]> {
    const out: RemoteRow[] = []
    let since = new Date(sinceMs).toISOString()
    for (;;) {
      const { data, error } = await this.sb
        .from('records')
        .select('table_name,id,data,updated_at,deleted')
        .eq('user_id', this.userId)
        .gt('updated_at', since)
        .order('updated_at', { ascending: true })
        .limit(1000)
      if (error) throw new Error(error.message)
      if (!data || data.length === 0) break
      for (const r of data) {
        out.push({
          table_name: r.table_name as SyncTable,
          id: r.id as string,
          data: r.data as Record<string, unknown>,
          updated_at: Date.parse(r.updated_at as string),
          deleted: Boolean(r.deleted),
        })
      }
      if (data.length < 1000) break
      since = data[data.length - 1].updated_at as string
    }
    return out
  }
}
