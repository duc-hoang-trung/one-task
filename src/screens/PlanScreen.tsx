import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { ChevronLeft, ChevronRight, Inbox, Plus, X } from 'lucide-react'
import { DragBoard, DragItem, DropZone } from '../components/dnd/DragBoard'
import { QuadrantChip, quadrantTone } from '../components/QuadrantChip'
import { QuickAdd } from '../components/QuickAdd'
import { TaskRow } from '../components/TaskRow'
import { TaskSheet } from '../components/TaskSheet'
import { Button, Card, Eyebrow, Muted, Page } from '../components/ui'
import { fmtDate, useT } from '../i18n'
import { deleteParking, promoteToTask, scheduleTask, setQuadrant } from '../lib/actions'
import { backlogTasks, byOrder, db, isOpen } from '../lib/db'
import { addDays, weekDays, weekStart, type ISODate } from '../lib/dates'
import { periodLabel, weekKey } from '../lib/period'
import { QUADRANTS, type Area, type Quadrant, type Settings, type Task } from '../lib/types'

type Mode = 'matrix' | 'week'
type AreaFilter = Area | 'all'
const BACKLOG_NUDGE = 30

export function PlanScreen({ today, settings }: { today: ISODate; settings: Settings }) {
  const { t } = useT()
  const [mode, setMode] = useState<Mode>('matrix')
  const [editing, setEditing] = useState<Task | null>(null)
  const seg = (m: Mode, label: string) => (
    <button
      className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${mode === m ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-paper-3/60'}`}
      onClick={() => setMode(m)}
    >
      {label}
    </button>
  )
  return (
    <Page title={t('plan.title')} subtitle={t('plan.subtitle')}>
      <div className="flex gap-1 rounded-xl bg-paper-2/70 p-1 ring-1 ring-line">
        {seg('matrix', t('plan.matrix'))}
        {seg('week', t('plan.week'))}
      </div>
      {mode === 'matrix' ? (
        <MatrixView today={today} settings={settings} onEdit={setEditing} />
      ) : (
        <WeekBoard today={today} settings={settings} onEdit={setEditing} />
      )}
      {editing && <TaskSheet task={editing} today={today} onClose={() => setEditing(null)} />}
    </Page>
  )
}

// ---- Ma trận -----------------------------------------------------------------

function MatrixView({ today, settings, onEdit }: { today: ISODate; settings: Settings; onEdit: (t: Task) => void }) {
  const { t } = useT()
  const [area, setArea] = useState<AreaFilter>('all')
  const backlog = useLiveQuery(() => backlogTasks(), [], [])
  const inbox = useLiveQuery(() => db.parking.filter((p) => !p.deleted && p.resolution === undefined).toArray(), [], [])
  const visible = backlog.filter((x) => area === 'all' || x.area === area)
  const byQ = (q: Quadrant | undefined) => visible.filter((x) => x.quadrant === q)
  const tomorrow = addDays(today, 1)

  async function onDrop(activeId: string, zoneId: string) {
    const [kind, id] = activeId.split(':')
    if (kind === 'task') {
      if (QUADRANTS.includes(zoneId as Quadrant)) await setQuadrant(id, zoneId as Quadrant)
      else if (zoneId === 'unsorted') await setQuadrant(id, undefined)
      else if (zoneId === 'today') await scheduleTask(id, today)
      else if (zoneId === 'tomorrow') await scheduleTask(id, tomorrow)
    } else if (kind === 'park') {
      if (QUADRANTS.includes(zoneId as Quadrant) || zoneId === 'unsorted') {
        await promoteToTask(id, { area: area === 'all' ? settings.defaultArea : area, quadrant: QUADRANTS.includes(zoneId as Quadrant) ? (zoneId as Quadrant) : undefined })
      } else if (zoneId === 'today' || zoneId === 'tomorrow') {
        await promoteToTask(id, { area: area === 'all' ? settings.defaultArea : area, scheduledFor: zoneId === 'today' ? today : tomorrow })
      }
    }
  }

  const overlay = (activeId: string) => {
    const [kind, id] = activeId.split(':')
    const label = kind === 'task' ? backlog.find((x) => x.id === id)?.title : inbox.find((p) => p.id === id)?.text
    return <div className="rounded-xl bg-paper px-3 py-2 text-sm shadow-card ring-1 ring-accent">{label}</div>
  }

  const Cell = ({ q }: { q: Quadrant }) => {
    const items = byQ(q)
    return (
      <DropZone id={q} className={`flex min-h-28 flex-col rounded-2xl p-2.5 ring-1 ring-line transition-colors ${q === 'q1' ? 'bg-bad/5' : q === 'q2' ? 'bg-accent-soft/40' : 'bg-paper-2/60'}`}>
        <div className="mb-1.5 flex items-baseline justify-between gap-1">
          <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${quadrantTone[q]}`}>{q.toUpperCase()} · {t(`q.${q}`)}</span>
          <span className="text-[11px] text-ink-3">{items.length}</span>
        </div>
        <p className="mb-1.5 text-[11px] text-ink-3">{t(`q.${q}.hint`)}</p>
        <ul className="flex flex-col gap-1">
          {items.map((x) => (
            <li key={x.id}>
              <DragItem id={`task:${x.id}`}>
                <TaskRow task={x} today={today} onEdit={onEdit} showStar={false} compact />
              </DragItem>
            </li>
          ))}
        </ul>
      </DropZone>
    )
  }

  return (
    <DragBoard onDrop={(a, z) => void onDrop(a, z)} renderOverlay={overlay}>
      <div className="flex gap-1">
        {(['all', 'work', 'personal'] as AreaFilter[]).map((a) => (
          <button key={a} className={`rounded-full px-3 py-1 text-xs font-medium ${area === a ? 'bg-ink text-paper' : 'bg-paper-3/70 text-ink-2'}`} onClick={() => setArea(a)}>
            {a === 'all' ? t('plan.all') : t(`area.${a}`)}
          </button>
        ))}
        <span className="flex-1" />
        <Muted className="self-center">{visible.length} {t('plan.inBacklog')}</Muted>
      </div>

      {inbox.length > 0 && (
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
      )}

      {backlog.length > BACKLOG_NUDGE && <Card tone="accent"><p className="text-sm text-ink-2">{t('plan.nudge', { n: backlog.length })}</p></Card>}

      <div className="grid grid-cols-2 gap-2">
        <Cell q="q1" /><Cell q="q2" /><Cell q="q3" /><Cell q="q4" />
      </div>

      {byQ(undefined).length > 0 && (
        <DropZone id="unsorted" className="rounded-2xl bg-paper-2/40 p-2.5 ring-1 ring-dashed ring-line">
          <Eyebrow className="mb-1.5">{t('q.none')} · {byQ(undefined).length}</Eyebrow>
          <ul className="flex flex-col gap-1">
            {byQ(undefined).map((x) => (
              <li key={x.id}><DragItem id={`task:${x.id}`}><TaskRow task={x} today={today} onEdit={onEdit} showStar={false} compact /></DragItem></li>
            ))}
          </ul>
        </DropZone>
      )}

      <div className="grid grid-cols-2 gap-2">
        <DropZone id="today" className="rounded-xl border border-dashed border-line p-3 text-center text-sm text-ink-2">{t('plan.dropToday')}</DropZone>
        <DropZone id="tomorrow" className="rounded-xl border border-dashed border-line p-3 text-center text-sm text-ink-2">{t('plan.dropTomorrow')}</DropZone>
      </div>

      <Card className="py-3">
        <Eyebrow className="mb-2">{t('plan.addBacklog')}</Eyebrow>
        <QuickAdd defaultArea={area === 'all' ? settings.defaultArea : area} />
      </Card>
    </DragBoard>
  )
}

// ---- Tuần --------------------------------------------------------------------

function WeekBoard({ today, settings, onEdit }: { today: ISODate; settings: Settings; onEdit: (t: Task) => void }) {
  const { t, lang } = useT()
  const [ws, setWs] = useState(weekStart(today))
  const [adding, setAdding] = useState<ISODate | null>(null)
  const days = weekDays(ws)
  const tasks = useLiveQuery(
    () => db.tasks.where('scheduledFor').between(days[0], days[6], true, true).filter((x) => !x.deleted && x.status !== 'dropped').toArray(),
    [ws], [],
  )
  const backlog = useLiveQuery(() => backlogTasks(), [], [])

  async function onDrop(activeId: string, zoneId: string) {
    const id = activeId.replace(/^task:/, '')
    if (zoneId === 'backlog') await scheduleTask(id, undefined)
    else if (zoneId >= today) await scheduleTask(id, zoneId)
  }
  const overlay = (activeId: string) => {
    const id = activeId.replace(/^task:/, '')
    const x = tasks.find((y) => y.id === id) ?? backlog.find((y) => y.id === id)
    return <div className="rounded-xl bg-paper px-3 py-2 text-sm shadow-card ring-1 ring-accent">{x?.title}</div>
  }

  return (
    <DragBoard onDrop={(a, z) => void onDrop(a, z)} renderOverlay={overlay}>
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setWs(addDays(ws, -7))}><ChevronLeft size={16} /></Button>
        <span className="font-display text-lg">{periodLabel(weekKey(ws), lang)}</span>
        <Button variant="ghost" size="sm" onClick={() => setWs(addDays(ws, 7))}><ChevronRight size={16} /></Button>
      </div>

      {days.map((d) => {
        const list = tasks.filter((x) => x.scheduledFor === d).sort(byOrder)
        const past = d < today
        const doneN = list.filter((x) => x.status === 'done').length
        return (
          <DropZone key={d} id={d} className={`rounded-2xl p-3 ring-1 ring-line ${d === today ? 'bg-accent-soft/40' : 'bg-paper-2/60'} ${past ? 'opacity-70' : ''}`} activeClassName={past ? '' : 'ring-2 ring-accent/60'}>
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
                <button className="mt-1.5 flex items-center gap-1 text-xs text-ink-3 hover:text-ink" onClick={() => setAdding(d)}><Plus size={12} />{t('common.add')}</button>
              )
            )}
          </DropZone>
        )
      })}

      <DropZone id="backlog" className="rounded-2xl border border-dashed border-line p-3">
        <Eyebrow className="mb-1.5">{t('plan.backlogZone', { n: backlog.length })}</Eyebrow>
        <ul className="flex flex-col gap-1">
          {backlog.filter(isOpen).slice(0, 8).map((x) => (
            <li key={x.id}>
              <DragItem id={`task:${x.id}`}>
                <div className="flex items-center gap-2 rounded-lg bg-paper/70 px-2 py-1.5 text-sm ring-1 ring-line"><QuadrantChip q={x.quadrant} /><span className="truncate">{x.title}</span></div>
              </DragItem>
            </li>
          ))}
        </ul>
        {backlog.length > 8 && <Muted className="mt-1">+{backlog.length - 8} …</Muted>}
      </DropZone>
    </DragBoard>
  )
}
