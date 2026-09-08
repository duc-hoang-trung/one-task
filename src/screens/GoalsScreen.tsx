import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { ChevronLeft, ChevronRight, Flag } from 'lucide-react'
import { Button, Card, Columns, Eyebrow, Input, Muted, Page, Stat } from '../components/ui'
import { useT } from '../i18n'
import { addGoal, checkinGoal, goalsFor, setGoalStatus, SOFT_MAX_WEEK_GOALS } from '../lib/actions'
import { db } from '../lib/db'
import { type ISODate } from '../lib/dates'
import { computeWeekMetrics } from '../lib/metrics'
import { keyFor, parentKey, periodLabel, periodRange, shiftPeriod, type Horizon } from '../lib/period'
import type { Area, CheckinState, Goal, Settings, Task } from '../lib/types'

const stateTone: Record<CheckinState, string> = {
  'on-track': 'bg-good/15 text-good',
  behind: 'bg-accent-soft text-accent',
  blocked: 'bg-bad/12 text-bad',
}

function GoalCard({ g, tasks, parents, today }: { g: Goal; tasks: Task[]; parents: Goal[]; today: ISODate }) {
  const { t } = useT()
  const [checking, setChecking] = useState(false)
  const [state, setState] = useState<CheckinState>('on-track')
  const [note, setNote] = useState('')
  const linked = tasks.filter((x) => x.goalId === g.id && !x.deleted && x.status !== 'dropped')
  const done = linked.filter((x) => x.status === 'done').length
  const last = g.checkins?.at(-1)
  const parent = parents.find((p) => p.id === g.parentId)
  const { to } = periodRange(g.periodKey)
  const stale = g.status === 'open' && (!last || today > to || (Date.now() - last.at) > 7 * 86_400_000)

  async function save() {
    await checkinGoal(g.id, state, note)
    setChecking(false)
    setNote('')
  }

  return (
    <li className={`rounded-xl bg-paper/70 p-3 ring-1 ring-line ${g.status !== 'open' ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`font-medium ${g.status === 'done' ? 'line-through' : ''}`}>{g.title}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-3">
            <span className="rounded bg-paper-3 px-1.5 py-0.5 font-semibold uppercase tracking-wide">{t(`area.${g.area}`)}</span>
            {parent && <span>↑ {parent.title}</span>}
            {linked.length > 0 && <span>{t('goal.tasks', { d: done, n: linked.length })}</span>}
            {last && <span className={`rounded px-1.5 py-0.5 ${stateTone[last.state]}`}>{t(`goal.state.${last.state}`)}</span>}
          </p>
          {last?.note && <p className="mt-1 text-sm text-ink-2">“{last.note}”</p>}
        </div>
        {g.status === 'open' && (
          <span className="flex shrink-0 gap-1">
            <Button size="sm" variant="secondary" onClick={() => void setGoalStatus(g.id, 'done')}>{t('common.done')}</Button>
            <Button size="sm" variant="ghost" onClick={() => void setGoalStatus(g.id, 'dropped')}>{t('common.drop')}</Button>
          </span>
        )}
      </div>

      {g.status === 'open' && (
        checking ? (
          <div className="mt-3 flex flex-col gap-2">
            <div className="flex gap-1">
              {(['on-track', 'behind', 'blocked'] as CheckinState[]).map((s) => (
                <button key={s} className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold ${state === s ? stateTone[s] + ' ring-1 ring-current' : 'bg-paper-3/70 text-ink-2'}`} onClick={() => setState(s)}>
                  {t(`goal.state.${s}`)}
                </button>
              ))}
            </div>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('goal.note.ph')} onKeyDown={(e) => e.key === 'Enter' && void save()} />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void save()}>{t('goal.checkin.save')}</Button>
              <Button size="sm" variant="ghost" onClick={() => setChecking(false)}>{t('common.cancel')}</Button>
            </div>
          </div>
        ) : (
          <button className={`mt-2 flex items-center gap-1 text-xs ${stale ? 'font-semibold text-accent' : 'text-ink-3 hover:text-ink'}`} onClick={() => setChecking(true)}>
            <Flag size={12} />{stale ? t('goal.checkin.due') : t('goal.checkin')}
          </button>
        )
      )}
    </li>
  )
}

function PeriodSection({ horizon, periodKey, onShift, today, tasks, defaultArea }: {
  horizon: Horizon; periodKey: string; onShift: (by: number) => void; today: ISODate; tasks: Task[]; defaultArea: Area
}) {
  const { t, lang } = useT()
  const goals = useLiveQuery(() => goalsFor(periodKey), [periodKey], [])
  const pk = parentKey(periodKey)
  const parents = useLiveQuery(() => (pk ? goalsFor(pk) : Promise.resolve([] as Goal[])), [pk], [])
  const [title, setTitle] = useState('')
  const [area, setArea] = useState<Area>(defaultArea)
  const [parentId, setParentId] = useState('')
  const open = goals.filter((g) => g.status === 'open')
  const isCurrent = periodKey === keyFor(horizon, today)

  async function add() {
    if (!title.trim()) return
    await addGoal({ horizon, periodKey, title, area, parentId: parentId || undefined })
    setTitle('')
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <Eyebrow>{t(`goal.h.${horizon}`)}</Eyebrow>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => onShift(-1)}><ChevronLeft size={16} /></Button>
          <span className={`font-display text-lg ${isCurrent ? '' : 'text-ink-2'}`}>{periodLabel(periodKey, lang)}</span>
          <Button variant="ghost" size="sm" onClick={() => onShift(1)}><ChevronRight size={16} /></Button>
        </div>
      </div>

      {horizon === 'week' && open.length > SOFT_MAX_WEEK_GOALS && (
        <Muted className="mt-2 text-accent">{t('goal.nudge', { n: open.length, max: SOFT_MAX_WEEK_GOALS })}</Muted>
      )}

      <ul className="mt-3 flex flex-col gap-2">
        {goals.length === 0 && <Muted>{t('goal.empty')}</Muted>}
        {goals.map((g) => <GoalCard key={g.id} g={g} tasks={tasks} parents={parents} today={today} />)}
      </ul>

      <div className="mt-3 flex flex-col gap-2">
        <div className="flex gap-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t(`goal.ph.${horizon}`)} onKeyDown={(e) => e.key === 'Enter' && void add()} />
          <button
            type="button"
            className={`shrink-0 rounded-xl px-2 text-[10px] font-semibold uppercase tracking-wide ${area === 'work' ? 'bg-ink text-paper' : 'bg-paper-3 text-ink-2'}`}
            onClick={() => setArea((a) => (a === 'work' ? 'personal' : 'work'))}
          >
            {t(`area.${area}`)}
          </button>
          <Button onClick={() => void add()}>{t('common.add')}</Button>
        </div>
        {parents.filter((p) => p.status === 'open').length > 0 && (
          <select className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink-2" value={parentId} onChange={(e) => setParentId(e.target.value)}>
            <option value="">{t('goal.parent.none', { h: t(horizon === 'week' ? 'goal.h.quarter' : 'goal.h.year') })}</option>
            {parents.filter((p) => p.status === 'open').map((p) => <option key={p.id} value={p.id}>↑ {p.title}</option>)}
          </select>
        )}
      </div>
    </Card>
  )
}

function WeekReview({ periodKey, today, settings, nowMs, tasks }: { periodKey: string; today: ISODate; settings: Settings; nowMs: number; tasks: Task[] }) {
  const { t } = useT()
  const { from, to } = periodRange(periodKey)
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], [])
  const dayLogs = useLiveQuery(() => db.dayLogs.toArray(), [], [])
  const m = computeWeekMetrics({ weekStart: from, today, sessions, dayLogs, tasks, settings, nowMs })
  const inWeek = tasks.filter((x) => x.scheduledFor && x.scheduledFor >= from && x.scheduledFor <= to && !x.deleted && x.status !== 'dropped')
  const doneN = inWeek.filter((x) => x.status === 'done').length
  const deferTotal = m.deferrals['new-info'] + m.deferrals.urgent + m.deferrals['dont-want']
  const bed = m.bedtimeDeltaMin
  const pct = inWeek.length ? Math.round((doneN / inWeek.length) * 100) : 0

  return (
    <Card>
      <h2 className="font-display text-xl">{t('week.review')}</h2>
      <Muted>{t('week.review.hint', { n: m.daysCounted })}</Muted>
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
        <Stat label={t('goal.m.tasks')} value={`${doneN}/${inWeek.length}`} note={inWeek.length ? `${pct}%` : undefined} />
        <Stat label={t('week.m.focus', { n: settings.minFocusMin })} value={`${m.daysWithFocus}/${m.daysCounted}`} />
        <Stat label={t('week.m.shutdown')} value={`${m.shutdownOnTime}/${m.daysCounted}`} note={t('week.m.shutdown.note', { n: m.daysClosed })} />
        <Stat label={t('week.m.bed')} value={bed === null ? '—' : `${bed > 0 ? '+' : ''}${bed}′`} note={bed === null ? t('week.m.bed.none') : bed > 0 ? t('week.m.bed.late') : t('week.m.bed.ok')} />
        <Stat label={t('week.m.returns')} value={String(m.returns)} note={t('week.m.returns.note')} />
        <Stat label={t('week.m.defer')} value={String(deferTotal)} note={deferTotal ? t('week.m.defer.note', { dw: m.deferrals['dont-want'], ur: m.deferrals.urgent, ni: m.deferrals['new-info'] }) : undefined} />
      </div>
    </Card>
  )
}

export function GoalsScreen({ today, settings, now }: { today: ISODate; settings: Settings; now: Date }) {
  const { t } = useT()
  const [year, setYear] = useState(keyFor('year', today))
  const [quarter, setQuarter] = useState(keyFor('quarter', today))
  const [week, setWeek] = useState(keyFor('week', today))
  const tasks = useLiveQuery(() => db.tasks.toArray(), [], [])

  return (
    <Page title={t('goal.title')} subtitle={t('goal.subtitle')}>
      <Columns cols="1/1/1">
      <PeriodSection horizon="week" periodKey={week} onShift={(b) => setWeek(shiftPeriod(week, b))} today={today} tasks={tasks} defaultArea={settings.defaultArea} />
      <PeriodSection horizon="quarter" periodKey={quarter} onShift={(b) => setQuarter(shiftPeriod(quarter, b))} today={today} tasks={tasks} defaultArea={settings.defaultArea} />
      <PeriodSection horizon="year" periodKey={year} onShift={(b) => setYear(shiftPeriod(year, b))} today={today} tasks={tasks} defaultArea={settings.defaultArea} />
      </Columns>
      <WeekReview periodKey={week} today={today} settings={settings} nowMs={now.getTime()} tasks={tasks} />
    </Page>
  )
}
