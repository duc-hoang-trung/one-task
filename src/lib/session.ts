import type { Session } from './types'

/** Ẩn app dưới ngưỡng này → tự tiếp tục (thời gian ẩn vẫn bị trừ). Trên ngưỡng → để ở trạng thái tạm dừng. */
export const AUTO_RESUME_MS = 2 * 60_000

export const isPaused = (s: Session) => s.endedAt === undefined && s.pausedAt !== undefined
export const isRunning = (s: Session) => s.endedAt === undefined && s.pausedAt === undefined
export const isFocus = (s: Session) => s.kind !== 'break'

/** Thời gian thực sự chạy (ms), trừ mọi khoảng tạm dừng. */
export function elapsedMs(s: Session, nowMs: number): number {
  const end = s.endedAt ?? s.pausedAt ?? nowMs
  return Math.max(0, end - s.startedAt - (s.pausedMs ?? 0))
}

export type Reconcile = { kind: 'none' } | { kind: 'resume'; from: number } | { kind: 'pause'; at: number }

/**
 * Khi app hiện lại / khởi động: quyết định làm gì với phiên đang mở.
 * hiddenAt: lúc app bị ẩn (ghi đồng bộ vào localStorage khi ẩn); seenAt: heartbeat cuối khi đang hiển thị.
 * Cả hai chỉ có nghĩa nếu thuộc đúng sessionId (caller lọc trước).
 * - break / đã kết thúc → không làm gì (nghỉ tính theo giờ thật)
 * - gap < AUTO_RESUME_MS → resume từ gapStart (thời gian ẩn bị trừ khỏi phút tập trung)
 * - gap ≥ AUTO_RESUME_MS → pause tại gapStart (nếu chưa pause), chờ người dùng bấm Tiếp tục
 */
export function decideReconcile(args: { session: Session; hiddenAt?: number; seenAt?: number; nowMs: number }): Reconcile {
  const { session: s, hiddenAt, seenAt, nowMs } = args
  if (!isFocus(s) || s.endedAt !== undefined) return { kind: 'none' }
  const marks = [hiddenAt, seenAt].filter((x): x is number => typeof x === 'number' && x >= s.startedAt)
  const gapStart = s.pausedAt ?? (marks.length ? Math.max(...marks) : undefined)
  if (gapStart === undefined) return { kind: 'none' }
  const gap = nowMs - gapStart
  if (gap < AUTO_RESUME_MS) {
    // đang pause ngắn → tiếp tục; đang chạy mà chỉ ẩn thoáng qua → trừ khoảng ẩn
    if (s.pausedAt !== undefined || gap > 1_000) return { kind: 'resume', from: gapStart }
    return { kind: 'none' }
  }
  if (s.pausedAt !== undefined) return { kind: 'none' } // đã pause lâu: giữ nguyên, chờ bấm
  return { kind: 'pause', at: gapStart }
}

// ---- Dấu vết ẩn/hiện trong localStorage (đồng bộ, an toàn khi trang bị đóng băng) -----

const HIDDEN_KEY = 'focus.hiddenAt'
const SEEN_KEY = 'focus.seenAt'
type Mark = { sessionId: string; at: number }

function write(key: string, m: Mark) {
  try { localStorage.setItem(key, JSON.stringify(m)) } catch { /* private mode */ }
}
function read(key: string): Mark | undefined {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return undefined
    const m = JSON.parse(raw) as Mark
    return typeof m?.at === 'number' && typeof m?.sessionId === 'string' ? m : undefined
  } catch { return undefined }
}
export const marks = {
  hidden: (sessionId: string, at: number) => write(HIDDEN_KEY, { sessionId, at }),
  seen: (sessionId: string, at: number) => write(SEEN_KEY, { sessionId, at }),
  /** Trả về hiddenAt/seenAt của đúng phiên này. */
  for(sessionId: string): { hiddenAt?: number; seenAt?: number } {
    const h = read(HIDDEN_KEY), s = read(SEEN_KEY)
    return { hiddenAt: h?.sessionId === sessionId ? h.at : undefined, seenAt: s?.sessionId === sessionId ? s.at : undefined }
  },
  clear() {
    try { localStorage.removeItem(HIDDEN_KEY); localStorage.removeItem(SEEN_KEY) } catch { /* ignore */ }
  },
}
