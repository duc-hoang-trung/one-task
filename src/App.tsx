import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { useNow } from './hooks'
import { activeSession, closeStaleSessions } from './lib/actions'
import { isClockOverridden } from './lib/clock'
import { db, mainTaskFor } from './lib/db'
import { logicalDate, toHM } from './lib/dates'
import { computePhase } from './lib/phase'
import { DEFAULT_SETTINGS } from './lib/types'
import { MorningScreen } from './screens/MorningScreen'
import { NightScreen } from './screens/NightScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { ShutdownScreen } from './screens/ShutdownScreen'
import { TodayScreen } from './screens/TodayScreen'
import { WeekScreen } from './screens/WeekScreen'

type View = 'main' | 'week' | 'settings'

export default function App() {
  const now = useNow()
  const today = logicalDate(now)
  const [view, setView] = useState<View>('main')
  const [shutdown, setShutdown] = useState(false)

  // Chỉ đọc trong liveQuery (transaction read-only); merge default ở ngoài.
  const stored = useLiveQuery(() => db.settings.get('default'), [], null)
  const settings = stored === null ? undefined : { ...DEFAULT_SETTINGS, ...stored }
  const todayLog = useLiveQuery(() => db.dayLogs.get(today), [today])
  const task = useLiveQuery(() => mainTaskFor(today), [today])
  const session = useLiveQuery(() => activeSession(), [today])

  useEffect(() => {
    void closeStaleSessions(today)
  }, [today])

  // Đổi ngày logic (04:00) → về màn hình chính, thoát shutdown.
  useEffect(() => {
    setShutdown(false)
    setView('main')
  }, [today])

  if (settings === undefined) return null
  if (!settings.onboarded) return <SettingsScreen settings={settings} onboarding />

  const phase = computePhase({ todayLog })

  if (phase === 'night') return <NightScreen today={today} settings={settings} />

  let screen
  if (shutdown) {
    screen = <ShutdownScreen today={today} task={task} settings={settings} now={now} onCancel={() => setShutdown(false)} />
  } else if (view === 'week') {
    screen = <WeekScreen today={today} settings={settings} now={now} />
  } else if (view === 'settings') {
    screen = <SettingsScreen settings={settings} />
  } else if (phase === 'morning') {
    screen = <MorningScreen today={today} task={task} settings={settings} now={now} />
  } else {
    screen = <TodayScreen today={today} task={task} session={session} settings={settings} now={now} onShutdown={() => setShutdown(true)} />
  }

  const Tab = ({ v, label }: { v: View; label: string }) => (
    <button
      className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium ${view === v && !shutdown ? 'bg-stone-900 text-stone-50' : 'text-stone-600 hover:bg-stone-100'}`}
      onClick={() => {
        setShutdown(false)
        setView(v)
      }}
    >
      {label}
    </button>
  )

  return (
    <div className="min-h-full">
      {isClockOverridden() && (
        <div className="bg-amber-100 px-3 py-1 text-center text-xs text-amber-900">Giờ giả lập: {today} {toHM(now)}</div>
      )}
      {screen}
      <nav className="fixed inset-x-0 bottom-0 border-t border-stone-200 bg-stone-50/95 backdrop-blur">
        <div className="mx-auto flex max-w-md gap-1 p-2">
          <Tab v="main" label="Hôm nay" />
          <Tab v="week" label="Tuần" />
          <Tab v="settings" label="Cài đặt" />
        </div>
      </nav>
    </div>
  )
}
