import { Clock } from 'lucide-react'
import { useState } from 'react'
import { useT } from '../i18n'
import { addTimeLog } from '../lib/actions'
import type { ISODate } from '../lib/dates'
import type { Task } from '../lib/types'
import { Button, Input, Modal, Muted } from './ui'

const PRESETS = [15, 30, 45, 60]
const MAX_MIN = 24 * 60

/** Mặc định: số phút đồng hồ đã đo hôm nay (nếu có) → ước lượng → 30. */
export function defaultLogMin(task: Pick<Task, 'estimateMin'>, tracked: number): number {
  if (tracked > 0) return tracked
  if (task.estimateMin && task.estimateMin > 0) return task.estimateMin
  return 30
}

/**
 * Hộp ghi giờ, mở ngay sau khi đánh xong một việc (việc đã xong rồi; hộp này chỉ để ghi timesheet).
 * Bỏ qua được bằng một chạm; Enter ghi luôn.
 */
export function LogTimeModal({ task, date, tracked = 0, onClose }: {
  task: Task
  date: ISODate
  /** Phút đồng hồ đã đo cho việc này trong ngày, để gợi ý làm chip đầu. */
  tracked?: number
  onClose: () => void
}) {
  const { t } = useT()
  const [min, setMin] = useState(() => defaultLogMin(task, tracked))
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const chips = [...new Set([tracked > 0 ? tracked : 0, ...PRESETS])].filter((n) => n > 0)

  async function save() {
    if (busy || !(min > 0)) return
    setBusy(true)
    await addTimeLog(task.id, date, Math.min(MAX_MIN, min), note)
    onClose()
  }

  return (
    <Modal onClose={onClose}>
      <form noValidate className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); void save() }} data-testid="logtime">
        <Muted className="flex items-center gap-1.5"><Clock size={14} />{t('time.log.title')}</Muted>
        <h2 className="font-display text-[22px] leading-snug">{task.title}</h2>
        <p className="text-sm font-medium text-ink-2">{t('time.log.q')}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((n) => (
            <button
              key={n} type="button"
              className={`rounded-full px-3 py-1 text-[13px] font-medium tabular-nums transition-colors ${min === n ? 'bg-ink text-paper' : 'bg-paper-3/70 text-ink-2 hover:bg-paper-3'}`}
              onClick={() => setMin(n)}
            >
              {n}′{n === tracked ? ` · ${t('time.log.timed')}` : ''}
            </button>
          ))}
          <span className="inline-flex items-center gap-1 rounded-full bg-paper-3/70 px-2 py-0.5 text-ink-2">
            <input
              type="number" inputMode="numeric" min={1} max={MAX_MIN} aria-label={t('common.min')}
              className="w-14 bg-transparent text-center text-[13px] tabular-nums focus:outline-none"
              value={min} onChange={(e) => setMin(Number(e.target.value))}
            />
            <span className="text-[11px]">{t('common.min')}</span>
          </span>
        </div>
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('time.log.note.ph')} />
        <Muted className="text-[12px]">{t('time.log.hint')}</Muted>
        <div className="mt-1 flex gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>{t('time.log.skip')}</Button>
          <Button type="submit" className="flex-1" disabled={!(min > 0) || busy}>{t('time.log.save', { n: min })}</Button>
        </div>
      </form>
    </Modal>
  )
}
