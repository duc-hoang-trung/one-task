import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, History } from 'lucide-react'
import { QuadrantChip } from './QuadrantChip'
import { Button, Eyebrow, Muted } from './ui'
import { useT } from '../i18n'
import { scheduleTask, sweptOn } from '../lib/actions'
import { backlogTasks, byOrder, isOpen } from '../lib/db'
import type { ISODate } from '../lib/dates'
import { QUADRANTS, type Task } from '../lib/types'

const LIMIT = 8
const qRank = (q?: string) => (q ? QUADRANTS.indexOf(q as (typeof QUADRANTS)[number]) : QUADRANTS.length)

/**
 * Backlog ngay cạnh danh sách Hôm nay: việc chưa lên lịch (kể cả việc vừa trôi từ ngày trước,
 * có nhãn "trôi từ …"), mỗi dòng một nút đưa vào hôm nay. Q1 → Q4 → chưa phân loại.
 */
export function TodayBacklog({ today, onEdit, onGoPlan }: { today: ISODate; onEdit?: (t: Task) => void; onGoPlan?: () => void }) {
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
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <Eyebrow>{t('today.backlog')}{open.length ? ` · ${open.length}` : ''}</Eyebrow>
      </div>
      <Muted className="mb-2 text-[12px]">{t('today.backlog.hint')}</Muted>
      {open.length === 0 ? (
        <Muted>{t('today.backlog.empty')}</Muted>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {open.slice(0, LIMIT).map((x) => {
            const drift = sweptOn(x, today)
            return (
              // Hai dòng: tên đủ rộng ở trên, nhãn "trôi từ" + nút ở dưới — cột Backlog hẹp trên màn rộng.
              <li key={x.id} className="rounded-xl bg-paper/70 px-2.5 py-2 ring-1 ring-line">
                <button className="flex w-full min-w-0 items-center gap-2 text-left" onClick={() => onEdit?.(x)} disabled={!onEdit}>
                  <QuadrantChip q={x.quadrant} />
                  <span className="min-w-0 flex-1 truncate text-[14px]">{x.title}</span>
                </button>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  {drift ? (
                    <span className="flex min-w-0 items-center gap-1 truncate text-[11px] text-accent"><History size={11} className="shrink-0" />{t('today.backlog.drifted', { d: `${drift.fromDate.slice(8, 10)}/${drift.fromDate.slice(5, 7)}` })}</span>
                  ) : <span />}
                  <Button size="sm" variant="secondary" className="shrink-0" onClick={() => void scheduleTask(x.id, today)}>
                    <ArrowLeft size={13} className="hidden lg:inline" />{t('today.overdue.toToday')}
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {open.length > LIMIT && (
        <button className="mt-2 text-sm text-accent hover:underline" onClick={onGoPlan} disabled={!onGoPlan}>
          {t('today.backlog.more', { n: open.length - LIMIT })}
        </button>
      )}
    </div>
  )
}
