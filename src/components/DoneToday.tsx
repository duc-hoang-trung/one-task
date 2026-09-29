import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Check, ChevronDown, ChevronRight } from 'lucide-react'
import { SlotIcon } from './missionSlot'
import { TaskRow } from './TaskRow'
import { fmtDate, useT } from '../i18n'
import { doneToday, missionSlot } from '../lib/actions'
import type { ISODate } from '../lib/dates'
import type { Task } from '../lib/types'

/**
 * "Hôm nay đã xong": việc + nhiệm vụ hằng ngày trong cùng một chỗ.
 * Việc tính theo NGÀY ĐÁNH XONG, nên việc lấy thẳng từ Backlog hay việc của ngày khác mà
 * hôm nay mới tick đều hiện ở đây — mục cũ chỉ lọc theo ngày đã lên lịch nên bỏ sót.
 */
export function DoneToday({ today, minutesOf, onEdit }: {
  today: ISODate
  minutesOf: Map<string, number>
  onEdit?: (t: Task) => void
}) {
  const { t, lang } = useT()
  const [open, setOpen] = useState(false)
  const data = useLiveQuery(() => doneToday(today), [today], { tasks: [], missions: [] })
  const n = data.tasks.length + data.missions.length
  if (n === 0) return null

  const min = data.tasks.reduce((sum, x) => sum + (minutesOf.get(x.id) ?? 0), 0)

  return (
    <div className="mt-3" data-testid="done-today">
      <button className="flex w-full items-center gap-1 text-[12px] font-semibold uppercase tracking-wide text-ink-3" onClick={() => setOpen((s) => !s)}>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {t('today.doneSection', { n })}
        {min > 0 && <span className="ml-auto font-normal tabular-nums">{min}′</span>}
      </button>
      {open && (
        <div className="mt-1.5 flex flex-col gap-2">
          {data.tasks.length > 0 && (
            <ul className="flex flex-col gap-1">
              {data.tasks.map((x) => (
                <li key={x.id}>
                  <TaskRow task={x} today={today} minutes={minutesOf.get(x.id) ?? 0} onEdit={onEdit} compact />
                  {/* Việc lên lịch ngày khác mà hôm nay mới xong: nói rõ để khỏi tưởng nhầm */}
                  {x.scheduledFor && x.scheduledFor !== today && (
                    <span className="block pl-9 text-[11px] text-ink-3">{t('today.doneElsewhere', { d: fmtDate(lang, x.scheduledFor) })}</span>
                  )}
                  {!x.scheduledFor && <span className="block pl-9 text-[11px] text-ink-3">{t('today.doneFromBacklog')}</span>}
                </li>
              ))}
            </ul>
          )}
          {data.missions.length > 0 && (
            <ul className="flex flex-col gap-1 border-t border-line pt-2">
              {data.missions.map((m) => (
                <li key={m.id} className="flex items-center gap-2 px-2 text-[14px] text-ink-3">
                  <Check size={14} className="shrink-0 text-good" />
                  <SlotIcon slot={missionSlot(m)} size={11} />
                  <span className="min-w-0 flex-1 truncate line-through">{m.title}</span>
                  {m.estimateMin && <span className="shrink-0 tabular-nums">{m.estimateMin}′</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
