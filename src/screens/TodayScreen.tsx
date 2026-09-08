import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Check, Moon } from 'lucide-react'
import { CancelFlow } from '../components/CancelFlow'
import { FocusTimer } from '../components/FocusTimer'
import { ParkingLot } from '../components/ParkingLot'
import { TaskForm } from '../components/TaskForm'
import { Button, Card, Eyebrow, Muted, Page } from '../components/ui'
import { fmtDate, useT } from '../i18n'
import { completeTask, setDod, startSession, toggleParkingDone } from '../lib/actions'
import { db } from '../lib/db'
import type { ISODate } from '../lib/dates'
import { focusMinutesByDate, focusStreakMin } from '../lib/metrics'
import { isShutdownDue } from '../lib/phase'
import type { Session, Settings, Task } from '../lib/types'

export function TodayScreen({
  today, task, session, settings, now, onShutdown,
}: {
  today: ISODate
  task?: Task
  session?: Session
  settings: Settings
  now: Date
  onShutdown: () => void
}) {
  const { t, lang } = useT()
  const [cancelling, setCancelling] = useState(false)
  const sessions = useLiveQuery(() => db.sessions.where('date').equals(today).toArray(), [today], [])
  const focusMin = focusMinutesByDate(sessions, now.getTime()).get(today) ?? 0
  const streak = focusStreakMin(sessions, now.getTime())
  const smallTasks = useLiveQuery(() => db.parking.where('forDate').equals(today).toArray(), [today], [])
  const doneToday = useLiveQuery(
    () => db.tasks.where('scheduledFor').equals(today).filter((x) => x.status === 'done').toArray(), [today], [],
  )
  const due = isShutdownDue(now, settings.shutdownTime)
  const unlockedSmall = focusMin >= settings.minFocusMin || doneToday.length > 0
  const canClose = task ? task.dod.length === 0 || task.dod.every((d) => d.done) : false

  return (
    <Page subtitle={fmtDate(lang, today)} title={task ? t('today.oneThing') : doneToday.length ? t('today.mainDone') : t('today.title')}>
      {due && (
        <Card tone="accent">
          <p className="font-medium">{t('today.shutdownDue', { t: settings.shutdownTime })}</p>
          <Muted className="text-ink-2">{t('today.shutdownDueHint')}</Muted>
          <Button className="mt-3" variant="accent" onClick={onShutdown}><Moon size={16} />{t('today.shutdown')}</Button>
        </Card>
      )}

      {task ? (
        <Card>
          <Eyebrow>{t('today.mainTask')}</Eyebrow>
          <h2 className="font-display mt-1.5 text-[24px] leading-tight">{task.title}</h2>
          {task.nextAction && (
            <p className="mt-2 text-ink-2"><span className="text-ink-3">{t('today.nextStep')}: </span>{task.nextAction}</p>
          )}

          <div className="my-6">
            {session ? (
              <FocusTimer session={session} nowMs={now.getTime()} settings={settings} streakMin={streak} today={today} taskId={task.id} />
            ) : (
              <Button size="lg" onClick={() => void startSession(task.id, today, settings.minFocusMin, now.getTime())}>
                {focusMin > 0 ? t('today.continue', { n: settings.minFocusMin }) : t('today.start', { n: settings.minFocusMin })}
              </Button>
            )}
          </div>

          {task.dod.length > 0 && (
            <div>
              <Eyebrow className="mb-2">{t('today.dod')}</Eyebrow>
              <ul className="flex flex-col gap-2">
                {task.dod.map((d, i) => (
                  <li key={i}>
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1 h-5 w-5 accent-accent"
                        checked={d.done}
                        onChange={(e) => {
                          const dod = task.dod.map((x, j) => (j === i ? { ...x, done: e.target.checked } : x))
                          void setDod(task.id, dod)
                        }}
                      />
                      <span className={d.done ? 'text-ink-3 line-through' : ''}>{d.text}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {canClose && (
            <Button className="mt-4 w-full" variant={task.dod.length ? 'primary' : 'secondary'} onClick={() => void completeTask(task.id)}>
              <Check size={16} />{t('today.close')}
            </Button>
          )}

          <div className="mt-5 flex items-center justify-between">
            <Muted>{task.estimateMin ? t('today.progress', { done: focusMin, est: task.estimateMin }) : t('today.progressNoEst', { done: focusMin })}</Muted>
            <Button variant="ghost" size="sm" onClick={() => setCancelling(true)}>{t('morn.cancel')}</Button>
          </div>
        </Card>
      ) : doneToday.length > 0 ? (
        <Card>
          <p className="font-display text-xl"><span className="text-good">✓</span> {doneToday[0].title}</p>
          <Muted className="mt-2">{t('today.doneHint')}</Muted>
        </Card>
      ) : (
        <Card>
          <TaskForm scheduledFor={today} heading={t('today.whatIsMain')} onCreated={() => undefined} />
        </Card>
      )}

      <Card className="py-4">
        <ParkingLot today={today} />
      </Card>

      {smallTasks.length > 0 && (
        <Card className={unlockedSmall ? '' : 'opacity-60'}>
          <Eyebrow className="mb-2">
            {t('today.small')}{unlockedSmall ? '' : ` · ${t('today.smallLocked', { n: settings.minFocusMin })}`}
          </Eyebrow>
          <ul className="flex flex-col gap-2">
            {smallTasks.map((p) => (
              <li key={p.id}>
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox" className="mt-1 h-5 w-5 accent-accent" disabled={!unlockedSmall}
                    checked={!!p.doneAt} onChange={(e) => void toggleParkingDone(p.id, e.target.checked)}
                  />
                  <span className={p.doneAt ? 'text-ink-3 line-through' : ''}>{p.text}</span>
                </label>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {!due && <Button variant="ghost" onClick={onShutdown}>{t('today.shutdownEarly')}</Button>}

      {cancelling && task && (
        <CancelFlow
          task={task}
          today={today}
          minFocusMin={settings.minFocusMin}
          onClose={() => setCancelling(false)}
          onStartAnyway={() => {
            setCancelling(false)
            void startSession(task.id, today, settings.minFocusMin, now.getTime())
          }}
          onResolved={() => setCancelling(false)}
        />
      )}
    </Page>
  )
}
