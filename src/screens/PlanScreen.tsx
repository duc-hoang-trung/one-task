import { useState } from 'react'
import { TaskSheet } from '../components/TaskSheet'
import { Page } from '../components/ui'
import { useT } from '../i18n'
import type { ISODate } from '../lib/dates'
import type { Settings, Task } from '../lib/types'
import { MatrixView } from './plan/MatrixView'
import { MonthView } from './plan/MonthView'
import { WeekBoard } from './plan/WeekBoard'

type Mode = 'matrix' | 'week' | 'month'
const MODE_KEY = 'plan.mode'
const readMode = (): Mode => {
  try { const m = sessionStorage.getItem(MODE_KEY); if (m === 'week' || m === 'month') return m } catch { /* ignore */ }
  return 'matrix'
}

/** Một màn sắp việc, ba cách nhìn: Ma trận (backlog) · Tuần · Tháng (lịch + thống kê). Cùng một mô hình kéo thả. */
export function PlanScreen({ today, settings, now, onGoToday }: { today: ISODate; settings: Settings; now: Date; onGoToday: () => void }) {
  const { t } = useT()
  const [mode, setModeState] = useState<Mode>(readMode)
  const [editing, setEditing] = useState<Task | null>(null)
  const setMode = (m: Mode) => { setModeState(m); try { sessionStorage.setItem(MODE_KEY, m) } catch { /* ignore */ } }
  const seg = (m: Mode, label: string) => (
    <button
      className={`flex-1 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors sm:min-w-28 ${mode === m ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-paper-3/60'}`}
      onClick={() => setMode(m)}
    >
      {label}
    </button>
  )
  return (
    <Page title={t('plan.title')} subtitle={t('plan.subtitle')}>
      <div className="flex gap-1 rounded-xl bg-paper-2/70 p-1 ring-1 ring-line sm:self-start">
        {seg('matrix', t('plan.matrix'))}
        {seg('week', t('plan.week'))}
        {seg('month', t('plan.month'))}
      </div>
      {mode === 'matrix' && <MatrixView today={today} settings={settings} onEdit={setEditing} />}
      {mode === 'week' && <WeekBoard today={today} settings={settings} onEdit={setEditing} />}
      {mode === 'month' && <MonthView today={today} settings={settings} now={now} onGoToday={onGoToday} onEdit={setEditing} />}
      {editing && <TaskSheet task={editing} today={today} onClose={() => setEditing(null)} />}
    </Page>
  )
}
