import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Search } from 'lucide-react'
import { QuadrantChip } from '../../components/QuadrantChip'
import { Button, Card, Eyebrow, Input, Muted } from '../../components/ui'
import { fmtDate, useT } from '../../i18n'
import { taskDoneOn } from '../../lib/actions'
import { db } from '../../lib/db'
import type { ISODate } from '../../lib/dates'
import { minutesByTask } from '../../lib/metrics'
import type { Area, Task } from '../../lib/types'

const PAGE = 50
type AreaFilter = Area | 'all'

/**
 * Toàn bộ việc đã xong, mới nhất trước, gom theo ngày — chỗ để nhìn lại cả quá trình
 * (Nhật ký dạng lịch chỉ xem được một tuần). Có tìm theo tên và lọc khu vực.
 */
export function DoneList({ today, now, onEdit }: { today: ISODate; now: Date; onEdit: (t: Task) => void }) {
  const { t, lang } = useT()
  const [q, setQ] = useState('')
  const [area, setArea] = useState<AreaFilter>('all')
  const [limit, setLimit] = useState(PAGE)

  const done = useLiveQuery(() => db.tasks.where('status').equals('done').filter((x) => !x.deleted).toArray(), [], [])
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], [])
  const logs = useLiveQuery(() => db.timeLogs.filter((l) => !l.deleted).toArray(), [], [])
  const mins = minutesByTask(sessions, logs, now.getTime())

  const needle = q.trim().toLowerCase()
  const all = done
    .filter((x) => (area === 'all' || x.area === area) && (!needle || x.title.toLowerCase().includes(needle)))
    .sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0) || (taskDoneOn(b) ?? '').localeCompare(taskDoneOn(a) ?? ''))
  const totalMin = all.reduce((sum, x) => sum + (mins.get(x.id) ?? 0), 0)
  const page = all.slice(0, limit)

  // gom theo ngày, giữ nguyên thứ tự đã sắp
  const groups: { day: ISODate | 'none'; items: Task[] }[] = []
  for (const x of page) {
    const day = taskDoneOn(x) ?? 'none'
    const last = groups[groups.length - 1]
    if (last && last.day === day) last.items.push(x)
    else groups.push({ day, items: [x] })
  }

  return (
    <div className="flex flex-col gap-3" data-testid="donelist">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <Input className="!pl-9" placeholder={t('done.search')} value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE) }} />
        </div>
        <div className="flex gap-1">
          {(['all', 'work', 'personal'] as AreaFilter[]).map((a) => (
            <button
              key={a}
              className={`rounded-full px-3 py-1 text-xs font-medium ${area === a ? 'bg-ink text-paper' : 'bg-paper-3/70 text-ink-2'}`}
              onClick={() => { setArea(a); setLimit(PAGE) }}
            >
              {a === 'all' ? t('plan.all') : t(`area.${a}`)}
            </button>
          ))}
        </div>
      </div>
      <Muted className="tabular-nums">{t('done.count', { n: all.length, m: totalMin })}</Muted>

      {all.length === 0 ? (
        <Card><Muted className="py-4 text-center">{needle || area !== 'all' ? t('done.noMatch') : t('done.empty')}</Muted></Card>
      ) : (
        <Card className="py-3">
          {groups.map((g) => (
            <div key={g.day} className="mb-3 last:mb-0">
              <Eyebrow className="mb-1.5">
                {g.day === 'none' ? t('done.noDate') : fmtDate(lang, g.day)}
                {g.day === today ? ` · ${t('cal.today')}` : ''}
              </Eyebrow>
              <ul className="flex flex-col divide-y divide-line">
                {g.items.map((x) => (
                  <li key={x.id}>
                    <button className="flex w-full items-center gap-2 py-2 text-left" onClick={() => onEdit(x)}>
                      <span className="min-w-0 flex-1 truncate text-[15px]">{x.title}</span>
                      <QuadrantChip q={x.quadrant} />
                      {(mins.get(x.id) ?? 0) > 0 && <span className="shrink-0 text-[12px] tabular-nums text-ink-3">{mins.get(x.id)}′</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {all.length > limit && (
            <Button variant="ghost" size="sm" className="mt-1" onClick={() => setLimit((n) => n + PAGE)}>
              {t('done.more', { n: all.length - limit })}
            </Button>
          )}
        </Card>
      )}
    </div>
  )
}
