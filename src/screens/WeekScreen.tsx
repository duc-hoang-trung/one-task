import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Button, Card, Input, Muted, Page } from '../components/ui'
import { addGoal, deleteParking, MAX_GOALS_PER_WEEK, resolveParking, setGoalStatus } from '../lib/actions'
import { db } from '../lib/db'
import { addDays, fmtDateVi, weekStart, type ISODate } from '../lib/dates'
import { computeWeekMetrics } from '../lib/metrics'
import type { Settings, WeekGoal } from '../lib/types'
import { checkTitle } from '../lib/vagueness'

function GoalSlots({ ws, label, today }: { ws: ISODate; label: string; today: ISODate }) {
  const goals = useLiveQuery(() => db.goals.where('weekStart').equals(ws).toArray(), [ws], [])
  const open = goals.filter((g) => g.status === 'open')
  const closed = goals.filter((g) => g.status !== 'open')
  const [title, setTitle] = useState('')
  const [err, setErr] = useState('')
  const isCurrent = ws === weekStart(today)

  async function add() {
    const c = checkTitle(title)
    if (!c.ok) {
      setErr(`${c.reason} ${c.hint}`)
      return
    }
    const g = await addGoal(ws, title)
    if (!g) {
      setErr(`Tối đa ${MAX_GOALS_PER_WEEK} mục tiêu. Đóng hoặc bỏ một cái trước.`)
      return
    }
    setTitle('')
    setErr('')
  }

  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">{label}</h2>
        <Muted>{fmtDateVi(ws)} → {fmtDateVi(addDays(ws, 6))}</Muted>
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {Array.from({ length: MAX_GOALS_PER_WEEK }).map((_, i) => {
          const g: WeekGoal | undefined = open[i]
          return (
            <li key={g?.id ?? `empty-${i}`} className={`rounded-xl border p-3 ${g ? 'border-stone-300' : 'border-dashed border-stone-300 text-stone-400'}`}>
              {g ? (
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium">{g.title}</span>
                  {isCurrent && (
                    <span className="flex shrink-0 gap-1">
                      <Button size="sm" variant="secondary" onClick={() => void setGoalStatus(g.id, 'done')}>Xong</Button>
                      <Button size="sm" variant="ghost" onClick={() => void setGoalStatus(g.id, 'dropped')}>Bỏ</Button>
                    </span>
                  )}
                </div>
              ) : (
                <span>Slot {i + 1} trống</span>
              )}
            </li>
          )
        })}
      </ul>
      {open.length < MAX_GOALS_PER_WEEK && (
        <div className="mt-3">
          <div className="flex gap-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Hoàn thành 3 module đầu khoá S3" onKeyDown={(e) => e.key === 'Enter' && void add()} />
            <Button onClick={() => void add()}>Thêm</Button>
          </div>
          {err && <p className="mt-1 text-sm text-rose-700">{err}</p>}
        </div>
      )}
      {closed.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1">
          {closed.map((g) => (
            <li key={g.id} className="text-sm text-stone-500">
              {g.status === 'done' ? '✓' : '×'} {g.title}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function Review({ ws, today, settings, nowMs }: { ws: ISODate; today: ISODate; settings: Settings; nowMs: number }) {
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], [])
  const dayLogs = useLiveQuery(() => db.dayLogs.toArray(), [], [])
  const tasks = useLiveQuery(() => db.tasks.toArray(), [], [])
  const m = computeWeekMetrics({ weekStart: ws, today, sessions, dayLogs, tasks, settings, nowMs })
  const deferTotal = m.deferrals['new-info'] + m.deferrals.urgent + m.deferrals['dont-want']

  const Row = ({ k, v, note }: { k: string; v: string; note?: string }) => (
    <div className="flex items-baseline justify-between border-b border-stone-100 py-2 last:border-0">
      <span className="text-stone-700">{k}</span>
      <span className="text-right">
        <span className="text-lg font-semibold tabular-nums">{v}</span>
        {note && <Muted>{note}</Muted>}
      </span>
    </div>
  )

  return (
    <Card>
      <h2 className="font-semibold">Review tuần</h2>
      <Muted>{m.daysCounted} ngày đã qua. Không có streak. Chỉ có số.</Muted>
      <div className="mt-2">
        <Row k={`Ngày có ≥${settings.minFocusMin}' việc chính`} v={`${m.daysWithFocus}/${m.daysCounted}`} />
        <Row k="Việc chính đã đóng" v={String(m.tasksDone)} />
        <Row k="Đóng ngày đúng giờ" v={`${m.shutdownOnTime}/${m.daysCounted}`} note={`${m.daysClosed} đêm có đóng`} />
        <Row
          k="Ngủ so với mục tiêu"
          v={m.bedtimeDeltaMin === null ? '—' : `${m.bedtimeDeltaMin > 0 ? '+' : ''}${m.bedtimeDeltaMin}'`}
          note={m.bedtimeDeltaMin === null ? 'chưa có dữ liệu' : m.bedtimeDeltaMin > 0 ? 'muộn hơn' : 'sớm hơn hoặc đúng'}
        />
        <Row k="Lần quay lại sau ngày trống" v={String(m.returns)} note="càng nhiều càng tốt" />
        <Row
          k="Dời / huỷ việc"
          v={String(deferTotal)}
          note={deferTotal ? `${m.deferrals['dont-want']} không muốn · ${m.deferrals.urgent} khẩn · ${m.deferrals['new-info']} hết cần` : undefined}
        />
      </div>
    </Card>
  )
}

function LaterItems({ today }: { today: ISODate }) {
  const items = useLiveQuery(() => db.parking.where('resolution').equals('later').toArray(), [], [])
  if (items.length === 0) return null
  return (
    <Card>
      <h2 className="font-semibold">Để cuối tuần ({items.length})</h2>
      <Muted>Mỗi cái: lên mai làm việc nhỏ, hoặc xoá. Muốn thành việc chính thì đưa vào mục tiêu tuần rồi tạo lúc đóng ngày.</Muted>
      <ul className="mt-3 flex flex-col gap-3">
        {items.map((p) => (
          <li key={p.id} className="rounded-xl bg-stone-50 p-3">
            <p className="mb-2">{p.text}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => void resolveParking(p.id, 'tomorrow', today)}>Lên mai</Button>
              <Button size="sm" variant="danger" onClick={() => void deleteParking(p.id)}>Xoá</Button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export function WeekScreen({ today, settings, now }: { today: ISODate; settings: Settings; now: Date }) {
  const ws = weekStart(today)
  const [showPrev, setShowPrev] = useState(false)
  return (
    <Page title="Tuần" subtitle="Tối đa 2 mục tiêu. Không mở thêm.">
      <GoalSlots ws={ws} label="Tuần này" today={today} />
      <Review ws={showPrev ? addDays(ws, -7) : ws} today={today} settings={settings} nowMs={now.getTime()} />
      <Button variant="ghost" size="sm" onClick={() => setShowPrev((s) => !s)}>{showPrev ? 'Xem tuần này' : 'Xem tuần trước'}</Button>
      <LaterItems today={today} />
      <GoalSlots ws={addDays(ws, 7)} label="Tuần tới" today={today} />
    </Page>
  )
}
