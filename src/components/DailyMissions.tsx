import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Check, Flame, Plus, X } from 'lucide-react'
import { Eyebrow, Muted } from './ui'
import { useT } from '../i18n'
import { addMission, deleteMission, missions, missionsDoneOn, setMissionDone } from '../lib/actions'
import { db } from '../lib/db'
import type { ISODate } from '../lib/dates'
import { missionStreak } from '../lib/metrics'
import { parseQuickAdd } from '../lib/quickAdd'

/**
 * Nhiệm vụ hằng ngày: việc nhỏ lặp mỗi ngày (Anki, Duolingo, shadowing…).
 * Tách khỏi danh sách việc trong ngày để không trôi về Backlog mỗi sáng và không
 * làm loãng "một việc quan trọng nhất". Tick lại mỗi ngày; chuỗi ngày liên tiếp hiện cạnh tên.
 */
export function DailyMissions({ today }: { today: ISODate }) {
  const { t } = useT()
  const [text, setText] = useState('')
  const [manage, setManage] = useState(false)

  const list = useLiveQuery(() => missions(), [], [])
  const doneIds = useLiveQuery(() => missionsDoneOn(today), [today], [])
  const logs = useLiveQuery(() => db.missionLogs.filter((l) => !l.deleted).toArray(), [], [])
  const done = new Set(doneIds)

  async function add() {
    const q = parseQuickAdd(text)
    if (!q.title) return
    await addMission(q.title, q.estimateMin)
    setText('')
  }

  return (
    <div data-testid="missions">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <Eyebrow>{t('mission.title')}</Eyebrow>
        {list.length > 0 && (
          <span className="flex items-baseline gap-2">
            <span className="text-[12px] tabular-nums text-ink-3">{done.size}/{list.length}</span>
            <button className="text-[12px] text-accent hover:underline" onClick={() => setManage((m) => !m)}>
              {manage ? t('common.done') : t('mission.manage')}
            </button>
          </span>
        )}
      </div>

      {list.length === 0 ? (
        <Muted className="mb-2 text-[12px]">{t('mission.empty')}</Muted>
      ) : (
        <ul className="flex flex-col gap-1">
          {list.map((m) => {
            const on = done.has(m.id)
            const streak = missionStreak(logs, m.id, today)
            return (
              <li key={m.id} className="flex items-center gap-2.5 rounded-lg px-1 py-1">
                <button
                  role="checkbox" aria-checked={on} aria-label={m.title}
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${on ? 'border-good bg-good text-white' : 'border-ink-3/60 hover:border-accent'}`}
                  onClick={() => void setMissionDone(m.id, today, !on)}
                >
                  {on && <Check size={14} strokeWidth={3} />}
                </button>
                <span className={`min-w-0 flex-1 truncate text-[15px] ${on ? 'text-ink-3 line-through' : ''}`}>{m.title}</span>
                {m.estimateMin && <span className="shrink-0 text-[12px] tabular-nums text-ink-3">{m.estimateMin}′</span>}
                {streak > 1 && (
                  <span className="flex shrink-0 items-center gap-0.5 text-[12px] tabular-nums text-accent" title={t('mission.streak', { n: streak })}>
                    <Flame size={12} />{streak}
                  </span>
                )}
                {manage && (
                  <button aria-label={t('common.delete')} className="shrink-0 rounded p-1 text-ink-3 hover:text-bad" onClick={() => void deleteMission(m.id)}>
                    <X size={14} />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-line bg-paper px-2 py-1 focus-within:border-accent">
        <Plus size={15} className="shrink-0 text-ink-3" />
        <input
          className="min-w-0 flex-1 bg-transparent py-1.5 text-[14px] placeholder:text-ink-3/70 focus:outline-none"
          placeholder={t('mission.add.ph')}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void add() } }}
          enterKeyHint="done"
        />
      </div>
    </div>
  )
}
