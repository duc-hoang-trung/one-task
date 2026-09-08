import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DragBoard, DragItem, DropZone } from '../../components/dnd/DragBoard'
import { MonthStats } from '../../components/MonthStats'
import { QuickAdd } from '../../components/QuickAdd'
import { TaskRow } from '../../components/TaskRow'
import { Button, Card, Col, Columns, Eyebrow, Muted } from '../../components/ui'
import { fmtDate, fmtMonth, useT, type Key } from '../../i18n'
import { monthGrid, monthOf, monthRange, relation, shiftMonth } from '../../lib/calendar'
import { byOrder, db } from '../../lib/db'
import { bedtimeDelta, type ISODate } from '../../lib/dates'
import { focusMinutesByDate } from '../../lib/metrics'
import { isShutdownOnTime } from '../../lib/phase'
import type { Area, Settings, Task } from '../../lib/types'
import { BacklogPanel } from './BacklogPanel'
import { handleDrop } from './drop'

type AreaFilter = Area | 'all'

/**
 * Tháng: lưới tháng (ô hôm nay/tương lai là vùng thả), chi tiết ngày chọn (dòng việc kéo được),
 * Backlog để kéo vào ngày, thống kê tháng.
 */
export function MonthView({ today, settings, now, onGoToday, onEdit }: {
  today: ISODate; settings: Settings; now: Date; onGoToday: () => void; onEdit: (t: Task) => void
}) {
  const { t, lang } = useT()
  const [{ year, month }, setYM] = useState(() => monthOf(today))
  const [selected, setSelected] = useState<ISODate | null>(null)
  const [area, setArea] = useState<AreaFilter>('all')
  const { from, to } = monthRange(year, month)

  const sessions = useLiveQuery(() => db.sessions.where('date').between(from, to, true, true).toArray(), [from, to], [])
  const dayLogs = useLiveQuery(() => db.dayLogs.where('date').between(from, to, true, true).toArray(), [from, to], [])
  const allTasks = useLiveQuery(
    () => db.tasks.where('scheduledFor').between(from, to, true, true).filter((x) => !x.deleted && x.status !== 'dropped').toArray(),
    [from, to], [],
  )
  const tasks = allTasks.filter((x) => area === 'all' || x.area === area)
  const focus = focusMinutesByDate(sessions, now.getTime())
  const logOf = (d: ISODate) => dayLogs.find((l) => l.date === d)
  const tasksOf = (d: ISODate) => tasks.filter((x) => x.scheduledFor === d).sort(byOrder)
  const doneOf = (d: ISODate) => tasksOf(d).filter((x) => x.status === 'done')

  const grid = monthGrid(year, month)
  const isThisMonth = monthOf(today).year === year && monthOf(today).month === month
  const selRel = selected ? relation(selected, today) : null

  function cellClass(d: ISODate): string {
    const rel = relation(d, today)
    const n = tasksOf(d).length
    const k = doneOf(d).length
    const base = 'relative flex aspect-square w-full flex-col items-center justify-center rounded-xl text-sm transition-colors'
    const sel = selected === d ? ' ring-2 ring-accent ring-offset-2 ring-offset-paper' : ''
    if (rel === 'today') return `${base} bg-ink text-paper font-semibold${sel}`
    if (rel === 'past') {
      if (n > 0 && k === n) return `${base} bg-accent text-white${sel}`
      if (k > 0 || (focus.get(d) ?? 0) >= settings.minFocusMin) return `${base} bg-accent-soft text-ink${sel}`
      return `${base} text-ink-2 hover:bg-paper-3/60${sel}`
    }
    return `${base} text-ink-2 hover:bg-paper-3/60${n > 0 ? ' ring-1 ring-accent/60' : ''}${sel}`
  }

  const overlay = (activeId: string) => {
    const id = activeId.replace(/^task:/, '')
    return <div className="rounded-xl bg-paper px-3 py-2 text-sm shadow-card ring-1 ring-accent">{allTasks.find((x) => x.id === id)?.title ?? '…'}</div>
  }

  return (
    <DragBoard onDrop={(a, z) => void handleDrop(a, z, { today, area: area === 'all' ? settings.defaultArea : area })} renderOverlay={overlay}>
      <Columns cols="5/7">
        <Col className="lg:sticky lg:top-6">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <Button variant="ghost" size="sm" aria-label="prev" onClick={() => { setYM(shiftMonth(year, month, -1)); setSelected(null) }}><ChevronLeft size={18} /></Button>
              <h2 className="font-display text-xl">{fmtMonth(lang, year, month)}</h2>
              <Button variant="ghost" size="sm" aria-label="next" onClick={() => { setYM(shiftMonth(year, month, 1)); setSelected(null) }}><ChevronRight size={18} /></Button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {[1, 2, 3, 4, 5, 6, 0].map((dow) => (
                <div key={dow} className="py-1 text-[11px] font-semibold uppercase tracking-wider text-ink-3">{t(`dowShort.${dow}` as Key)}</div>
              ))}
              {grid.flat().map((d, i) => {
                if (!d) return <div key={`e${i}`} />
                const log = logOf(d)
                const onTime = log?.shutdownAt && isShutdownOnTime(log.shutdownAt, settings.shutdownTime)
                const late = log?.bedtimeActual && bedtimeDelta(settings.bedtimeTarget, log.bedtimeActual) > 30
                const n = tasksOf(d).length
                const k = doneOf(d).length
                const past = relation(d, today) === 'past'
                return (
                  <DropZone key={d} id={d} disabled={past} className="rounded-xl" activeClassName="ring-2 ring-accent bg-accent-soft/60">
                    <button className={cellClass(d)} onClick={() => setSelected(d)}>
                      <span className="leading-none">{Number(d.slice(-2))}</span>
                      {n > 0 && <span className="mt-0.5 text-[9px] leading-none opacity-80">{k}/{n}</span>}
                      <span className="absolute bottom-1 flex gap-0.5">
                        {onTime && <span className="h-1 w-1 rounded-full bg-good" />}
                        {late && <span className="h-1 w-1 rounded-full bg-bad" />}
                      </span>
                    </button>
                  </DropZone>
                )
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-3">
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-accent" />{t('cal.legend.allDone')}</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-accent-soft ring-1 ring-line" />{t('cal.legend.focus')}</span>
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-good" />{t('cal.legend.closed')}</span>
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-bad" />{t('cal.legend.late')}</span>
            </div>
            <Muted className="mt-2">{t('cal.dropHint')}</Muted>
            {!isThisMonth && (
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setYM(monthOf(today)); setSelected(null) }}>{t('cal.goToday')}</Button>
            )}
          </Card>
        </Col>

        <Col>
          {selected && selRel && (
            <Card className="animate-rise">
              <div className="flex items-center justify-between">
                <Eyebrow>{fmtDate(lang, selected)}{selRel === 'today' ? ` · ${t('cal.today')}` : ''}</Eyebrow>
                {selRel === 'today' && <Button variant="ghost" size="sm" onClick={onGoToday}>{t('cal.goToday')}</Button>}
              </div>
              {tasksOf(selected).length > 0 ? (
                <ul className="mt-2 flex flex-col gap-1.5">
                  {tasksOf(selected).map((x) => (
                    <li key={x.id}>
                      <DragItem id={`task:${x.id}`} disabled={selRel === 'past' || x.status === 'done'}>
                        <TaskRow task={x} today={today} onEdit={onEdit} readOnly={selRel === 'past'} compact />
                      </DragItem>
                    </li>
                  ))}
                </ul>
              ) : (
                <Muted className="mt-2">{selRel === 'past' ? t('cal.detail.none') : t('cal.detail.noTask')}</Muted>
              )}
              {selRel !== 'past' && (
                <div className="mt-3"><QuickAdd key={selected} scheduledFor={selected} defaultArea={settings.defaultArea} /></div>
              )}
              {selRel === 'past' && (
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                  <div><p className="text-[11px] text-ink-3">{t('cal.detail.focus')}</p><p className="font-medium">{focus.get(selected) ?? 0}′</p></div>
                  <div><p className="text-[11px] text-ink-3">{t('cal.detail.shutdown')}</p><p className="font-medium">{logOf(selected)?.shutdownAt ?? '—'}</p></div>
                  <div><p className="text-[11px] text-ink-3">{t('cal.detail.bed')}</p><p className="font-medium">{logOf(selected)?.bedtimeActual ?? '—'}</p></div>
                </div>
              )}
            </Card>
          )}
          {!selected && <Muted className="px-1">{t('cal.pickDay')}</Muted>}
          <BacklogPanel defaultArea={settings.defaultArea} />
          <MonthStats year={year} month={month} today={today} settings={settings} tasks={tasks} focus={focus} dayLogs={dayLogs} area={area} onArea={setArea} />
        </Col>
      </Columns>
    </DragBoard>
  )
}
