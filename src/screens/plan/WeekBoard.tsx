import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { DragBoard, DragItem, DropZone } from '../../components/dnd/DragBoard'
import { QuickAdd } from '../../components/QuickAdd'
import { TaskRow } from '../../components/TaskRow'
import { Button } from '../../components/ui'
import { fmtDate, useT } from '../../i18n'
import { backlogTasks, byOrder, db } from '../../lib/db'
import { addDays, weekDays, weekStart, type ISODate } from '../../lib/dates'
import { periodLabel, weekKey } from '../../lib/period'
import type { Settings, Task } from '../../lib/types'
import { BacklogPanel } from './BacklogPanel'
import { handleDrop } from './drop'

// ---- Tuần --------------------------------------------------------------------

export function WeekBoard({ today, settings, onEdit }: { today: ISODate; settings: Settings; onEdit: (t: Task) => void }) {
  const { t, lang } = useT()
  const [ws, setWs] = useState(weekStart(today))
  const [adding, setAdding] = useState<ISODate | null>(null)
  const days = weekDays(ws)
  const tasks = useLiveQuery(
    () => db.tasks.where('scheduledFor').between(days[0], days[6], true, true).filter((x) => !x.deleted && x.status !== 'dropped').toArray(),
    [ws], [],
  )
  const backlog = useLiveQuery(() => backlogTasks(), [], [])

  const onDrop = (a: string, z: string) => void handleDrop(a, z, { today, area: settings.defaultArea })
  const overlay = (activeId: string) => {
    const id = activeId.replace(/^task:/, '')
    const x = tasks.find((y) => y.id === id) ?? backlog.find((y) => y.id === id)
    return <div className="rounded-xl bg-paper px-3 py-2 text-sm shadow-card ring-1 ring-accent">{x?.title}</div>
  }

  return (
    <DragBoard onDrop={onDrop} renderOverlay={overlay}>
      <div className="flex items-center justify-between lg:justify-start lg:gap-2">
        <Button variant="ghost" size="sm" onClick={() => setWs(addDays(ws, -7))}><ChevronLeft size={16} /></Button>
        <span className="font-display text-lg">{periodLabel(weekKey(ws), lang)}</span>
        <Button variant="ghost" size="sm" onClick={() => setWs(addDays(ws, 7))}><ChevronRight size={16} /></Button>
      </div>

      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4 lg:gap-3">
        {days.map((d) => {
          const list = tasks.filter((x) => x.scheduledFor === d).sort(byOrder)
          const past = d < today
          const doneN = list.filter((x) => x.status === 'done').length
          return (
            <DropZone key={d} id={d} disabled={past} className={`flex min-h-24 flex-col rounded-2xl p-3 ring-1 ring-line lg:min-h-40 ${d === today ? 'bg-accent-soft/40' : 'bg-paper-2/60'} ${past ? 'opacity-70' : ''}`} activeClassName={past ? '' : 'ring-2 ring-accent/60'}>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className={`text-sm font-semibold ${d === today ? 'text-accent' : ''}`}>{fmtDate(lang, d)}{d === today ? ` · ${t('cal.today')}` : ''}</span>
                <span className="text-[11px] text-ink-3">{list.length ? `${doneN}/${list.length}` : ''}</span>
              </div>
              <ul className="flex flex-col gap-1">
                {list.map((x) => (
                  <li key={x.id}>
                    <DragItem id={`task:${x.id}`} disabled={past || x.status === 'done'}>
                      <TaskRow task={x} today={today} onEdit={onEdit} compact readOnly={past} />
                    </DragItem>
                  </li>
                ))}
              </ul>
              {!past && (
                adding === d ? (
                  <div className="mt-2"><QuickAdd scheduledFor={d} defaultArea={settings.defaultArea} onCreated={() => setAdding(null)} /></div>
                ) : (
                  <button className="mt-auto flex items-center gap-1 pt-1.5 text-xs text-ink-3 hover:text-ink" onClick={() => setAdding(d)}><Plus size={12} />{t('common.add')}</button>
                )
              )}
            </DropZone>
          )
        })}

        <BacklogPanel defaultArea={settings.defaultArea} />
      </div>
    </DragBoard>
  )
}
