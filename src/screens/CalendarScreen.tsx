import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { QuickAdd } from '../components/QuickAdd'
import { TaskRow } from '../components/TaskRow'
import { TaskSheet } from '../components/TaskSheet'
import { Button, Card, Eyebrow, Muted, Page, Stat } from '../components/ui'
import { fmtDate, fmtMonth, useT, type Key } from '../i18n'
import { monthDays, monthGrid, monthOf, monthRange, relation, shiftMonth } from '../lib/calendar'
import { byOrder, db } from '../lib/db'
import { bedtimeDelta, type ISODate } from '../lib/dates'
import { focusMinutesByDate } from '../lib/metrics'
import { isShutdownOnTime } from '../lib/phase'
import type { Area, Settings, Task } from '../lib/types'

type AreaFilter = Area | 'all'

/**
 * Lịch tháng: quá khứ chỉ đọc (việc xong/tổng, MIT, đóng ngày, ngủ), hôm nay và tương lai thêm/sửa việc.
 * Bên dưới: thống kê tháng + biểu đồ cột việc xong mỗi ngày.
 */
export function CalendarScreen({ today, settings, now, onGoToday }: { today: ISODate; settings: Settings; now: Date; onGoToday: () => void }) {
  const { t, lang } = useT()
  const [{ year, month }, setYM] = useState(() => monthOf(today))
  const [selected, setSelected] = useState<ISODate | null>(null)
  const [area, setArea] = useState<AreaFilter>('all')
  const [editing, setEditing] = useState<Task | null>(null)
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
  const mitDone = (d: ISODate) => tasksOf(d).some((x) => x.isMain && x.status === 'done')

  const grid = monthGrid(year, month)
  const isThisMonth = monthOf(today).year === year && monthOf(today).month === month

  function cellClass(d: ISODate): string {
    const rel = relation(d, today)
    const n = tasksOf(d).length
    const k = doneOf(d).length
    const base = 'relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition-colors'
    const sel = selected === d ? ' ring-2 ring-accent ring-offset-2 ring-offset-paper' : ''
    if (rel === 'today') return `${base} bg-ink text-paper font-semibold${sel}`
    if (rel === 'past') {
      if (n > 0 && k === n) return `${base} bg-accent text-white${sel}`
      if (k > 0 || (focus.get(d) ?? 0) >= settings.minFocusMin) return `${base} bg-accent-soft text-ink${sel}`
      return `${base} text-ink-2 hover:bg-paper-3/60${sel}`
    }
    return `${base} text-ink-2 hover:bg-paper-3/60${n > 0 ? ' ring-1 ring-accent/60' : ''}${sel}`
  }

  // ---- thống kê tháng (chỉ tới hôm nay) ----
  const days = monthDays(year, month).filter((d) => d <= today)
  const monthTasks = tasks.filter((x) => x.scheduledFor! <= today)
  const done = monthTasks.filter((x) => x.status === 'done').length
  const pct = monthTasks.length ? Math.round((done / monthTasks.length) * 100) : 0
  const mitDays = days.filter((d) => mitDone(d)).length
  const focusTotal = days.reduce((a, d) => a + (focus.get(d) ?? 0), 0)
  const closedOnTime = days.filter((d) => { const l = logOf(d); return l?.shutdownAt && isShutdownOnTime(l.shutdownAt, settings.shutdownTime) }).length
  const bedDeltas = days.map((d) => logOf(d)?.bedtimeActual).filter((x): x is string => !!x).map((b) => bedtimeDelta(settings.bedtimeTarget, b))
  const bedAvg = bedDeltas.length ? Math.round(bedDeltas.reduce((a, b) => a + b, 0) / bedDeltas.length) : null
  const series = monthDays(year, month).map((d) => ({ d, v: doneOf(d).length, n: tasksOf(d).length }))

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
          {grid.flat().map((d, i) => {
            if (!d) return <div key={`e${i}`} />
            const log = logOf(d)
            const onTime = log?.shutdownAt && isShutdownOnTime(log.shutdownAt, settings.shutdownTime)
            const late = log?.bedtimeActual && bedtimeDelta(settings.bedtimeTarget, log.bedtimeActual) > 30
            const n = tasksOf(d).length
            const k = doneOf(d).length
            return (
              <button key={d} className={cellClass(d)} onClick={() => setSelected(d)}>
                <span className="leading-none">{Number(d.slice(-2))}</span>
                {n > 0 && <span className="mt-0.5 text-[9px] leading-none opacity-80">{k}/{n}</span>}
                <span className="absolute bottom-1 flex gap-0.5">
                  {onTime && <span className="h-1 w-1 rounded-full bg-good" />}
                  {late && <span className="h-1 w-1 rounded-full bg-bad" />}
                </span>
              </button>
            )
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-3">
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-accent" />{t('cal.legend.allDone')}</span>
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
          <div className="flex items-center justify-between">
            <Eyebrow>{fmtDate(lang, selected)}{selRel === 'today' ? ` · ${t('cal.today')}` : ''}</Eyebrow>
            {selRel === 'today' && <Button variant="ghost" size="sm" onClick={onGoToday}>{t('cal.goToday')}</Button>}
          </div>
          {tasksOf(selected).length > 0 ? (
            <ul className="mt-2 flex flex-col gap-1.5">
              {tasksOf(selected).map((x) => (
                <li key={x.id}><TaskRow task={x} today={today} onEdit={setEditing} readOnly={selRel === 'past'} compact /></li>
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

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">{t('cal.stats')}</h2>
          <div className="flex gap-1">
            {(['all', 'work', 'personal'] as AreaFilter[]).map((a) => (
              <button key={a} className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${area === a ? 'bg-ink text-paper' : 'bg-paper-3/70 text-ink-2'}`} onClick={() => setArea(a)}>
                {a === 'all' ? t('plan.all') : t(`area.${a}`)}
              </button>
            ))}
          </div>
        </div>
        <Muted>{t('cal.stats.hint', { n: days.length })}</Muted>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Stat label={t('cal.m.tasks')} value={`${done}/${monthTasks.length}`} note={monthTasks.length ? `${pct}%` : undefined} />
          <Stat label={t('cal.m.mit')} value={`${mitDays}/${days.length}`} />
          <Stat label={t('cal.m.focus')} value={focusTotal >= 60 ? `${Math.floor(focusTotal / 60)}h${String(focusTotal % 60).padStart(2, '0')}` : `${focusTotal}′`} />
          <Stat label={t('week.m.shutdown')} value={`${closedOnTime}/${days.length}`} />
          <Stat label={t('week.m.bed')} value={bedAvg === null ? '—' : `${bedAvg > 0 ? '+' : ''}${bedAvg}′`} note={bedAvg === null ? t('week.m.bed.none') : bedAvg > 0 ? t('week.m.bed.late') : t('week.m.bed.ok')} />
        </div>
        <div className="mt-4">
          <Eyebrow className="mb-2">{t('cal.chart')}</Eyebrow>
          <BarChart series={series} today={today} lang={lang} />
        </div>
      </Card>

      {editing && <TaskSheet task={editing} today={today} onClose={() => setEditing(null)} />}
    </Page>
  )
}

/** Cột mỏng bo đầu, một chuỗi, một màu accent; tooltip hover; nhãn dùng màu chữ. */
function BarChart({ series, today, lang }: { series: { d: ISODate; v: number; n: number }[]; today: ISODate; lang: 'vi' | 'en' }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 320, H = 96, padB = 16, padT = 6
  const max = Math.max(1, ...series.map((s) => s.v))
  const gap = 2
  const bw = (W - gap * (series.length - 1)) / series.length
  const y = (v: number) => padT + (H - padB - padT) * (1 - v / max)
  const h = hover !== null ? series[hover] : null
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="tasks done per day">
        {[0.5, 1].map((f) => (
          <line key={f} x1="0" x2={W} y1={y(max * f)} y2={y(max * f)} className="stroke-line" strokeWidth="1" strokeDasharray="2 3" />
        ))}
        {series.map((s, i) => {
          const x = i * (bw + gap)
          const top = y(s.v)
          const future = s.d > today
          return (
            <g key={s.d} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onTouchStart={() => setHover(i)}>
              <rect x={x} y={padT} width={bw} height={H - padB - padT} fill="transparent" />
              {s.v > 0 && <rect x={x} y={top} width={bw} height={Math.max(2, H - padB - top)} rx="2" className={future ? 'fill-paper-3' : hover === i ? 'fill-accent-2' : 'fill-accent'} />}
              {s.v === 0 && !future && <rect x={x} y={H - padB - 1.5} width={bw} height="1.5" rx="1" className="fill-paper-3" />}
              {(i === 0 || (i + 1) % 5 === 0) && (
                <text x={x + bw / 2} y={H - 3} textAnchor="middle" className="fill-ink-3" style={{ fontSize: 8 }}>{Number(s.d.slice(-2))}</text>
              )}
            </g>
          )
        })}
        <text x={W} y={y(max) + 3} textAnchor="end" className="fill-ink-3" style={{ fontSize: 8 }}>{max}</text>
      </svg>
      {h && (
        <div className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 rounded-lg bg-ink px-2 py-1 text-[11px] text-paper shadow-card">
          {fmtDate(lang, h.d)} · {h.v}/{h.n}
        </div>
      )}
    </div>
  )
}
