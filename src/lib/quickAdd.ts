import type { Area, Quadrant } from './types'

export interface QuickAdd {
  title: string
  area?: Area
  quadrant?: Quadrant
  estimateMin?: number
}

/**
 * Cú pháp thêm nhanh, mọi token đều tuỳ chọn, vị trí bất kỳ:
 *   #w / #work / #cv   → area work        #p / #personal / #cn → area personal
 *   !1..!4             → quadrant q1..q4   ~45 / ~45m           → ước lượng 45 phút
 * Ví dụ: "Gửi báo cáo tuần #w !1 ~30"
 */
export function parseQuickAdd(raw: string): QuickAdd {
  const out: QuickAdd = { title: '' }
  const words: string[] = []
  for (const tok of raw.trim().split(/\s+/)) {
    const low = tok.toLowerCase()
    if (/^#(w|work|cv)$/.test(low)) out.area = 'work'
    else if (/^#(p|personal|cn)$/.test(low)) out.area = 'personal'
    else if (/^![1-4]$/.test(low)) out.quadrant = `q${low[1]}` as Quadrant
    else if (/^~\d{1,3}m?$/.test(low)) out.estimateMin = Number(low.replace(/[~m]/g, ''))
    else if (tok) words.push(tok)
  }
  out.title = words.join(' ')
  return out
}
