import { useLiveQuery } from 'dexie-react-hooks'
import { History } from 'lucide-react'
import { TaskRow } from './TaskRow'
import { Eyebrow, Muted } from './ui'
import { useT } from '../i18n'
import { scheduleTask, sweptOn } from '../lib/actions'
import { backlogTasks, byOrder, isOpen } from '../lib/db'
import type { ISODate } from '../lib/dates'
import { QUADRANTS, type Task } from '../lib/types'

const LIMIT = 8
const qRank = (q?: string) => (q ? QUADRANTS.indexOf(q as (typeof QUADRANTS)[number]) : QUADRANTS.length)
const dm = (iso: ISODate) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

/**
 * Backlog ngay cạnh danh sách Hôm nay. Dùng đúng TaskRow như danh sách trong ngày nên:
 * tick xong được tại chỗ, có menu ⋯, thêm nút một chạm đưa vào hôm nay.
 * Việc vừa trôi từ ngày trước lên đầu, mang chip "trôi từ dd/mm".
 */
export function TodayBacklog({ today, onEdit, onComplete, onGoPlan }: {
  today: ISODate
  onEdit?: (t: Task) => void
  onComplete?: (t: Task) => void
  onGoPlan?: () => void
}) {
  const { t } = useT()
  const backlog = useLiveQuery(() => backlogTasks(), [], [])
  const open = backlog.filter(isOpen).sort((a, b) => {
    // việc vừa trôi lên đầu: đó là thứ người dùng đang tìm
    const sa = sweptOn(a, today) ? 0 : 1
    const sb = sweptOn(b, today) ? 0 : 1
    return sa - sb || qRank(a.quadrant) - qRank(b.quadrant) || byOrder(a, b)
  })

  return (
    <div data-testid="today-backlog">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <Eyebrow>{t('today.backlog')}</Eyebrow>
        {open.length > 0 && <span className="text-[12px] tabular-nums text-ink-3">{open.length}</span>}
      </div>
      {open.length === 0 ? (
        <Muted>{t('today.backlog.empty')}</Muted>
      ) : (
        <>
          <Muted className="mb-2 text-[12px]">{t('today.backlog.hint')}</Muted>
          <ul className="flex flex-col gap-1.5">
            {open.slice(0, LIMIT).map((x) => {
              const drift = sweptOn(x, today)
              return (
                <li key={x.id}>
                  <TaskRow
                    task={x} today={today} showStar={false}
                    badge={drift && (
                      <span className="inline-flex shrink-0 items-center gap-1 text-accent" title={t('today.backlog.drifted', { d: dm(drift.fromDate) })}>
                        <History size={11} />{t('today.backlog.drifted', { d: dm(drift.fromDate) })}
                      </span>
                    )}
                    onEdit={onEdit} onComplete={onComplete}
                    onToday={(task) => void scheduleTask(task.id, today)}
                  />
                </li>
              )
            })}
          </ul>
        </>
      )}
      {open.length > LIMIT && (
        <button className="mt-2 text-sm text-accent hover:underline" onClick={onGoPlan} disabled={!onGoPlan}>
          {t('today.backlog.more', { n: open.length - LIMIT })}
        </button>
      )}
    </div>
  )
}
