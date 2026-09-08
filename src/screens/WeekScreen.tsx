import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Button, Card, Input, Muted, Page, Stat } from '../components/ui'
import { fmtDate, useT } from '../i18n'
import { addGoal, deleteParking, goalsFor, resolveParking, setGoalStatus, SOFT_MAX_WEEK_GOALS as MAX_GOALS_PER_WEEK } from '../lib/actions'
import { weekKey } from '../lib/period'
import { db } from '../lib/db'
import { addDays, weekStart, type ISODate } from '../lib/dates'
import { computeWeekMetrics } from '../lib/metrics'
import type { Settings, WeekGoal } from '../lib/types'

function GoalSlots({ ws, label, today }: { ws: ISODate; label: string; today: ISODate }) {
  const { t, lang } = useT()
  const goals = useLiveQuery(() => goalsFor(weekKey(ws)), [ws], [])
  const open = goals.filter((g) => g.status === 'open')
  const closed = goals.filter((g) => g.status !== 'open')
  const [title, setTitle] = useState('')
  const [err, setErr] = useState('')
  const isCurrent = ws === weekStart(today)

  async function add() {
    if (!title.trim()) {
      setErr(t('week.goal.empty'))
      return
    }
    await addGoal({ horizon: 'week', periodKey: weekKey(ws), title, area: 'personal' })
    setTitle('')
    setErr('')
  }

  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xl">{label}</h2>
        <Muted>{fmtDate(lang, ws)} → {fmtDate(lang, addDays(ws, 6))}</Muted>
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {Array.from({ length: MAX_GOALS_PER_WEEK }).map((_, i) => {
          const g: WeekGoal | undefined = open[i]
          return (
            <li key={g?.id ?? `empty-${i}`} className={`rounded-xl border p-3 ${g ? 'border-line bg-paper/60' : 'border-dashed border-line text-ink-3'}`}>
              {g ? (
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium">{g.title}</span>
                  {isCurrent && (
                    <span className="flex shrink-0 gap-1">
                      <Button size="sm" variant="secondary" onClick={() => void setGoalStatus(g.id, 'done')}>{t('common.done')}</Button>
                      <Button size="sm" variant="ghost" onClick={() => void setGoalStatus(g.id, 'dropped')}>{t('common.drop')}</Button>
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-sm">{t('week.slotEmpty', { n: i + 1 })}</span>
              )}
            </li>
          )
        })}
      </ul>
      {open.length < MAX_GOALS_PER_WEEK && (
        <div className="mt-3">
          <div className="flex gap-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('week.goal.ph')} onKeyDown={(e) => e.key === 'Enter' && void add()} />
            <Button onClick={() => void add()}>{t('common.add')}</Button>
          </div>
          {err && <p className="mt-1 text-sm text-bad">{err}</p>}
        </div>
      )}
      {closed.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1">
          {closed.map((g) => (
            <li key={g.id} className="text-sm text-ink-3">{g.status === 'done' ? '✓' : '×'} {g.title}</li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function Review({ ws, today, settings, nowMs }: { ws: ISODate; today: ISODate; settings: Settings; nowMs: number }) {
  const { t } = useT()
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], [])
  const dayLogs = useLiveQuery(() => db.dayLogs.toArray(), [], [])
  const tasks = useLiveQuery(() => db.tasks.toArray(), [], [])
  const m = computeWeekMetrics({ weekStart: ws, today, sessions, dayLogs, tasks, settings, nowMs })
  const deferTotal = m.deferrals['new-info'] + m.deferrals.urgent + m.deferrals['dont-want']
  const bed = m.bedtimeDeltaMin

  return (
    <Card>
      <h2 className="font-display text-xl">{t('week.review')}</h2>
      <Muted>{t('week.review.hint', { n: m.daysCounted })}</Muted>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Stat label={t('week.m.focus', { n: settings.minFocusMin })} value={`${m.daysWithFocus}/${m.daysCounted}`} />
        <Stat label={t('week.m.done')} value={String(m.tasksDone)} />
        <Stat label={t('week.m.shutdown')} value={`${m.shutdownOnTime}/${m.daysCounted}`} note={t('week.m.shutdown.note', { n: m.daysClosed })} />
        <Stat
          label={t('week.m.bed')}
          value={bed === null ? '—' : `${bed > 0 ? '+' : ''}${bed}′`}
          note={bed === null ? t('week.m.bed.none') : bed > 0 ? t('week.m.bed.late') : t('week.m.bed.ok')}
        />
        <Stat label={t('week.m.returns')} value={String(m.returns)} note={t('week.m.returns.note')} />
        <Stat
          label={t('week.m.defer')}
          value={String(deferTotal)}
          note={deferTotal ? t('week.m.defer.note', { dw: m.deferrals['dont-want'], ur: m.deferrals.urgent, ni: m.deferrals['new-info'] }) : undefined}
        />
      </div>
    </Card>
  )
}

function LaterItems({ today }: { today: ISODate }) {
  const { t } = useT()
  const items = useLiveQuery(() => db.parking.where('resolution').equals('later').filter((p) => !p.deleted).toArray(), [], [])
  if (items.length === 0) return null
  return (
    <Card>
      <h2 className="font-display text-xl">{t('week.later', { n: items.length })}</h2>
      <Muted>{t('week.later.hint')}</Muted>
      <ul className="mt-3 flex flex-col gap-3">
        {items.map((p) => (
          <li key={p.id} className="rounded-xl bg-paper p-3 ring-1 ring-line">
            <p className="mb-2">{p.text}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => void resolveParking(p.id, 'tomorrow', today)}>{t('week.later.tomorrow')}</Button>
              <Button size="sm" variant="danger" onClick={() => void deleteParking(p.id)}>{t('common.delete')}</Button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export function WeekScreen({ today, settings, now }: { today: ISODate; settings: Settings; now: Date }) {
  const { t } = useT()
  const ws = weekStart(today)
  const [showPrev, setShowPrev] = useState(false)
  return (
    <Page title={t('week.title')} subtitle={t('week.subtitle')}>
      <GoalSlots ws={ws} label={t('week.this')} today={today} />
      <Review ws={showPrev ? addDays(ws, -7) : ws} today={today} settings={settings} nowMs={now.getTime()} />
      <Button variant="ghost" size="sm" onClick={() => setShowPrev((s) => !s)}>{showPrev ? t('week.cur') : t('week.prev')}</Button>
      <LaterItems today={today} />
      <GoalSlots ws={addDays(ws, 7)} label={t('week.next')} today={today} />
    </Page>
  )
}
