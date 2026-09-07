import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { CancelFlow } from '../components/CancelFlow'
import { TaskForm } from '../components/TaskForm'
import { Button, Card, Field, Input, Muted, Page } from '../components/ui'
import { openMorning, startSession } from '../lib/actions'
import { db } from '../lib/db'
import { addDays, fmtDateVi, type ISODate } from '../lib/dates'
import { focusMinutesByDate } from '../lib/metrics'
import type { Settings, Task } from '../lib/types'

/**
 * Buổi sáng: đúng 1 dòng Next Action. Không list. Không sửa kế hoạch.
 * Hai lựa chọn: Bắt đầu N phút · Huỷ… (qua consequence card).
 */
export function MorningScreen({ today, task, settings, now }: { today: ISODate; task?: Task; settings: Settings; now: Date }) {
  const yesterday = addDays(today, -1)
  const yLog = useLiveQuery(() => db.dayLogs.get(yesterday), [yesterday])
  const ySessions = useLiveQuery(() => db.sessions.where('date').equals(yesterday).toArray(), [yesterday], [])
  const yFocus = focusMinutesByDate(ySessions, now.getTime()).get(yesterday) ?? 0
  const anyHistory = useLiveQuery(() => db.sessions.count(), [], 0)
  const emptyYesterday = anyHistory > 0 && yFocus < settings.minFocusMin && !yLog?.locked

  const [bedtime, setBedtime] = useState(yLog?.bedtimeActual ?? settings.bedtimeTarget)
  const [cancelling, setCancelling] = useState(false)

  async function start() {
    if (!task) return
    await openMorning(today, bedtime, now)
    await startSession(task.id, today, settings.minFocusMin, now.getTime())
  }

  if (!task) {
    return (
      <Page subtitle={fmtDateVi(today)} title="Chưa có việc chính hôm nay">
        <Muted>Bình thường thì việc này được chốt lúc đóng ngày hôm trước. Chốt ngay bây giờ, một việc thôi.</Muted>
        <Card>
          <TaskForm scheduledFor={today} onCreated={() => undefined} />
        </Card>
      </Page>
    )
  }

  return (
    <Page subtitle={fmtDateVi(today)} title="Sáng">
      {emptyYesterday && (
        <Card className="bg-stone-100 ring-0">
          <p className="text-stone-700">Hôm qua trống. Bình thường. Việc chính hôm nay vẫn là việc dưới đây.</p>
        </Card>
      )}

      <Card>
        <Muted>Bước đầu tiên</Muted>
        <p className="mt-1 text-2xl font-semibold leading-snug">{task.nextAction}</p>
        <Muted className="mt-3">Việc: {task.title} · ~{task.estimateMin}'</Muted>
      </Card>

      <Card>
        <Field label="Hôm qua ngủ lúc mấy giờ?" hint={`Mục tiêu ${settings.bedtimeTarget}. Chỉ ghi, không phán xét.`}>
          <Input type="time" value={bedtime} onChange={(e) => setBedtime(e.target.value)} />
        </Field>
      </Card>

      <Button size="lg" onClick={() => void start()}>Bắt đầu {settings.minFocusMin} phút</Button>
      <Button variant="ghost" onClick={() => setCancelling(true)}>Huỷ…</Button>

      {cancelling && (
        <CancelFlow
          task={task}
          today={today}
          minFocusMin={settings.minFocusMin}
          onClose={() => setCancelling(false)}
          onStartAnyway={() => {
            setCancelling(false)
            void start()
          }}
          onResolved={() => {
            setCancelling(false)
            void openMorning(today, bedtime, now)
          }}
        />
      )}
    </Page>
  )
}
