import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { History, Trash2 } from 'lucide-react'
import { TaskRow } from './TaskRow'
import { Button, Eyebrow, Muted } from './ui'
import { useT } from '../i18n'
import { deleteTasks, scheduleTask, scheduleTasks, sweptOn } from '../lib/actions'
import { backlogTasks, byOrder, isOpen } from '../lib/db'
import type { ISODate } from '../lib/dates'
import { QUADRANTS, type Task } from '../lib/types'

const LIMIT = 8
const qRank = (q?: string) => (q ? QUADRANTS.indexOf(q as (typeof QUADRANTS)[number]) : QUADRANTS.length)
const dm = (iso: ISODate) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

/**
 * Backlog ngay cạnh danh sách Hôm nay. Dùng đúng TaskRow như danh sách trong ngày, nhưng ô đầu
 * dòng là ô CHỌN: Backlog chủ yếu để dọn, nên chọn nhiều rồi xoá / đưa vào hôm nay một lượt.
 * Đánh xong một việc nằm trong menu ⋯ (và không hỏi ghi giờ — việc này có làm đâu mà ghi).
 * Việc vừa trôi từ ngày trước lên đầu, mang nhãn "trôi từ dd/mm".
 */
export function TodayBacklog({ today, onEdit, onGoPlan }: {
  today: ISODate
  onEdit?: (t: Task) => void
  onGoPlan?: () => void
}) {
  const { t } = useT()
  const [sel, setSel] = useState<string[]>([])
  const [confirm, setConfirm] = useState(false)
  const backlog = useLiveQuery(() => backlogTasks(), [], [])
  const open = backlog.filter(isOpen).sort((a, b) => {
    // việc vừa trôi lên đầu: đó là thứ người dùng đang tìm
    const sa = sweptOn(a, today) ? 0 : 1
    const sb = sweptOn(b, today) ? 0 : 1
    return sa - sb || qRank(a.quadrant) - qRank(b.quadrant) || byOrder(a, b)
  })
  // Đang chọn thì hiện hết để dọn được cả danh sách, không cắt ở LIMIT.
  const shown = sel.length > 0 ? open : open.slice(0, LIMIT)
  const picked = sel.filter((id) => open.some((x) => x.id === id))
  const n = picked.length

  const clear = () => { setSel([]); setConfirm(false) }
  const toggle = (id: string, on: boolean) => {
    setConfirm(false)
    setSel((cur) => (on ? [...cur, id] : cur.filter((x) => x !== id)))
  }

  return (
    <div data-testid="today-backlog">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <Eyebrow>{t('today.backlog')}</Eyebrow>
        {open.length > 0 && (
          n > 0
            ? <button className="text-[12px] text-accent hover:underline" onClick={() => setSel(open.map((x) => x.id))}>{t('sel.all')}</button>
            : <span className="text-[12px] tabular-nums text-ink-3">{open.length}</span>
        )}
      </div>
      {open.length === 0 ? (
        <Muted>{t('today.backlog.empty')}</Muted>
      ) : (
        <>
          <Muted className="mb-2 text-[12px]">{n > 0 ? t('sel.hint') : t('today.backlog.hint')}</Muted>
          <ul className="flex flex-col gap-1.5">
            {shown.map((x) => {
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
                    onEdit={onEdit}
                    selected={sel.includes(x.id)}
                    onSelectChange={(on) => toggle(x.id, on)}
                    onToday={(task) => void scheduleTask(task.id, today)}
                  />
                </li>
              )
            })}
          </ul>
        </>
      )}

      {n > 0 && (
        <div className="sticky bottom-2 mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-paper-2 p-2 ring-1 ring-line shadow-card" data-testid="backlog-actions">
          <span className="text-[13px] font-medium tabular-nums text-ink-2">{t('sel.selected', { n })}</span>
          <span className="flex-1" />
          {confirm ? (
            <>
              <Button size="sm" variant="danger" onClick={() => void deleteTasks(picked).then(clear)}>{t('sel.delete.confirm', { n })}</Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>{t('common.cancel')}</Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="secondary" onClick={() => void scheduleTasks(picked, today).then(clear)}>{t('sel.toToday', { n })}</Button>
              <Button size="sm" variant="danger" onClick={() => setConfirm(true)}><Trash2 size={14} />{t('sel.delete', { n })}</Button>
              <Button size="sm" variant="ghost" onClick={clear}>{t('sel.clear')}</Button>
            </>
          )}
        </div>
      )}

      {n === 0 && open.length > LIMIT && (
        <button className="mt-2 text-sm text-accent hover:underline" onClick={onGoPlan} disabled={!onGoPlan}>
          {t('today.backlog.more', { n: open.length - LIMIT })}
        </button>
      )}
    </div>
  )
}
