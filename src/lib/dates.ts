export type ISODate = string // YYYY-MM-DD (local)
export type HM = string // HH:MM

const pad = (n: number) => String(n).padStart(2, '0')

export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fromISODate(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(iso: ISODate, n: number): ISODate {
  const d = fromISODate(iso)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

/** Ngày "logic": một ngày bắt đầu lúc dayStartHour (mặc định 04:00), để 00:30 vẫn là "đêm hôm nay". */
export function logicalDate(now: Date, dayStartHour = 4): ISODate {
  const shifted = new Date(now.getTime() - dayStartHour * 3600_000)
  return toISODate(shifted)
}

/** Thứ Hai của tuần chứa ngày iso. */
export function weekStart(iso: ISODate): ISODate {
  const d = fromISODate(iso)
  const dow = (d.getDay() + 6) % 7 // Mon=0 … Sun=6
  d.setDate(d.getDate() - dow)
  return toISODate(d)
}

export function weekDays(start: ISODate): ISODate[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export function parseHM(hm: HM): number {
  const [h, m] = hm.split(':').map(Number)
  return h * 60 + (m || 0)
}

export function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes()
}

export function toHM(d: Date): HM {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * Khoảng cách phút từ giờ mục tiêu đến giờ thực, xử lý qua nửa đêm.
 * bedtimeDelta('23:00', '00:30') = 90 ; bedtimeDelta('23:00', '22:30') = -30
 */
export function bedtimeDelta(target: HM, actual: HM): number {
  let delta = parseHM(actual) - parseHM(target)
  if (delta > 12 * 60) delta -= 24 * 60
  if (delta < -12 * 60) delta += 24 * 60
  return delta
}

export function fmtDateVi(iso: ISODate): string {
  const d = fromISODate(iso)
  const dows = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']
  return `${dows[d.getDay()]} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`
}
