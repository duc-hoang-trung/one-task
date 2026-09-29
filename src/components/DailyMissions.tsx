import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Check, Flame, Plus } from 'lucide-react'
import { MissionSheet } from './MissionSheet'
import { SlotIcon, slotTone } from './missionSlot'
import { Button, Eyebrow, Muted } from './ui'
import { useT } from '../i18n'
import { missions, missionSlot, missionsDoneOn, setMissionDone } from '../lib/actions'
import { db } from '../lib/db'
import { toHM, type ISODate } from '../lib/dates'
import { missionStreak } from '../lib/metrics'
import { MISSION_SLOTS, type Mission } from '../lib/types'

/** "10′" hoặc "20–25′" — khoảng chỉ hiện khi có cận trên. */
export function missionLength(m: Pick<Mission, 'estimateMin' | 'estimateMaxMin'>): string {
  if (!m.estimateMin) return ''
  return m.estimateMaxMin ? `${m.estimateMin}–${m.estimateMaxMin}′` : `${m.estimateMin}′`
}

/**
 * Nhiệm vụ hằng ngày: việc nhỏ lặp mỗi ngày, xếp theo buổi (Sáng · Trong ngày · Tối).
 * Mỗi dòng mang mốc giờ (cố định hoặc buổi), khoảng thời lượng và các bước cụ thể.
 * Tách khỏi danh sách việc trong ngày để không trôi về Backlog mỗi sáng.
 */
export function DailyMissions({ today, now }: { today: ISODate; now: Date }) {
  const { t } = useT()
  const [editing, setEditing] = useState<Mission | null>(null)
  const [creating, setCreating] = useState(false)

  const list = useLiveQuery(() => missions(), [], [])
  const doneIds = useLiveQuery(() => missionsDoneOn(today), [today], [])
  const logs = useLiveQuery(() => db.missionLogs.filter((l) => !l.deleted).toArray(), [], [])
  const done = new Set(doneIds)
  const nowHM = toHM(now)
  const groups = MISSION_SLOTS.map((slot) => ({ slot, items: list.filter((m) => missionSlot(m) === slot) })).filter((g) => g.items.length > 0)

  return (
    <div data-testid="missions">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <Eyebrow>{t('mission.title')}</Eyebrow>
        {list.length > 0 && <span className="text-[12px] tabular-nums text-ink-3">{done.size}/{list.length}</span>}
      </div>

      {list.length === 0 ? (
        <Muted className="mb-2 text-[12px]">{t('mission.empty')}</Muted>
      ) : (
        groups.map((g) => (
          <div key={g.slot} className="mb-2.5">
            <p className={`mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide ${slotTone[g.slot]}`}>
              <SlotIcon slot={g.slot} size={12} /><span>{t(`mission.slot.${g.slot}`)}</span>
            </p>
            <ul className="flex flex-col gap-1">
              {g.items.map((m) => {
                const on = done.has(m.id)
                const streak = missionStreak(logs, m.id, today)
                const len = missionLength(m)
                // Có giờ cố định, đã qua giờ mà chưa tick: đánh dấu đỏ — thông báo có thể đã lỡ.
                const late = !!m.at && !on && nowHM > m.at
                return (
                  <li key={m.id} className="flex items-start gap-2.5 rounded-lg px-1 py-1">
                    <button
                      role="checkbox" aria-checked={on} aria-label={m.title}
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${on ? 'border-good bg-good text-white' : 'border-ink-3/60 hover:border-accent'}`}
                      onClick={() => void setMissionDone(m.id, today, !on)}
                    >
                      {on && <Check size={14} strokeWidth={3} />}
                    </button>
                    <button className="min-w-0 flex-1 text-left" onClick={() => setEditing(m)}>
                      <span className={`block truncate text-[15px] ${on ? 'text-ink-3 line-through' : ''}`}>{m.title}</span>
                      {(m.at || len || m.note) && (
                        <span className="mt-0.5 flex items-center gap-1.5 text-[12px] text-ink-3">
                          {m.at && <span className={`shrink-0 tabular-nums ${late ? 'font-semibold text-bad' : ''}`}>{m.at}</span>}
                          {late && <span className="shrink-0 text-bad">{t('mission.late')}</span>}
                          {len && <span className="shrink-0 tabular-nums">{len}</span>}
                          {m.note && <span className="min-w-0 truncate">{m.note}</span>}
                        </span>
                      )}
                    </button>
                    {streak > 1 && (
                      <span className="mt-0.5 flex shrink-0 items-center gap-0.5 text-[12px] tabular-nums text-accent" title={t('mission.streak', { n: streak })}>
                        <Flame size={12} />{streak}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))
      )}

      <Button variant="ghost" size="sm" className="mt-1 !px-1" onClick={() => setCreating(true)}><Plus size={14} />{t('mission.add')}</Button>

      {creating && <MissionSheet onClose={() => setCreating(false)} />}
      {editing && <MissionSheet mission={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
