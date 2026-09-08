import { useState } from 'react'
import { fmtDate, useT, type Lang } from '../i18n'
import { monthDays } from '../lib/calendar'
import { bedtimeDelta, type ISODate } from '../lib/dates'
import { isShutdownOnTime } from '../lib/phase'
import type { Area, DayLog, Settings, Task } from '../lib/types'
import { Card, Eyebrow, Muted, Stat } from './ui'

type AreaFilter = Area | 'all'

/** Thống kê một tháng (chỉ tới hôm nay) + biểu đồ cột việc xong mỗi ngày. */
export function MonthStats({ year, month, today, settings, tasks, focus, dayLogs, area, onArea }: {
  year: number; month: number; today: ISODate; settings: Settings
  /** đã lọc theo area */
  tasks: Task[]
  focus: Map<ISODate, number>
  dayLogs: DayLog[]
  area: AreaFilter
  onArea: (a: AreaFilter) => void
}) {
  const { t, lang } = useT()
  const logOf = (d: ISODate) => dayLogs.find((l) => l.date === d)
  const tasksOf = (d: ISODate) => tasks.filter((x) => x.scheduledFor === d)
  const doneOf = (d: ISODate) => tasksOf(d).filter((x) => x.status === 'done')
  const days = monthDays(year, month).filter((d) => d <= today)
  const monthTasks = tasks.filter((x) => x.scheduledFor! <= today)
  const done = monthTasks.filter((x) => x.status === 'done').length
  const pct = monthTasks.length ? Math.round((done / monthTasks.length) * 100) : 0
  const mitDays = days.filter((d) => tasksOf(d).some((x) => x.isMain && x.status === 'done')).length
  const focusTotal = days.reduce((a, d) => a + (focus.get(d) ?? 0), 0)
  const closedOnTime = days.filter((d) => { const l = logOf(d); return l?.shutdownAt && isShutdownOnTime(l.shutdownAt, settings.shutdownTime) }).length
  const bedDeltas = days.map((d) => logOf(d)?.bedtimeActual).filter((x): x is string => !!x).map((b) => bedtimeDelta(settings.bedtimeTarget, b))
  const bedAvg = bedDeltas.length ? Math.round(bedDeltas.reduce((a, b) => a + b, 0) / bedDeltas.length) : null
  const series = monthDays(year, month).map((d) => ({ d, v: doneOf(d).length, n: tasksOf(d).length }))

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl">{t('cal.stats')}</h2>
        <div className="flex gap-1">
          {(['all', 'work', 'personal'] as AreaFilter[]).map((a) => (
            <button key={a} className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ${area === a ? 'bg-ink text-paper' : 'bg-paper-3/70 text-ink-2'}`} onClick={() => onArea(a)}>
              {a === 'all' ? t('plan.all') : t(`area.${a}`)}
            </button>
          ))}
        </div>
      </div>
      <Muted>{t('cal.stats.hint', { n: days.length })}</Muted>
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
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
  )
}

/** Cột mỏng bo đầu, một chuỗi, một màu accent; tooltip hover; nhãn dùng màu chữ. */
function BarChart({ series, today, lang }: { series: { d: ISODate; v: number; n: number }[]; today: ISODate; lang: Lang }) {
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
