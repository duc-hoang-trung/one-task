import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Check, ChevronDown, ChevronRight, Moon, Play, Star } from 'lucide-react'
import { CancelFlow } from '../components/CancelFlow'
import { SortableItem, SortableList } from '../components/dnd/SortableList'
import { FocusTimer } from '../components/FocusTimer'
import { ParkingLot } from '../components/ParkingLot'
import { QuickAdd } from '../components/QuickAdd'
import { beginFocus, defaultFocusMin, DurationChips, StartFocusModal } from '../components/StartFocus'
import { TaskRow } from '../components/TaskRow'
import { TaskSheet } from '../components/TaskSheet'
import { Button, Card, Col, Columns, Eyebrow, Muted, Page } from '../components/ui'
import { fmtDate, useT } from '../i18n'
import { completeTask, reorderTasks, setDod, setMain } from '../lib/actions'
import { db, isOpen, tasksFor } from '../lib/db'
import type { ISODate } from '../lib/dates'
import { focusMinutesByDate, focusStreakMin, sessionMinutes } from '../lib/metrics'
import { isShutdownDue } from '../lib/phase'
import type { Area, Session, Settings, Task } from '../lib/types'

export function TodayScreen({
  today, task: mit, session, settings, now, onShutdown,
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
  const [editing, setEditing] = useState<Task | null>(null)
  const [starting, setStarting] = useState<Task | null>(null)
  const [showDone, setShowDone] = useState(false)
  // Thời lượng cho nút Bắt đầu của MIT: ước lượng (nếu vừa phải) → lần chọn gần nhất → phút khởi động
  const [mitMin, setMitMin] = useState(() => defaultFocusMin(mit, settings))
  useEffect(() => { setMitMin(defaultFocusMin(mit, settings)) }, [mit?.id, mit?.estimateMin]) // eslint-disable-line react-hooks/exhaustive-deps

  const tasks = useLiveQuery(() => tasksFor(today), [today], [])
  const sessions = useLiveQuery(() => db.sessions.where('date').equals(today).toArray(), [today], [])
  const nowMs = now.getTime()
  const focusMin = focusMinutesByDate(sessions, nowMs).get(today) ?? 0
  const streak = focusStreakMin(sessions, nowMs)
  const minutesByTask = new Map<string, number>()
  for (const s of sessions) if (s.kind !== 'break') minutesByTask.set(s.taskId, (minutesByTask.get(s.taskId) ?? 0) + sessionMinutes(s, nowMs))

  const open = tasks.filter(isOpen)
  const done = tasks.filter((x) => x.status === 'done')
  const due = isShutdownDue(now, settings.shutdownTime)
  const focusingTask = session && session.kind !== 'break' ? tasks.find((x) => x.id === session.taskId) : undefined
  const timerOnMit = !!session && (!!mit && (session.taskId === mit.id || session.kind === 'break'))
  const canCloseMit = mit ? mit.dod.length === 0 || mit.dod.every((d) => d.done) : false

  // MIT đã có card riêng ở trên; không lặp lại trong danh sách
  const listed = open.filter((x) => x.id !== mit?.id)
  const groups: { area: Area; items: Task[] }[] = (['work', 'personal'] as Area[])
    .map((area) => ({ area, items: listed.filter((x) => x.area === area) }))
    .filter((g) => g.items.length > 0)

  const progress = tasks.length > 0 && (
    <div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper-3">
        <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${(done.length / tasks.length) * 100}%` }} />
      </div>
      <Muted className="mt-1.5">{t('today.progressBar', { done: done.length, total: tasks.length, min: focusMin })}</Muted>
    </div>
  )

  return (
    <Page subtitle={fmtDate(lang, today)} title={t('today.title')} actions={!due && <Button variant="ghost" size="sm" onClick={onShutdown}><Moon size={14} />{t('today.shutdownEarly')}</Button>}>
      {progress}
      <Columns cols="5/7">
        <Col className="lg:sticky lg:top-6">
          {due && (
            <Card tone="accent">
              <p className="font-medium">{t('today.shutdownDue', { t: settings.shutdownTime })}</p>
              <Muted className="text-ink-2">{t('today.shutdownDueHint')}</Muted>
              <Button className="mt-3" variant="accent" onClick={onShutdown}><Moon size={16} />{t('today.shutdown')}</Button>
            </Card>
          )}

          {/* timer đang chạy cho việc không phải MIT */}
          {session && !timerOnMit && (
            <Card>
              <Eyebrow>{t('today.focusing', { title: focusingTask?.title ?? '' })}</Eyebrow>
              <div className="mt-3">
                <FocusTimer session={session} settings={settings} streakMin={streak} today={today} taskId={session.taskId || focusingTask?.id || ''} />
              </div>
            </Card>
          )}

          {/* MIT */}
          {mit ? (
            <Card>
              <Eyebrow className="flex items-center gap-1"><Star size={12} className="fill-accent text-accent" />{t('today.mit')}</Eyebrow>
              <h2 className="font-display mt-1.5 text-[24px] leading-tight">{mit.title}</h2>
              {mit.nextAction && <p className="mt-2 text-ink-2"><span className="text-ink-3">{t('today.nextStep')}: </span>{mit.nextAction}</p>}

              <div className="my-6">
                {session && timerOnMit ? (
                  <FocusTimer session={session} settings={settings} streakMin={streak} today={today} taskId={mit.id} />
                ) : !session ? (
                  <div className="flex flex-col gap-3">
                    <Button size="lg" onClick={() => void beginFocus(mit, today, mitMin, settings)}>
                      <Play size={18} />
                      {(minutesByTask.get(mit.id) ?? 0) > 0 ? t('today.continue', { n: mitMin }) : t('today.start', { n: mitMin })}
                    </Button>
                    <DurationChips value={mitMin} onChange={setMitMin} settings={settings} estimate={mit.estimateMin} />
                  </div>
                ) : null}
              </div>

              {mit.dod.length > 0 && (
                <div>
                  <Eyebrow className="mb-2">{t('today.dod')}</Eyebrow>
                  <ul className="flex flex-col gap-2">
                    {mit.dod.map((d, i) => (
                      <li key={i}>
                        <label className="flex cursor-pointer items-start gap-3">
                          <input
                            type="checkbox" className="mt-1 h-5 w-5 accent-accent" checked={d.done}
                            onChange={(e) => void setDod(mit.id, mit.dod.map((x, j) => (j === i ? { ...x, done: e.target.checked } : x)))}
                          />
                          <span className={d.done ? 'text-ink-3 line-through' : ''}>{d.text}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {canCloseMit && (
                <Button className="mt-4 w-full" variant={mit.dod.length ? 'primary' : 'secondary'} onClick={() => void completeTask(mit.id)}>
                  <Check size={16} />{t('today.close')}
                </Button>
              )}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
                <Muted>
                  {mit.estimateMin
                    ? t('today.progress', { done: minutesByTask.get(mit.id) ?? 0, est: mit.estimateMin })
                    : t('today.progressNoEst', { done: minutesByTask.get(mit.id) ?? 0 })}
                </Muted>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(mit)}>{t('row.edit')}</Button>
                  <Button variant="ghost" size="sm" onClick={() => void setMain(mit.id, false)}>{t('row.unstar')}</Button>
                  <Button variant="ghost" size="sm" onClick={() => setCancelling(true)}>{t('morn.cancel')}</Button>
                </div>
              </div>
            </Card>
          ) : open.length > 0 ? (
            <Card tone="accent" className="py-4">
              <p className="flex items-center gap-2 text-sm text-ink-2"><Star size={14} className="shrink-0" />{t('today.pickMit')}</p>
            </Card>
          ) : null}
        </Col>

        <Col>
          {/* danh sách theo khu vực */}
          <Card className="py-4">
            <Eyebrow className="mb-2">{t('today.list')}</Eyebrow>
            {listed.length === 0 && done.length === 0 && <Muted className="mb-3">{t('today.empty')}</Muted>}
            {groups.map((g) => (
              <div key={g.area} className="mb-3">
                <p className="mb-1.5 flex items-baseline gap-2 text-[12px] font-semibold uppercase tracking-wide text-ink-3">
                  {t(`area.${g.area}`)} <span className="font-normal">{g.items.length}</span>
                </p>
                <SortableList ids={g.items.map((x) => x.id)} onReorder={(ids) => void reorderTasks(ids)}>
                  <ul className="flex flex-col gap-1.5">
                    {g.items.map((x) => (
                      <SortableItem key={x.id} id={x.id}>
                        <TaskRow task={x} today={today} minutes={minutesByTask.get(x.id) ?? 0} onFocus={setStarting} onEdit={setEditing} />
                      </SortableItem>
                    ))}
                  </ul>
                </SortableList>
              </div>
            ))}
            <QuickAdd scheduledFor={today} defaultArea={settings.defaultArea} />
            {done.length > 0 && (
              <div className="mt-3">
                <button className="flex items-center gap-1 text-[12px] font-semibold uppercase tracking-wide text-ink-3" onClick={() => setShowDone((s) => !s)}>
                  {showDone ? <ChevronDown size={14} /> : <ChevronRight size={14} />}{t('today.doneSection', { n: done.length })}
                </button>
                {showDone && (
                  <ul className="mt-1.5 flex flex-col gap-1">
                    {done.map((x) => <li key={x.id}><TaskRow task={x} today={today} minutes={minutesByTask.get(x.id) ?? 0} onEdit={setEditing} compact /></li>)}
                  </ul>
                )}
              </div>
            )}
          </Card>

          <Card className="py-4">
            <ParkingLot today={today} />
          </Card>
        </Col>
      </Columns>

      {editing && <TaskSheet task={editing} today={today} onClose={() => setEditing(null)} />}
      {starting && <StartFocusModal task={starting} today={today} settings={settings} onClose={() => setStarting(null)} />}
      {cancelling && mit && (
        <CancelFlow
          task={mit} today={today} minFocusMin={settings.minFocusMin}
          onClose={() => setCancelling(false)}
          onStartAnyway={() => { setCancelling(false); void beginFocus(mit, today, settings.minFocusMin, settings) }}
          onResolved={() => setCancelling(false)}
        />
      )}
    </Page>
  )
}
