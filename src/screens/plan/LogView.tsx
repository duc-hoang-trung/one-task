import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Coffee } from 'lucide-react'
import { Button, Card, Muted, Segmented } from '../../components/ui'
import { useT } from '../../i18n'
import { timeLogsOn } from '../../lib/actions'
import { db } from '../../lib/db'
import { addDays, fromISODate, toHM, weekDays, weekStart, type ISODate } from '../../lib/dates'
import { sessionMinutes } from '../../lib/metrics'
import { periodLabel, weekKey } from '../../lib/period'
import { isFocus } from '../../lib/session'
import type { Session, Settings, Task, TimeLog } from '../../lib/types'
import { DoneList } from './DoneList'

const HOUR_PX = 48
/** Lịch vẽ trọn 24 giờ như Google Calendar; khung nhìn cuộn tới giờ có việc. */
const HOURS = Array.from({ length: 24 }, (_, i) => i)
const VIEW_PX = 15 * HOUR_PX
const minOfDay = (ms: number) => { const d = new Date(ms); return d.getHours() * 60 + d.getMinutes() }
const COLS = 'grid-cols-[3.25rem_repeat(7,minmax(0,1fr))]'

/**
 * Nhật ký: nhìn lại đã làm gì, lúc nào. Hai cách xem —
 *  - Lịch tuần: lưới 24 giờ kiểu Google Calendar, mỗi phiên tập trung là một khối đúng giờ thật,
 *    phiên trùng giờ chia cột cạnh nhau, có vạch giờ hiện tại. Hàng "cả ngày" giữ việc đã xong
 *    không có phiên và các dòng giờ ghi tay (không có mốc giờ nên không vẽ vào lưới được).
 *  - Tất cả: danh sách mọi việc đã xong từ trước tới nay (xem DoneList).
 * Chỉ để xem: không kéo thả, chạm một khối thì mở việc đó ra.
 */
export function LogView({ today, now, onEdit }: { today: ISODate; settings: Settings; now: Date; onEdit: (t: Task) => void }) {
  const { t, lang } = useT()
  const [tab, setTab] = useState<'week' | 'all'>('week')
  const [ws, setWs] = useState(weekStart(today))
  const days = weekDays(ws)
  const nowMs = now.getTime()
  const scroller = useRef<HTMLDivElement>(null)

  const sessions = useLiveQuery(() => db.sessions.where('date').between(days[0], days[6], true, true).toArray(), [ws], [])
  const logs = useLiveQuery(async () => (await Promise.all(days.map((d) => timeLogsOn(d)))).flat(), [ws], [])
  const doneTasks = useLiveQuery(
    () => db.tasks.where('scheduledFor').between(days[0], days[6], true, true).filter((x) => !x.deleted && x.status === 'done').toArray(),
    [ws], [],
  )
  const taskById = useLiveQuery(async () => {
    const ids = [...new Set(sessions.map((s) => s.taskId).filter(Boolean))]
    return (await db.tasks.bulkGet(ids)).filter(Boolean) as Task[]
  }, [sessions.map((s) => s.taskId).sort().join(',')], [])

  const focusMin = sessions.filter(isFocus).reduce((a, s) => a + sessionMinutes(s, nowMs), 0)
  const loggedMin = logs.reduce((a, l) => a + l.minutes, 0)
  const nameOf = (id: string) => taskById.find((x) => x.id === id)?.title ?? doneTasks.find((x) => x.id === id)?.title ?? '—'

  // Cuộn tới giờ sớm nhất có việc (lùi 1 tiếng cho thoáng), mặc định 7:00.
  const firstMin = sessions.length ? Math.min(...sessions.map((s) => minOfDay(s.startedAt))) : 8 * 60
  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTop = Math.max(0, ((firstMin - 60) / 60) * HOUR_PX)
  }, [ws, firstMin])

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
      top: (p.start / 60) * HOUR_PX,
      height: ((p.end - p.start) / 60) * HOUR_PX,
      left: (p.col / cols) * 100,
      width: 100 / cols,
    }))
  }
  const allDayOf = (d: ISODate) => ({
    done: doneTasks.filter((x) => x.scheduledFor === d && !sessions.some((s) => s.taskId === x.id && s.date === d)),
    logs: logs.filter((l: TimeLog) => l.date === d),
  })
  const hasAllDay = days.some((d) => { const a = allDayOf(d); return a.done.length > 0 || a.logs.length > 0 })
  const nowTop = (minOfDay(nowMs) / 60) * HOUR_PX
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
        {ws !== weekStart(today) && <Button variant="ghost" size="sm" onClick={() => setWs(weekStart(today))}>{t('cal.today')}</Button>}
        <span className="flex-1" />
        <Muted className="tabular-nums">{t('log.total', { n: focusMin + loggedMin, k: doneTasks.length })}</Muted>
      </div>
      <Muted className="text-[12px]">{t('log.hint')}</Muted>

      <Card className="p-0" testId="logview">
        <div className="overflow-x-auto">
          <div className="min-w-[46rem]">
            {/* đầu cột: thứ + số ngày, hôm nay khoanh tròn — giữ nguyên chỗ cuộn để thẳng cột với lưới */}
            <div className={`grid ${COLS} border-b border-line`} style={{ scrollbarGutter: 'stable', overflowY: 'hidden' }}>
              <div />
              {days.map((d) => {
                const isToday = d === today
                return (
                  <div key={d} className="border-l border-line py-2 text-center">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-3">{t(`dowShort.${fromISODate(d).getDay()}` as 'dowShort.1')}</div>
                    <div className={`mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-[15px] tabular-nums ${isToday ? 'bg-accent font-semibold text-white' : 'text-ink'}`}>
                      {Number(d.slice(-2))}
                    </div>
                  </div>
                )
              })}
            </div>

            {hasAllDay && (
              <div className={`grid ${COLS} border-b border-line bg-paper-2/40`} style={{ scrollbarGutter: 'stable', overflowY: 'hidden' }}>
                <div className="py-1.5 pr-2 text-right text-[10px] uppercase tracking-wide text-ink-3">{t('log.allday')}</div>
                {days.map((d) => {
                  const { done, logs: ls } = allDayOf(d)
                  return (
                    <div key={d} className="flex flex-col gap-0.5 border-l border-line p-1">
                      {done.map((x) => (
                        <button key={x.id} className="truncate rounded bg-good/15 px-1.5 py-0.5 text-left text-[11px] text-good" onClick={() => onEdit(x)}>
                          ✓ {x.title}
                        </button>
                      ))}
                      {ls.map((l) => (
                        <span key={l.id} className="truncate rounded bg-paper-3 px-1.5 py-0.5 text-[11px] text-ink-2">
                          {l.minutes}′ {t('log.logged')}{l.note ? ` · ${l.note}` : ''}
                        </span>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}

            <div ref={scroller} className="overflow-y-auto" style={{ maxHeight: VIEW_PX, scrollbarGutter: 'stable' }}>
              <div className={`grid ${COLS}`}>
                {/* cột giờ */}
                <div className="relative" style={{ height: 24 * HOUR_PX }}>
                  {HOURS.map((h) => (
                    <span key={h} className="absolute right-2 -translate-y-1/2 text-[10px] tabular-nums text-ink-3" style={{ top: h * HOUR_PX }}>
                      {h === 0 ? '' : `${String(h).padStart(2, '0')}:00`}
                    </span>
                  ))}
                </div>
                {days.map((d) => (
                  <div key={d} className={`relative border-l border-line ${d === today ? 'bg-accent-soft/25' : ''}`} style={{ height: 24 * HOUR_PX }}>
                    {HOURS.map((h) => (
                      <div key={h}>
                        <div className="absolute inset-x-0 border-t border-line" style={{ top: h * HOUR_PX }} />
                        <div className="absolute inset-x-0 border-t border-line/40" style={{ top: h * HOUR_PX + HOUR_PX / 2 }} />
                      </div>
                    ))}
                    {d === today && (
                      <div className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: nowTop }}>
                        <span className="-ml-1 h-2 w-2 shrink-0 rounded-full bg-bad" />
                        <span className="h-px flex-1 bg-bad" />
                      </div>
                    )}
                    {blocksOf(d).map(({ s, top, height, left, width }) => (
                      <Block
                        key={s.id} s={s} top={top} height={height} left={left} width={width} nowMs={nowMs} name={nameOf(s.taskId)}
                        onOpen={() => { const x = taskById.find((y) => y.id === s.taskId); if (x) onEdit(x) }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        {empty && <Muted className="py-6 text-center">{t('log.empty')}</Muted>}
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
      className={`absolute z-20 overflow-hidden rounded px-1.5 py-0.5 text-left text-[11px] leading-tight ring-1 ring-paper ${focus ? 'bg-accent text-white' : 'bg-good/25 text-good'}`}
      style={{ top, height: Math.max(16, height), left: `calc(${left}% + 1px)`, width: `calc(${width}% - 2px)` }}
      onClick={focus ? onOpen : undefined}
      title={`${toHM(new Date(s.startedAt))} · ${min}′ · ${focus ? name : t('log.break')}`}
    >
      <span className="block truncate font-medium">{focus ? name : <><Coffee size={10} className="inline" /> {t('log.break')}</>}</span>
      {height >= 32 && <span className="block truncate opacity-85">{toHM(new Date(s.startedAt))} · {min}′</span>}
    </button>
  )
}
