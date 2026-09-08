import { promoteToTask, scheduleTask, setQuadrant } from '../../lib/actions'
import { db } from '../../lib/db'
import { addDays, type ISODate } from '../../lib/dates'
import { QUADRANTS, type Area, type Quadrant } from '../../lib/types'

export const isISODate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s)
const isQuadrant = (s: string): s is Quadrant => (QUADRANTS as string[]).includes(s)

/**
 * Một hàm thả chung cho Ma trận / Tuần / Tháng.
 * active: `task:<id>` | `park:<id>` (ý trong Parking Lot → thành việc)
 * zone:   q1..q4 | unsorted | backlog | today | tomorrow | <YYYY-MM-DD>
 */
export async function handleDrop(activeId: string, zoneId: string, ctx: { today: ISODate; area: Area }) {
  const [kind, id] = activeId.split(':')
  const date = zoneId === 'today' ? ctx.today : zoneId === 'tomorrow' ? addDays(ctx.today, 1) : isISODate(zoneId) ? zoneId : undefined
  if (date && date < ctx.today) return // không thả vào quá khứ

  if (kind === 'task') {
    const task = await db.tasks.get(id)
    if (!task) return
    if (isQuadrant(zoneId)) await setQuadrant(id, zoneId)
    else if (zoneId === 'unsorted') await setQuadrant(id, undefined)
    else if (zoneId === 'backlog') { if (task.scheduledFor !== undefined) await scheduleTask(id, undefined) }
    else if (date) { if (task.scheduledFor !== date) await scheduleTask(id, date) } // thả lại đúng ngày cũ: không xáo order
  } else if (kind === 'park') {
    if (isQuadrant(zoneId)) await promoteToTask(id, { area: ctx.area, quadrant: zoneId })
    else if (zoneId === 'unsorted' || zoneId === 'backlog') await promoteToTask(id, { area: ctx.area })
    else if (date) await promoteToTask(id, { area: ctx.area, scheduledFor: date })
  }
}
