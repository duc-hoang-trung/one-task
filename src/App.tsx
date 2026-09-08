import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { CalendarDays, LayoutGrid, Settings as SettingsIcon, Sun, Target } from 'lucide-react'
import { useNow } from './hooks'
import { LangContext, resolveLang, useT } from './i18n'
import { activeSession, closeStaleSessions } from './lib/actions'
import { isClockOverridden } from './lib/clock'
import { db, mainTaskFor } from './lib/db'
import { logicalDate, toHM } from './lib/dates'
import { computePhase } from './lib/phase'
import { DEFAULT_SETTINGS, type Settings } from './lib/types'
import { CalendarScreen } from './screens/CalendarScreen'
import { MorningScreen } from './screens/MorningScreen'
import { initSync } from './sync'
import { NightScreen } from './screens/NightScreen'
import { PlanScreen } from './screens/PlanScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { ShutdownScreen } from './screens/ShutdownScreen'
import { TodayScreen } from './screens/TodayScreen'
import { WeekScreen } from './screens/WeekScreen'

type View = 'main' | 'plan' | 'calendar' | 'week' | 'settings'

export default function App() {
  useEffect(() => initSync(), [])
  // Chỉ đọc trong liveQuery (transaction read-only); merge default ở ngoài.
  const stored = useLiveQuery(() => db.settings.get('default'), [], null)
  const settings: Settings | undefined = stored === null ? undefined : { ...DEFAULT_SETTINGS, ...stored }
  if (settings === undefined) return null
  return (
    <LangContext.Provider value={resolveLang(settings.lang)}>
      <Shell settings={settings} />
    </LangContext.Provider>
  )
}

function Shell({ settings }: { settings: Settings }) {
  const { t } = useT()
  const now = useNow()
  const today = logicalDate(now)
  const [view, setView] = useState<View>('main')
  const [shutdown, setShutdown] = useState(false)

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

  if (!settings.onboarded) return <SettingsScreen settings={settings} onboarding />

  const phase = computePhase({ todayLog })
  if (phase === 'night') return <NightScreen today={today} settings={settings} />

  let screen
  if (shutdown) {
    screen = <ShutdownScreen today={today} task={task} settings={settings} now={now} onCancel={() => setShutdown(false)} />
  } else if (view === 'calendar') {
    screen = <CalendarScreen today={today} settings={settings} now={now} onGoToday={() => setView('main')} />
  } else if (view === 'plan') {
    screen = <PlanScreen today={today} settings={settings} />
  } else if (view === 'week') {
    screen = <WeekScreen today={today} settings={settings} now={now} />
  } else if (view === 'settings') {
    screen = <SettingsScreen settings={settings} />
  } else if (phase === 'morning') {
    screen = <MorningScreen today={today} task={task} settings={settings} now={now} />
  } else {
    screen = <TodayScreen today={today} task={task} session={session} settings={settings} now={now} onShutdown={() => setShutdown(true)} />
  }

  const Tab = ({ v, label, icon }: { v: View; label: string; icon: React.ReactNode }) => {
    const active = view === v && !shutdown
    return (
      <button
        className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] font-medium transition-colors ${active ? 'text-accent' : 'text-ink-3 hover:text-ink-2'}`}
        onClick={() => {
          setShutdown(false)
          setView(v)
        }}
      >
        {icon}
        {label}
      </button>
    )
  }

  return (
    <div className="min-h-full">
      {isClockOverridden() && (
        <div className="bg-accent-soft px-3 py-1 text-center text-xs text-ink-2">{t('clock.fake')}: {today} {toHM(now)}</div>
      )}
      {screen}
      <nav className="fixed inset-x-0 bottom-0 border-t border-line bg-paper/90 backdrop-blur-md" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto flex max-w-md gap-1 px-3 py-1.5">
          <Tab v="main" label={t('nav.today')} icon={<Sun size={20} strokeWidth={1.75} />} />
          <Tab v="plan" label={t('nav.plan')} icon={<LayoutGrid size={20} strokeWidth={1.75} />} />
          <Tab v="calendar" label={t('nav.calendar')} icon={<CalendarDays size={20} strokeWidth={1.75} />} />
          <Tab v="week" label={t('nav.week')} icon={<Target size={20} strokeWidth={1.75} />} />
          <Tab v="settings" label={t('nav.settings')} icon={<SettingsIcon size={20} strokeWidth={1.75} />} />
        </div>
      </nav>
    </div>
  )
}
