import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { ChevronLeft, ChevronRight, Coffee } from 'lucide-react'
import { Button, Card, Muted, Segmented } from '../../components/ui'
import { fmtDate, useT } from '../../i18n'
import { timeLogsOn } from '../../lib/actions'
import { db } from '../../lib/db'
import { addDays, toHM, weekDays, weekStart, type ISODate } from '../../lib/dates'
import { sessionMinutes } from '../../lib/metrics'
import { periodLabel, weekKey } from '../../lib/period'
import { isFocus } from '../../lib/session'
import type { Session, Settings, Task, TimeLog } from '../../lib/types'
import { DoneList } from './DoneList'

const HOUR_PX = 44
const DEFAULT_FROM = 7
const DEFAULT_TO = 22
const minOfDay = (ms: number) => { const d = new Date(ms); return d.getHours() * 60 + d.getMinutes() }

/**
 * Nhật ký tuần kiểu lịch: mỗi phiên tập trung là một khối đặt đúng giờ thật trong ngày,
 * hàng trên cùng là việc đã xong và giờ ghi tay (không có mốc giờ nên không vẽ vào lưới được).
 * Chỉ để nhìn lại, không sắp việc: không kéo thả, chạm một khối thì mở việc đó ra xem.
 */
export function LogView({ today, now, onEdit }: { today: ISODate; settings: Settings; now: Date; onEdit: (t: Task) => void }) {
  const { t, lang } = useT()
  const [tab, setTab] = useState<'week' | 'all'>('week')
  const [ws, setWs] = useState(weekStart(today))
  const days = weekDays(ws)
  const nowMs = now.getTime()

  const sessions = useLiveQuery(() => db.sessions.where('date').between(days[0], days[6], true, true).toArray(), [ws], [])
  const logs = useLiveQuery(async () => (await Promise.all(days.map((d) => timeLogsOn(d)))).flat(), [ws], [])
  const doneTasks = useLiveQuery(
    () => db.tasks.where('scheduledFor').between(days[0], days[6], true, true).filter((x) => !x.deleted && x.status === 'done').toArray(),
    [ws], [],
  )

  // Khung giờ co giãn theo dữ liệu thật, nhưng không bao giờ hẹp hơn 7–22.
  const ends = sessions.map((s) => (s.endedAt ?? nowMs))
  const from = Math.min(DEFAULT_FROM, ...sessions.map((s) => Math.floor(minOfDay(s.startedAt) / 60)))
  const to = Math.max(DEFAULT_TO, ...ends.map((ms) => Math.ceil(minOfDay(ms) / 60)))
  const hours = Array.from({ length: Math.max(1, to - from) }, (_, i) => from + i)

  const focusMin = sessions.filter(isFocus).reduce((a, s) => a + sessionMinutes(s, nowMs), 0)
  const loggedMin = logs.reduce((a, l) => a + l.minutes, 0)
  const titleOf = (id: string) => doneTasks.find((x) => x.id === id)?.title
  const taskById = useLiveQuery(async () => {
    const ids = [...new Set(sessions.map((s) => s.taskId).filter(Boolean))]
    return (await db.tasks.bulkGet(ids)).filter(Boolean) as Task[]
  }, [sessions.map((s) => s.taskId).sort().join(',')], [])
  const nameOf = (id: string) => taskById.find((x) => x.id === id)?.title ?? titleOf(id) ?? '—'

  /** Phiên trùng giờ thì chia cột đứng cạnh nhau (như Google Calendar), không đè lên nhau. */
  const blocksOf = (d: ISODate) => {
    const items = sessions
      .filter((x) => x.date === d)
      .map((x) => {
        const start = minOfDay(x.startedAt)
        return { s: x, start, end: Math.max(start + 5, minOfDay(x.endedAt ?? nowMs)) } // tối thiểu 5' để còn thấy
      })
      .sort((a, b) => a.start - b.start || a.end - b.end)
    const colEnds: number[] = []
    const placed = items.map((it) => {
      let col = colEnds.findIndex((e) => e <= it.start)
      if (col === -1) { col = colEnds.length; colEnds.push(it.end) } else colEnds[col] = it.end
      return { ...it, col }
    })
    const cols = Math.max(1, colEnds.length)
    return placed.map((p) => ({
      s: p.s,
      top: ((p.start - from * 60) / 60) * HOUR_PX,
      height: ((p.end - p.start) / 60) * HOUR_PX,
      left: (p.col / cols) * 100,
      width: 100 / cols,
    }))
  }
  const allDayOf = (d: ISODate) => ({
    done: doneTasks.filter((x) => x.scheduledFor === d && !sessions.some((s) => s.taskId === x.id && s.date === d)),
    logs: logs.filter((l: TimeLog) => l.date === d),
  })

  const empty = sessions.length === 0 && logs.length === 0 && doneTasks.length === 0

  const tabs = (
    <Segmented
      value={tab} onChange={setTab} size="sm" className="self-start"
      options={[{ value: 'week' as const, label: t('log.tab.week') }, { value: 'all' as const, label: t('log.tab.all') }]}
    />
  )
  if (tab === 'all') {
    return (
      <div className="flex flex-col gap-3">
        {tabs}
        <DoneList today={today} now={now} onEdit={onEdit} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {tabs}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" aria-label="prev" onClick={() => setWs(addDays(ws, -7))}><ChevronLeft size={16} /></Button>
        <span className="font-display text-lg">{periodLabel(weekKey(ws), lang)}</span>
        <Button variant="ghost" size="sm" aria-label="next" onClick={() => setWs(addDays(ws, 7))}><ChevronRight size={16} /></Button>
        <span className="flex-1" />
        <Muted className="tabular-nums">{t('log.total', { n: focusMin + loggedMin, k: doneTasks.length })}</Muted>
      </div>
      <Muted className="text-[12px]">{t('log.hint')}</Muted>

      <Card className="overflow-x-auto p-3" testId="logview">
        {empty ? (
          <Muted className="py-6 text-center">{t('log.empty')}</Muted>
        ) : (
          <div className="min-w-[46rem]">
            {/* đầu cột: thứ + ngày */}
            <div className="grid grid-cols-[3rem_repeat(7,minmax(0,1fr))] gap-1">
              <div />
              {days.map((d) => (
                <div key={d} className={`rounded-lg px-1 py-1 text-center text-[12px] font-semibold ${d === today ? 'bg-accent-soft text-accent' : 'text-ink-2'}`}>
                  {fmtDate(lang, d)}
                </div>
              ))}
            </div>

            {/* hàng "cả ngày": việc xong không có phiên + giờ ghi tay */}
            <div className="mt-1 grid grid-cols-[3rem_repeat(7,minmax(0,1fr))] gap-1 border-b border-line pb-2">
              <div className="pt-1 text-right text-[10px] uppercase tracking-wide text-ink-3">{t('log.allday')}</div>
              {days.map((d) => {
                const { done, logs: ls } = allDayOf(d)
                return (
                  <div key={d} className="flex min-h-6 flex-col gap-1">
                    {done.map((x) => (
                      <button key={x.id} className="truncate rounded-md bg-good/15 px-1.5 py-0.5 text-left text-[11px] text-good" onClick={() => onEdit(x)}>
                        ✓ {x.title}
                      </button>
                    ))}
                    {ls.map((l) => (
                      <span key={l.id} className="truncate rounded-md bg-paper-3 px-1.5 py-0.5 text-[11px] text-ink-2">
                        {l.minutes}′ {t('log.logged')}{l.note ? ` · ${l.note}` : ''}
                      </span>
                    ))}
                  </div>
                )
              })}
            </div>

            {/* lưới giờ + khối phiên */}
            <div className="mt-2 grid grid-cols-[3rem_repeat(7,minmax(0,1fr))] gap-1">
              <div className="relative" style={{ height: hours.length * HOUR_PX }}>
                {hours.map((h, i) => (
                  <span key={h} className="absolute right-1 -translate-y-1/2 text-[10px] tabular-nums text-ink-3" style={{ top: i * HOUR_PX }}>
                    {String(h).padStart(2, '0')}:00
                  </span>
                ))}
              </div>
              {days.map((d) => (
                <div key={d} className={`relative rounded-lg ${d === today ? 'bg-accent-soft/30' : 'bg-paper-2/40'}`} style={{ height: hours.length * HOUR_PX }}>
                  {hours.map((h, i) => <div key={h} className="absolute inset-x-0 border-t border-line/70" style={{ top: i * HOUR_PX }} />)}
                  {blocksOf(d).map(({ s, top, height, left, width }) => <Block key={s.id} s={s} top={top} height={height} left={left} width={width} nowMs={nowMs} name={nameOf(s.taskId)} onOpen={() => { const x = taskById.find((y) => y.id === s.taskId); if (x) onEdit(x) }} />)}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

function Block({ s, top, height, left, width, nowMs, name, onOpen }: {
  s: Session; top: number; height: number; left: number; width: number; nowMs: number; name: string; onOpen: () => void
}) {
  const { t } = useT()
  const focus = isFocus(s)
  const min = sessionMinutes(s, nowMs)
  return (
    <button
      className={`absolute overflow-hidden rounded-md px-1.5 py-0.5 text-left text-[11px] leading-tight ring-1 ${focus ? 'bg-accent/85 text-white ring-accent' : 'bg-good/20 text-good ring-good/30'}`}
      style={{ top, height: Math.max(16, height), left: `calc(${left}% + 2px)`, width: `calc(${width}% - 4px)` }}
      onClick={focus ? onOpen : undefined}
      title={`${toHM(new Date(s.startedAt))} · ${min}′ · ${focus ? name : t('log.break')}`}
    >
      <span className="block truncate font-medium">{focus ? name : <><Coffee size={10} className="inline" /> {t('log.break')}</>}</span>
      {height >= 30 && <span className="block truncate opacity-80">{toHM(new Date(s.startedAt))} · {min}′</span>}
    </button>
  )
}

