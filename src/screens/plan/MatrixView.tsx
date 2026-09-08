import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Inbox, X } from 'lucide-react'
import { DragBoard, DragItem, DropZone } from '../../components/dnd/DragBoard'
import { quadrantTone } from '../../components/QuadrantChip'
import { QuickAdd } from '../../components/QuickAdd'
import { TaskRow } from '../../components/TaskRow'
import { Card, Eyebrow, Muted } from '../../components/ui'
import { useT } from '../../i18n'
import { deleteParking, promoteToTask } from '../../lib/actions'
import { backlogTasks, db } from '../../lib/db'
import type { ISODate } from '../../lib/dates'
import { QUADRANTS, type Area, type Quadrant, type Settings, type Task } from '../../lib/types'
import { handleDrop } from './drop'

type AreaFilter = Area | 'all'
const BACKLOG_NUDGE = 30

// ---- Ma trận -----------------------------------------------------------------

export function MatrixView({ today, settings, onEdit }: { today: ISODate; settings: Settings; onEdit: (t: Task) => void }) {
  const { t } = useT()
  const [area, setArea] = useState<AreaFilter>('all')
  const backlog = useLiveQuery(() => backlogTasks(), [], [])
  // Inbox = ý chưa xử lý + ý 'để cuối tuần' chưa thành việc
  const inbox = useLiveQuery(() => db.parking.filter((p) => !p.deleted && !p.promotedTaskId && (p.resolution === undefined || p.resolution === 'later')).toArray(), [], [])
  const visible = backlog.filter((x) => area === 'all' || x.area === area)
  const byQ = (q: Quadrant | undefined) => visible.filter((x) => x.quadrant === q)

  const onDrop = (a: string, z: string) => void handleDrop(a, z, { today, area: area === 'all' ? settings.defaultArea : area })

  const overlay = (activeId: string) => {
    const [kind, id] = activeId.split(':')
    const label = kind === 'task' ? backlog.find((x) => x.id === id)?.title : inbox.find((p) => p.id === id)?.text
    return <div className="rounded-xl bg-paper px-3 py-2 text-sm shadow-card ring-1 ring-accent">{label}</div>
  }

  const Cell = ({ q }: { q: Quadrant }) => {
    const items = byQ(q)
    return (
      <DropZone id={q} className={`flex min-h-28 flex-col rounded-2xl p-2.5 ring-1 ring-line transition-colors lg:min-h-48 lg:p-3 ${q === 'q1' ? 'bg-bad/5' : q === 'q2' ? 'bg-accent-soft/40' : 'bg-paper-2/60'}`}>
        <div className="mb-1.5 flex items-baseline justify-between gap-1">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${quadrantTone[q]}`}>{q.toUpperCase()}</span>
            <span className="truncate text-[11px] font-semibold text-ink-2">{t(`q.${q}`)}</span>
          </span>
          <span className="text-[11px] text-ink-3">{items.length}</span>
        </div>
        <p className="mb-1.5 text-[11px] text-ink-3">{t(`q.${q}.hint`)}</p>
        <ul className="flex flex-col gap-1">
          {items.map((x) => (
            <li key={x.id}>
              <DragItem id={`task:${x.id}`}>
                <TaskRow task={x} today={today} onEdit={onEdit} showStar={false} dense />
              </DragItem>
            </li>
          ))}
        </ul>
      </DropZone>
    )
  }

  const filter = (
    <div className="flex gap-1">
      {(['all', 'work', 'personal'] as AreaFilter[]).map((a) => (
        <button key={a} className={`rounded-full px-3 py-1 text-xs font-medium ${area === a ? 'bg-ink text-paper' : 'bg-paper-3/70 text-ink-2'}`} onClick={() => setArea(a)}>
          {a === 'all' ? t('plan.all') : t(`area.${a}`)}
        </button>
      ))}
      <span className="flex-1" />
      <Muted className="self-center">{visible.length} {t('plan.inBacklog')}</Muted>
    </div>
  )
  const inboxCard = inbox.length > 0 && (
    <Card className="py-3">
      <Eyebrow className="mb-2 flex items-center gap-1"><Inbox size={12} />{t('plan.inbox', { n: inbox.length })}</Eyebrow>
      <Muted className="mb-2">{t('plan.inbox.hint')}</Muted>
      <ul className="flex flex-col gap-1.5">
        {inbox.map((p) => (
          <li key={p.id} className="flex items-center gap-2 rounded-xl bg-paper/70 px-2 py-1.5 ring-1 ring-line">
            <DragItem id={`park:${p.id}`} className="min-w-0 flex-1 cursor-grab">
              <span className="block truncate text-[14px]">{p.text}</span>
            </DragItem>
            <span className="flex shrink-0 gap-0.5">
              {QUADRANTS.map((q) => (
                <button key={q} className={`rounded px-1 text-[10px] font-semibold ${quadrantTone[q]}`} onClick={() => void promoteToTask(p.id, { area: area === 'all' ? settings.defaultArea : area, quadrant: q })}>
                  {q.toUpperCase()}
                </button>
              ))}
            </span>
            <button aria-label={t('common.delete')} className="shrink-0 rounded p-1 text-ink-3 hover:text-bad" onClick={() => void deleteParking(p.id)}><X size={14} /></button>
          </li>
        ))}
      </ul>
    </Card>
  )
  const addCard = (
    <Card className="py-3">
      <Eyebrow className="mb-2">{t('plan.addBacklog')}</Eyebrow>
      <QuickAdd defaultArea={area === 'all' ? settings.defaultArea : area} placeholder={t('plan.addBacklog.ph')} />
    </Card>
  )

  return (
    <DragBoard onDrop={onDrop} renderOverlay={overlay}>
      {/* Điện thoại: một cột theo order-*; màn rộng: ma trận trái, thêm/inbox phải (sticky). */}
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start lg:gap-6">
        <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-4">
          <div className="order-1 lg:order-none">{filter}</div>
          {backlog.length > BACKLOG_NUDGE && <Card tone="accent" className="order-2 lg:order-none"><p className="text-sm text-ink-2">{t('plan.nudge', { n: backlog.length })}</p></Card>}

          <div className="order-4 grid grid-cols-2 gap-2 lg:order-none lg:gap-3">
            <Cell q="q1" /><Cell q="q2" /><Cell q="q3" /><Cell q="q4" />
          </div>

          {byQ(undefined).length > 0 && (
            <DropZone id="unsorted" className="order-5 rounded-2xl bg-paper-2/40 p-2.5 ring-1 ring-dashed ring-line lg:order-none">
              <Eyebrow className="mb-1.5">{t('q.none')} · {byQ(undefined).length}</Eyebrow>
              <ul className="flex flex-col gap-1">
                {byQ(undefined).map((x) => (
                  <li key={x.id}><DragItem id={`task:${x.id}`}><TaskRow task={x} today={today} onEdit={onEdit} showStar={false} compact /></DragItem></li>
                ))}
              </ul>
            </DropZone>
          )}

          <div className="order-6 grid grid-cols-2 gap-2 lg:order-none">
            <DropZone id="today" className="rounded-xl border border-dashed border-line p-3 text-center text-xs text-ink-2 sm:text-sm">{t('plan.dropToday')}</DropZone>
            <DropZone id="tomorrow" className="rounded-xl border border-dashed border-line p-3 text-center text-xs text-ink-2 sm:text-sm">{t('plan.dropTomorrow')}</DropZone>
          </div>
        </div>
        <div className="contents lg:sticky lg:top-6 lg:flex lg:min-w-0 lg:flex-col lg:gap-4">
          <div className="order-7 lg:order-none">{addCard}</div>
          {inboxCard && <div className="order-3 lg:order-none">{inboxCard}</div>}
        </div>
      </div>
    </DragBoard>
  )
}

