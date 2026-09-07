import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { CancelFlow } from '../components/CancelFlow'
import { FocusTimer } from '../components/FocusTimer'
import { ParkingLot } from '../components/ParkingLot'
import { TaskForm } from '../components/TaskForm'
import { Button, Card, Muted, Page } from '../components/ui'
import { completeTask, setDod, startSession, toggleParkingDone } from '../lib/actions'
import { db } from '../lib/db'
import { fmtDateVi, type ISODate } from '../lib/dates'
import { focusMinutesByDate } from '../lib/metrics'
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
  const [cancelling, setCancelling] = useState(false)
  const sessions = useLiveQuery(() => db.sessions.where('date').equals(today).toArray(), [today], [])
  const focusMin = focusMinutesByDate(sessions, now.getTime()).get(today) ?? 0
  const smallTasks = useLiveQuery(() => db.parking.where('forDate').equals(today).toArray(), [today], [])
  const doneToday = useLiveQuery(
    () => db.tasks.where('scheduledFor').equals(today).filter((t) => t.status === 'done').toArray(), [today], [],
  )
  const due = isShutdownDue(now, settings.shutdownTime)
  const unlockedSmall = focusMin >= settings.minFocusMin || doneToday.length > 0

  const allDod = task ? task.dod.length > 0 && task.dod.every((d) => d.done) : false

  return (
    <Page subtitle={fmtDateVi(today)} title={task ? 'Một việc' : doneToday.length ? 'Xong việc chính' : 'Hôm nay'}>
      {due && (
        <Card className="border-0 bg-amber-50 ring-amber-200">
          <p className="font-medium text-stone-900">Đến giờ đóng ngày ({settings.shutdownTime}).</p>
          <Muted>3 phút. Sau đó không mở việc mới. Việc còn dở sẽ có bước tiếp theo cho mai.</Muted>
          <Button className="mt-3" onClick={onShutdown}>Đóng ngày</Button>
        </Card>
      )}

      {task ? (
        <Card>
          <Muted>Việc chính</Muted>
          <h2 className="mt-1 text-xl font-semibold leading-snug">{task.title}</h2>
          <p className="mt-2 text-stone-700"><span className="text-stone-500">Bước tiếp: </span>{task.nextAction}</p>

          <div className="my-5">
            {session ? (
              <FocusTimer session={session} nowMs={now.getTime()} extendMin={settings.extendMin} />
            ) : (
              <Button size="lg" onClick={() => void startSession(task.id, today, settings.minFocusMin, now.getTime())}>
                {focusMin > 0 ? `Tiếp ${settings.minFocusMin} phút` : `Bắt đầu ${settings.minFocusMin} phút`}
              </Button>
            )}
          </div>

          <div>
            <Muted className="mb-2">Definition of Done</Muted>
            <ul className="flex flex-col gap-2">
              {task.dod.map((d, i) => (
                <li key={i}>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-5 w-5 accent-stone-900"
                      checked={d.done}
                      onChange={(e) => {
                        const dod = task.dod.map((x, j) => (j === i ? { ...x, done: e.target.checked } : x))
                        void setDod(task.id, dod)
                      }}
                    />
                    <span className={d.done ? 'text-stone-400 line-through' : ''}>{d.text}</span>
                  </label>
                </li>
              ))}
            </ul>
            {allDod && (
              <Button className="mt-4 w-full" onClick={() => void completeTask(task.id)}>Đóng việc này</Button>
            )}
          </div>

          <div className="mt-5 flex items-center justify-between">
            <Muted>Hôm nay đã làm {focusMin}' · ước lượng {task.estimateMin}'</Muted>
            <Button variant="ghost" size="sm" onClick={() => setCancelling(true)}>Huỷ…</Button>
          </div>
        </Card>
      ) : doneToday.length > 0 ? (
        <Card>
          <p className="text-lg">✓ {doneToday[0].title}</p>
          <Muted className="mt-2">Việc chính hôm nay đã đóng. Việc nhỏ (nếu có) ở dưới. Đến giờ thì đóng ngày.</Muted>
        </Card>
      ) : (
        <Card>
          <TaskForm scheduledFor={today} heading="Việc chính hôm nay là gì?" onCreated={() => undefined} />
        </Card>
      )}

      <ParkingLot today={today} />

      {smallTasks.length > 0 && (
        <Card className={unlockedSmall ? '' : 'opacity-60'}>
          <Muted className="mb-2">
            Việc nhỏ hôm nay {unlockedSmall ? '' : `· mở khoá sau ${settings.minFocusMin}' việc chính`}
          </Muted>
          <ul className="flex flex-col gap-2">
            {smallTasks.map((p) => (
              <li key={p.id}>
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox" className="mt-1 h-5 w-5 accent-stone-900" disabled={!unlockedSmall}
                    checked={!!p.doneAt} onChange={(e) => void toggleParkingDone(p.id, e.target.checked)}
                  />
                  <span className={p.doneAt ? 'text-stone-400 line-through' : ''}>{p.text}</span>
                </label>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {!due && (
        <Button variant="ghost" onClick={onShutdown}>Đóng ngày sớm</Button>
      )}

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
