import { Check, MoreHorizontal, Play, Star } from 'lucide-react'
import { useState } from 'react'
import { useT } from '../i18n'
import { completeTask, deleteTask, scheduleTask, setMain, uncompleteTask } from '../lib/actions'
import { addDays, type ISODate } from '../lib/dates'
import type { Task } from '../lib/types'
import { QuadrantChip } from './QuadrantChip'

/**
 * Một dòng việc: checkbox · title · chip · phút · ▶ · ⋯
 * Không kéo thả ở đây; bọc ngoài bằng SortableItem nếu cần.
 */
export function TaskRow({
  task, today, minutes = 0, onFocus, onEdit, showStar = true, compact = false, readOnly = false, dense = false,
}: {
  task: Task
  today: ISODate
  minutes?: number
  onFocus?: (task: Task) => void
  onEdit?: (task: Task) => void
  showStar?: boolean
  compact?: boolean
  readOnly?: boolean
  /** Ô hẹp (ma trận): ẩn chip, tiêu đề xuống dòng, nút nhỏ. */
  dense?: boolean
}) {
  const { t } = useT()
  const [menu, setMenu] = useState(false)
  const done = task.status === 'done'

  return (
    <div className={`group relative flex items-center rounded-xl ${dense ? 'gap-1.5 bg-paper/80 px-1.5 py-1.5 ring-1 ring-line' : 'gap-2.5 px-2 py-2'} ${done ? 'opacity-60' : ''} ${compact || dense ? '' : 'bg-paper/60 ring-1 ring-line'}`}>
      <button
        aria-label={done ? t('row.undo') : t('common.done')}
        disabled={readOnly}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${done ? 'border-good bg-good text-white' : 'border-ink-3/60 hover:border-accent'}`}
        onClick={() => void (done ? uncompleteTask(task.id) : completeTask(task.id))}
      >
        {done && <Check size={14} strokeWidth={3} />}
      </button>

      <button className="min-w-0 flex-1 text-left" onClick={() => onEdit?.(task)} disabled={readOnly && !onEdit}>
        <span className={`block ${dense ? 'line-clamp-2 text-[13px] leading-snug' : 'truncate text-[15px]'} ${done ? 'line-through' : ''}`}>{task.title}</span>
        {(task.nextAction || task.startAt) && !compact && (
          <span className="block truncate text-[12px] text-ink-3">{task.startAt ? `${task.startAt} · ` : ''}{task.nextAction}</span>
        )}
      </button>

      {!dense && <QuadrantChip q={task.quadrant} />}
      {minutes > 0 && <span className="shrink-0 text-[12px] tabular-nums text-ink-3">{minutes}′</span>}
      {task.isMain && showStar && <Star size={14} className="shrink-0 fill-accent text-accent" />}

      {!readOnly && !done && onFocus && (
        <button aria-label={t('row.focus')} className="shrink-0 rounded-lg p-1.5 text-ink-3 hover:bg-paper-3 hover:text-ink" onClick={() => onFocus(task)}>
          <Play size={16} />
        </button>
      )}
      {!readOnly && (
        <button aria-label="menu" className="shrink-0 rounded-lg p-1.5 text-ink-3 hover:bg-paper-3 hover:text-ink" onClick={() => setMenu((m) => !m)}>
          <MoreHorizontal size={16} />
        </button>
      )}

      {menu && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setMenu(false)} />
          <div className="absolute right-2 top-full z-30 mt-1 w-52 overflow-hidden rounded-xl bg-paper shadow-card ring-1 ring-line">
            {showStar && task.scheduledFor && !done && (
              <MenuItem onClick={() => void setMain(task.id, !task.isMain).then(() => setMenu(false))}>
                <Star size={14} />{task.isMain ? t('row.unstar') : t('row.star')}
              </MenuItem>
            )}
            {onEdit && <MenuItem onClick={() => { setMenu(false); onEdit(task) }}>{t('row.edit')}</MenuItem>}
            {task.scheduledFor !== addDays(today, 1) && (
              <MenuItem onClick={() => void scheduleTask(task.id, addDays(today, 1)).then(() => setMenu(false))}>{t('row.tomorrow')}</MenuItem>
            )}
            {task.scheduledFor && (
              <MenuItem onClick={() => void scheduleTask(task.id, undefined).then(() => setMenu(false))}>{t('row.backlog')}</MenuItem>
            )}
            <MenuItem danger onClick={() => void deleteTask(task.id).then(() => setMenu(false))}>{t('row.delete')}</MenuItem>
          </div>
        </>
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
