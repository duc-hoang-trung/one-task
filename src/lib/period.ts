import { addDays, fromISODate, toISODate, weekStart, type ISODate } from './dates'

export type Horizon = 'week' | 'quarter' | 'year'

/** Key tuần theo ISO 8601: '2026-W37' (tuần bắt đầu thứ Hai). */
export function weekKey(iso: ISODate): string {
  const d = fromISODate(iso)
  // Thứ Năm của tuần quyết định năm ISO
  const thu = new Date(d)
  thu.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 3)
  const isoYear = thu.getFullYear()
  const jan4 = new Date(isoYear, 0, 4)
  const week1Mon = new Date(jan4)
  week1Mon.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7))
  const week = 1 + Math.round((fromISODate(weekStart(iso)).getTime() - week1Mon.getTime()) / (7 * 86_400_000))
  return `${isoYear}-W${String(week).padStart(2, '0')}`
}

export function quarterKey(iso: ISODate): string {
  const d = fromISODate(iso)
  return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`
}

export function yearKey(iso: ISODate): string {
  return iso.slice(0, 4)
}

export function keyFor(horizon: Horizon, iso: ISODate): string {
  return horizon === 'week' ? weekKey(iso) : horizon === 'quarter' ? quarterKey(iso) : yearKey(iso)
}

export function horizonOf(key: string): Horizon {
  return key.includes('-W') ? 'week' : key.includes('-Q') ? 'quarter' : 'year'
}

/** Khoảng ngày [from, to] của một kỳ. */
export function periodRange(key: string): { from: ISODate; to: ISODate } {
  const h = horizonOf(key)
  if (h === 'year') {
    return { from: `${key}-01-01`, to: `${key}-12-31` }
  }
  if (h === 'quarter') {
    const [y, q] = key.split('-Q').map(Number)
    const m0 = (q - 1) * 3
    return { from: toISODate(new Date(y, m0, 1)), to: toISODate(new Date(y, m0 + 3, 0)) }
  }
  const [y, w] = key.split('-W').map(Number)
  const jan4 = new Date(y, 0, 4)
  const week1Mon = new Date(jan4)
  week1Mon.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7))
  const from = toISODate(new Date(week1Mon.getFullYear(), week1Mon.getMonth(), week1Mon.getDate() + (w - 1) * 7))
  return { from, to: addDays(from, 6) }
}

/** Kỳ cha: tuần → quý (theo thứ Năm của tuần), quý → năm, năm → null. */
export function parentKey(key: string): string | null {
  const h = horizonOf(key)
  if (h === 'year') return null
  if (h === 'quarter') return key.slice(0, 4)
  const { from } = periodRange(key)
  return quarterKey(addDays(from, 3))
}

/** Kỳ kế tiếp / trước đó cùng horizon. */
export function shiftPeriod(key: string, by: number): string {
  const h = horizonOf(key)
  const { from } = periodRange(key)
  if (h === 'week') return weekKey(addDays(from, 7 * by))
  const d = fromISODate(from)
  if (h === 'quarter') return quarterKey(toISODate(new Date(d.getFullYear(), d.getMonth() + 3 * by, 1)))
  return String(d.getFullYear() + by)
}

/** Nhãn hiển thị: 'W37 · 07/09–13/09', 'Q3 2026', '2026'. */
export function periodLabel(key: string, lang: 'vi' | 'en'): string {
  const h = horizonOf(key)
  if (h === 'year') return key
  if (h === 'quarter') {
    const [y, q] = key.split('-Q')
    return lang === 'vi' ? `Quý ${q} · ${y}` : `Q${q} ${y}`
  }
  const { from, to } = periodRange(key)
  const dm = (iso: ISODate) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
  const w = key.split('-W')[1]
  return `${lang === 'vi' ? 'Tuần' : 'Week'} ${Number(w)} · ${dm(from)}–${dm(to)}`
}
