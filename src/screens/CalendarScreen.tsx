import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { TaskForm } from '../components/TaskForm'
import { Button, Card, Eyebrow, Muted, Page } from '../components/ui'
import { fmtDate, fmtMonth, useT, type Key } from '../i18n'
import { dropTask } from '../lib/actions'
import { monthGrid, monthOf, monthRange, relation, shiftMonth } from '../lib/calendar'
import { db } from '../lib/db'
import { bedtimeDelta, type ISODate } from '../lib/dates'
import { focusMinutesByDate } from '../lib/metrics'
import { isShutdownOnTime } from '../lib/phase'
import type { Settings } from '../lib/types'

/**
 * Lịch tháng. Quá khứ: chỉ đọc (heatmap có làm / đóng ngày đúng giờ / ngủ muộn).
 * Tương lai ≤ 14 ngày: đặt đúng 1 việc chính cho ngày đó. Xa hơn: gợi ý Parking Lot.
 */
export function CalendarScreen({ today, settings, now, onGoToday }: { today: ISODate; settings: Settings; now: Date; onGoToday: () => void }) {
  const { t, lang } = useT()
  const [{ year, month }, setYM] = useState(() => monthOf(today))
  const [selected, setSelected] = useState<ISODate | null>(null)
  const { from, to } = monthRange(year, month)

  const sessions = useLiveQuery(() => db.sessions.where('date').between(from, to, true, true).toArray(), [from, to], [])
  const dayLogs = useLiveQuery(() => db.dayLogs.where('date').between(from, to, true, true).toArray(), [from, to], [])
  const tasks = useLiveQuery(() => db.tasks.where('scheduledFor').between(from, to, true, true).filter((x) => !x.deleted).toArray(), [from, to], [])

  const focus = focusMinutesByDate(sessions, now.getTime())
  const logOf = (d: ISODate) => dayLogs.find((l) => l.date === d)
  const plannedOf = (d: ISODate) => tasks.find((x) => x.scheduledFor === d && (x.status === 'planned' || x.status === 'active'))
  const doneOf = (d: ISODate) => tasks.find((x) => x.scheduledFor === d && x.status === 'done')

  const grid = monthGrid(year, month)
  const isThisMonth = monthOf(today).year === year && monthOf(today).month === month

  function cellClass(d: ISODate): string {
    const rel = relation(d, today)
    const f = focus.get(d) ?? 0
    const worked = f >= settings.minFocusMin
    const base = 'relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition-colors'
    const sel = selected === d ? ' ring-2 ring-accent ring-offset-2 ring-offset-paper' : ''
    if (rel === 'today') return `${base} bg-ink text-paper font-semibold${sel}`
    if (rel === 'past') {
      if (worked) return `${base} ${f >= settings.minFocusMin * 3 ? 'bg-accent text-white' : 'bg-accent-soft text-ink'}${sel}`
      return `${base} text-ink-2 hover:bg-paper-3/60${sel}`
    }
    return `${base} ${rel === 'too-far' ? 'text-ink-3/60' : 'text-ink-2 hover:bg-paper-3/60'}${plannedOf(d) ? ' ring-1 ring-accent/60' : ''}${sel}`
  }

  const selRel = selected ? relation(selected, today) : null

  return (
    <Page title={t('cal.title')} subtitle={t('cal.subtitle')}>
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
          {grid.flat().map((d, i) =>
            d ? (
              <button key={d} className={cellClass(d)} onClick={() => setSelected(d)}>
                {Number(d.slice(-2))}
                {(() => {
                  const log = logOf(d)
                  const onTime = log?.shutdownAt && isShutdownOnTime(log.shutdownAt, settings.shutdownTime)
                  const late = log?.bedtimeActual && bedtimeDelta(settings.bedtimeTarget, log.bedtimeActual) > 30
                  return (
                    <span className="absolute bottom-1 flex gap-0.5">
                      {onTime && <span className="h-1 w-1 rounded-full bg-good" />}
                      {late && <span className="h-1 w-1 rounded-full bg-bad" />}
                    </span>
                  )
                })()}
              </button>
            ) : (
              <div key={`e${i}`} />
            ),
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-3">
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-accent-soft ring-1 ring-line" />{t('cal.legend.focus')}</span>
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-good" />{t('cal.legend.closed')}</span>
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-bad" />{t('cal.legend.late')}</span>
        </div>
        {!isThisMonth && (
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setYM(monthOf(today)); setSelected(null) }}>{t('cal.goToday')}</Button>
        )}
      </Card>

      {selected && selRel && (
        <Card className="animate-rise">
          <Eyebrow>{fmtDate(lang, selected)}</Eyebrow>
          {selRel === 'today' ? (
            <Button className="mt-3 w-full" onClick={onGoToday}>{t('cal.goToday')}</Button>
          ) : selRel === 'past' ? (
            <PastDetail
              focusMin={focus.get(selected) ?? 0}
              task={plannedOf(selected)?.title ?? doneOf(selected)?.title}
              taskDone={!!doneOf(selected)}
              log={logOf(selected)}
            />
          ) : selRel === 'too-far' ? (
            <p className="mt-2 text-ink-2">{t('cal.future.tooFar')}</p>
          ) : plannedOf(selected) ? (
            <div className="mt-2">
              <Muted>{t('cal.future.planned')}</Muted>
              <p className="font-display mt-1 text-xl">{plannedOf(selected)!.title}</p>
              {plannedOf(selected)!.nextAction && <p className="text-ink-2">{plannedOf(selected)!.nextAction}</p>}
              <Button variant="danger" size="sm" className="mt-3" onClick={() => void dropTask(plannedOf(selected)!.id, 'dropped from calendar', today)}>{t('common.drop')}</Button>
            </div>
          ) : (
            <div className="mt-3">
              <TaskForm key={selected} scheduledFor={selected} heading={t('cal.future.set')} compact onCreated={() => undefined} />
            </div>
          )}
        </Card>
      )}
    </Page>
  )
}

function PastDetail({ focusMin, task, taskDone, log }: { focusMin: number; task?: string; taskDone: boolean; log?: { shutdownAt?: string; bedtimeActual?: string } }) {
  const { t } = useT()
  const empty = !task && focusMin === 0 && !log?.shutdownAt
  if (empty) return <p className="mt-2 text-ink-2">{t('cal.detail.none')}</p>
  const Row = ({ k, v }: { k: string; v: string }) => (
    <div className="flex items-baseline justify-between border-b border-line py-2 last:border-0">
      <span className="text-ink-3">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  )
  return (
    <div className="mt-2">
      <Row k={t('cal.detail.task')} v={task ? `${taskDone ? '✓ ' : ''}${task}` : t('cal.detail.noTask')} />
      <Row k={t('cal.detail.focus')} v={`${focusMin}′`} />
      <Row k={t('cal.detail.shutdown')} v={log?.shutdownAt ?? '—'} />
      <Row k={t('cal.detail.bed')} v={log?.bedtimeActual ?? '—'} />
    </div>
  )
}
