import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { CalendarDays, LayoutGrid, Moon, Settings as SettingsIcon, Sun, Target } from 'lucide-react'
import { useNow } from './hooks'
import { LangContext, resolveLang, useT } from './i18n'
import { activeSession, closeStaleSessions } from './lib/actions'
import { isClockOverridden } from './lib/clock'
import { db, mainTaskFor } from './lib/db'
import { logicalDate, toHM } from './lib/dates'
import { alertUser, once } from './lib/notify'
import { computePhase, isShutdownDue } from './lib/phase'
import { toHM as hm } from './lib/dates'
import { tasksFor } from './lib/db'
import { DEFAULT_SETTINGS, type Settings } from './lib/types'
import { CalendarScreen } from './screens/CalendarScreen'
import { MorningScreen } from './screens/MorningScreen'
import { initSync } from './sync'
import { NightScreen } from './screens/NightScreen'
import { PlanScreen } from './screens/PlanScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { ShutdownScreen } from './screens/ShutdownScreen'
import { TodayScreen } from './screens/TodayScreen'
import { GoalsScreen } from './screens/GoalsScreen'

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

  // Nhắc: đến giờ đóng ngày (một lần/ngày) và đến giờ bắt đầu một việc (một lần/việc).
  const todayTasks = useLiveQuery(() => tasksFor(today), [today], [])
  useEffect(() => {
    if (!settings.onboarded || todayLog?.locked) return
    if (isShutdownDue(now, settings.shutdownTime) && hm(now) === settings.shutdownTime) {
      once(`shutdown:${today}`, () => alertUser(settings.notifications, t('notif.shutdown'), t('notif.shutdown.body'), 'gentle', 'shutdown'))
    }
    const cur = hm(now)
    for (const x of todayTasks) {
      if (x.startAt === cur && (x.status === 'planned' || x.status === 'active')) {
        once(`start:${x.id}:${today}`, () => alertUser(settings.notifications, t('notif.startAt', { title: x.title }), x.nextAction || undefined, 'gentle', `start-${x.id}`))
      }
    }
  }, [now, today, todayLog?.locked, settings, todayTasks, t])

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
    screen = <GoalsScreen today={today} settings={settings} now={now} />
  } else if (view === 'settings') {
    screen = <SettingsScreen settings={settings} />
  } else if (phase === 'morning') {
    screen = <MorningScreen today={today} task={task} settings={settings} now={now} />
  } else {
    screen = <TodayScreen today={today} task={task} session={session} settings={settings} now={now} onShutdown={() => setShutdown(true)} />
  }

  const tabs: { v: View; label: string; icon: React.ReactNode }[] = [
    { v: 'main', label: t('nav.today'), icon: <Sun size={20} strokeWidth={1.75} /> },
    { v: 'plan', label: t('nav.plan'), icon: <LayoutGrid size={20} strokeWidth={1.75} /> },
    { v: 'calendar', label: t('nav.calendar'), icon: <CalendarDays size={20} strokeWidth={1.75} /> },
    { v: 'week', label: t('nav.goals'), icon: <Target size={20} strokeWidth={1.75} /> },
    { v: 'settings', label: t('nav.settings'), icon: <SettingsIcon size={20} strokeWidth={1.75} /> },
  ]
  const goTo = (v: View) => { setShutdown(false); setView(v) }

  return (
    <div className="min-h-full lg:flex">
      {/* Sidebar: màn rộng */}
      <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-56 lg:shrink-0 lg:flex-col lg:border-r lg:border-line lg:bg-paper-2/50 lg:px-3 lg:py-6">
        <p className="font-display px-3 text-2xl tracking-tight">{t('app.name')}</p>
        <nav className="mt-6 flex flex-col gap-0.5">
          {tabs.map(({ v, label, icon }) => {
            const active = view === v && !shutdown
            return (
              <button
                key={v}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-left text-[14px] font-medium transition-colors ${active ? 'bg-paper text-accent shadow-card' : 'text-ink-2 hover:bg-paper-3/60 hover:text-ink'}`}
                onClick={() => goTo(v)}
              >
                {icon}{label}
              </button>
            )
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-2 px-1">
          {isClockOverridden() && <p className="rounded-lg bg-accent-soft px-2 py-1 text-xs text-ink-2">{t('clock.fake')}: {today} {toHM(now)}</p>}
          <button
            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-left text-[14px] font-medium transition-colors ${shutdown ? 'bg-paper text-accent shadow-card' : 'text-ink-2 hover:bg-paper-3/60 hover:text-ink'}`}
            onClick={() => setShutdown(true)}
          >
            <Moon size={20} strokeWidth={1.75} />{t('nav.shutdown')}
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {isClockOverridden() && (
          <div className="bg-accent-soft px-3 py-1 text-center text-xs text-ink-2 lg:hidden">{t('clock.fake')}: {today} {toHM(now)}</div>
        )}
        {screen}
      </div>

      {/* Tab bar: điện thoại */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/90 backdrop-blur-md lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto flex max-w-md gap-1 px-3 py-1.5">
          {tabs.map(({ v, label, icon }) => {
            const active = view === v && !shutdown
            return (
              <button
                key={v}
                className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] font-medium transition-colors ${active ? 'text-accent' : 'text-ink-3 hover:text-ink-2'}`}
                onClick={() => goTo(v)}
              >
                {icon}
                {label}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
