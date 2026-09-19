import { CalendarArrowDown, Check, ListChecks, MoreHorizontal, Play, Star } from 'lucide-react'
import { useCallback, useRef, useState, type ReactNode } from 'react'
import { useT } from '../i18n'
import { completeTask, deleteTask, scheduleTask, setDod, setMain, uncompleteTask } from '../lib/actions'
import { addDays, type ISODate } from '../lib/dates'
import type { Task } from '../lib/types'
import { Popover } from './Popover'
import { QuadrantChip } from './QuadrantChip'
import { SubtaskList } from './SubtaskList'

/**
 * Một dòng việc, dùng chung cho mọi danh sách (hôm nay, Backlog, ma trận, tuần, tháng).
 * Bố cục: [tick] [tên + hàng meta] [→hôm nay] [▶] [⋯]. Tên chiếm một hàng riêng nên không
 * bị chip đẩy cụt trên điện thoại; meta (nhãn, k/n việc con, số phút, bước tiếp) xuống hàng dưới.
 * compact/dense: một hàng duy nhất, meta gộp vào hàng tên.
 * Không kéo thả ở đây; bọc ngoài bằng SortableItem / DragItem nếu cần.
 */
export function TaskRow({
  task, today, minutes = 0, badge, onFocus, onEdit, onComplete, onToday, showStar = true, compact = false, readOnly = false, dense = false,
}: {
  task: Task
  today: ISODate
  minutes?: number
  /** Nhãn nhỏ ở hàng meta (vd. "trôi từ 09/09"). */
  badge?: ReactNode
  onFocus?: (task: Task) => void
  onEdit?: (task: Task) => void
  /** Gọi sau khi đánh xong (để màn hình mở hộp ghi giờ). */
  onComplete?: (task: Task) => void
  /** Hiện nút một chạm đưa việc vào hôm nay (dùng ở Backlog). */
  onToday?: (task: Task) => void
  showStar?: boolean
  compact?: boolean
  readOnly?: boolean
  /** Ô hẹp (ma trận): ẩn chip, tiêu đề xuống dòng, nút nhỏ. */
  dense?: boolean
}) {
  const { t } = useT()
  const [menu, setMenu] = useState(false)
  const [subs, setSubs] = useState(false)
  const menuBtn = useRef<HTMLButtonElement>(null)
  const closeMenu = useCallback(() => setMenu(false), [])
  const done = task.status === 'done'
  const subN = task.dod.length
  const subK = task.dod.filter((d) => d.done).length
  /** Hàng meta riêng: chỉ ở dòng đầy đủ. compact/dense nhồi hết vào một hàng. */
  const twoLine = !compact && !dense

  const toggleDone = () => {
    if (done) return void uncompleteTask(task.id)
    void completeTask(task.id).then(() => onComplete?.(task))
  }

  const subChip = subN > 0 && !dense && (
    <button
      type="button" aria-label={t('sub.progress', { k: subK, n: subN })} aria-expanded={subs}
      className={`inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums transition-colors ${subK === subN ? 'bg-good/15 text-good' : 'bg-paper-3 text-ink-2 hover:bg-paper-3/70'}`}
      onClick={() => setSubs((s) => !s)}
    >
      <ListChecks size={12} />{subK}/{subN}
    </button>
  )
  const min = minutes > 0 && <span className="shrink-0 tabular-nums">{minutes}′</span>
  const sub = task.startAt || task.nextAction
    ? <span className="min-w-0 truncate">{task.startAt ? `${task.startAt} · ` : ''}{task.nextAction}</span>
    : null

  // Không dùng opacity ở root (tạo stacking context); việc xong thì nhạt chữ.
  const box = dense ? 'bg-paper/80 ring-1 ring-line' : compact ? '' : 'bg-paper/60 ring-1 ring-line'
  return (
    <div className={`group relative rounded-xl ${box} ${done ? 'text-ink-3' : ''}`}>
      <div className={`flex items-center ${dense ? 'gap-1.5 px-1.5 py-1.5' : 'gap-2.5 px-2 py-2'}`}>
        <button
          aria-label={done ? t('row.undo') : t('common.done')}
          disabled={readOnly}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${done ? 'border-good bg-good text-white' : 'border-ink-3/60 hover:border-accent'}`}
          onClick={toggleDone}
        >
          {done && <Check size={14} strokeWidth={3} />}
        </button>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-w-0 items-center gap-2">
            <button className="min-w-0 flex-1 text-left" onClick={() => onEdit?.(task)} disabled={readOnly && !onEdit}>
              <span className={`block ${dense ? 'line-clamp-2 text-[13px] leading-snug' : 'truncate text-[15px]'} ${done ? 'line-through' : ''}`}>{task.title}</span>
            </button>
            {!dense && <QuadrantChip q={task.quadrant} />}
            {!twoLine && subChip}
            {!twoLine && min && <span className="text-[12px] text-ink-3">{min}</span>}
            {task.isMain && showStar && <Star size={14} className="shrink-0 fill-accent text-accent" />}
          </div>
          {twoLine && (badge || subChip || min || sub) && (
            <div className="mt-1 flex min-w-0 items-center gap-2 text-[12px] text-ink-3">
              {badge}
              {subChip}
              {min}
              {sub}
            </div>
          )}
        </div>

        {!readOnly && !done && onToday && (
          <button
            aria-label={t('today.overdue.toToday')} title={t('today.overdue.toToday')}
            className="shrink-0 rounded-lg p-1.5 text-ink-3 transition-colors hover:bg-accent-soft hover:text-accent"
            onClick={() => onToday(task)}
          >
            <CalendarArrowDown size={16} />
          </button>
        )}
        {!readOnly && !done && onFocus && (
          <button aria-label={t('row.focus')} className="shrink-0 rounded-lg p-1.5 text-ink-3 hover:bg-paper-3 hover:text-ink" onClick={() => onFocus(task)}>
            <Play size={16} />
          </button>
        )}
        {!readOnly && (
          <button ref={menuBtn} aria-label="menu" className="shrink-0 rounded-lg p-1.5 text-ink-3 hover:bg-paper-3 hover:text-ink" onClick={() => setMenu((m) => !m)}>
            <MoreHorizontal size={16} />
          </button>
        )}
      </div>

      {subs && subN > 0 && (
        <div className={`${dense ? 'px-1.5' : 'px-2'} pb-2.5 pl-10`}>
          <SubtaskList value={task.dod} onChange={(next) => void setDod(task.id, next)} editable={false} disabled={readOnly} compact />
        </div>
      )}

      {menu && menuBtn.current && (
        <Popover anchor={menuBtn.current} onClose={closeMenu}>
            {showStar && task.scheduledFor && !done && (
              <MenuItem onClick={() => void setMain(task.id, !task.isMain).then(() => setMenu(false))}>
                <Star size={14} />{task.isMain ? t('row.unstar') : t('row.star')}
              </MenuItem>
            )}
            {onEdit && <MenuItem onClick={() => { setMenu(false); onEdit(task) }}>{t('row.edit')}</MenuItem>}
            {task.scheduledFor !== today && (
              <MenuItem onClick={() => void scheduleTask(task.id, today).then(() => setMenu(false))}>{t('today.overdue.toToday')}</MenuItem>
            )}
            {task.scheduledFor !== addDays(today, 1) && (
              <MenuItem onClick={() => void scheduleTask(task.id, addDays(today, 1)).then(() => setMenu(false))}>{t('row.tomorrow')}</MenuItem>
            )}
            {task.scheduledFor && (
              <MenuItem onClick={() => void scheduleTask(task.id, undefined).then(() => setMenu(false))}>{t('row.backlog')}</MenuItem>
            )}
            <MenuItem danger onClick={() => void deleteTask(task.id).then(() => setMenu(false))}>{t('row.delete')}</MenuItem>
        </Popover>
      )}
    </div>
  )
}

function MenuItem({ children, onClick, danger = false }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-paper-3/60 ${danger ? 'text-bad' : 'text-ink'}`} onClick={onClick}>
      {children}
    </button>
  )
}
