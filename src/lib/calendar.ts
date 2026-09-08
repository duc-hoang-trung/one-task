import { addDays, fromISODate, toISODate, type ISODate } from './dates'

/** Số ngày tối đa được đặt việc trước. Xa hơn → Parking Lot. */
export const MAX_PLAN_AHEAD_DAYS = 14

/**
 * Lưới tháng, tuần bắt đầu thứ Hai. Ô ngoài tháng = null.
 * month: 1–12.
 */
export function monthGrid(year: number, month: number): (ISODate | null)[][] {
  const first = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  const lead = (first.getDay() + 6) % 7 // Mon=0
  const cells: (ISODate | null)[] = Array(lead).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(toISODate(new Date(year, month - 1, d)))
  while (cells.length % 7) cells.push(null)
  const weeks: (ISODate | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

export function monthOf(iso: ISODate): { year: number; month: number } {
  const d = fromISODate(iso)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

export function shiftMonth(year: number, month: number, by: number): { year: number; month: number } {
  const d = new Date(year, month - 1 + by, 1)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

export function monthRange(year: number, month: number): { from: ISODate; to: ISODate } {
  const from = toISODate(new Date(year, month - 1, 1))
  const to = toISODate(new Date(year, month, 0))
  return { from, to }
}

export type DayRelation = 'past' | 'today' | 'future' | 'too-far'

export function relation(day: ISODate, today: ISODate): DayRelation {
  if (day === today) return 'today'
  if (day < today) return 'past'
  return day <= addDays(today, MAX_PLAN_AHEAD_DAYS) ? 'future' : 'too-far'
}
