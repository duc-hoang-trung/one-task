import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { TaskForm } from '../components/TaskForm'
import { Button, Card, Field, Input, Muted, Page } from '../components/ui'
import { closeDay, completeTask, dropTask, rescheduleTask, resolveParking, deleteParking } from '../lib/actions'
import { db, mainTaskFor } from '../lib/db'
import { addDays, fmtDateVi, type ISODate } from '../lib/dates'
import type { Settings, Task } from '../lib/types'

type Outcome = 'done' | 'progress' | 'none'

/**
 * Nghi thức đóng ngày, 5 bước, ~3 phút:
 *  1. Việc chính hôm nay: xong / có tiến triển / không đụng
 *  2. Next Action cho mai (bắt buộc)
 *  3. Quét Parking Lot về 0
 *  4. 1 lo lắng + 1 bước tiếp theo (constructive worry)
 *  5. Đóng ngày → Night mode
 */
export function ShutdownScreen({
  today, task, settings, now, onCancel,
}: { today: ISODate; task?: Task; settings: Settings; now: Date; onCancel: () => void }) {
  const tomorrow = addDays(today, 1)
  const [step, setStep] = useState(task ? 1 : 2)
  const [outcome, setOutcome] = useState<Outcome>(task ? 'progress' : 'none')
  const [mode, setMode] = useState<'continue' | 'new'>(task && task.status !== 'done' ? 'continue' : 'new')
  const [nextAction, setNextAction] = useState('')
  const [concern, setConcern] = useState('')
  const [nextStep, setNextStep] = useState('')

  const tomorrowTask = useLiveQuery(() => mainTaskFor(tomorrow), [tomorrow])
  const pending = useLiveQuery(() => db.parking.filter((p) => p.resolution === undefined).toArray(), [], [])

  async function pickOutcome(o: Outcome) {
    setOutcome(o)
    if (o === 'done' && task) {
      await completeTask(task.id)
      setMode('new')
    }
    setStep(2)
  }

  async function continueTomorrow() {
    if (!task || nextAction.trim().length < 5) return
    await rescheduleTask(task.id, tomorrow, nextAction)
    setStep(3)
  }

  async function finish() {
    await closeDay({ today, outcome, worry: { concern: concern.trim(), nextStep: nextStep.trim() }, now })
  }

  const Steps = () => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-stone-900' : 'bg-stone-200'}`} />
      ))}
    </div>
  )

  return (
    <Page subtitle={fmtDateVi(today)} title="Đóng ngày">
      <Steps />

      {step === 1 && task && (
        <Card>
          <Muted>1 · Việc chính hôm nay</Muted>
          <h2 className="mt-1 text-lg font-semibold">{task.title}</h2>
          <div className="mt-4 flex flex-col gap-2">
            <Button onClick={() => void pickOutcome('done')}>Xong rồi</Button>
            <Button variant="secondary" onClick={() => void pickOutcome('progress')}>Có tiến triển, chưa xong</Button>
            <Button variant="secondary" onClick={() => void pickOutcome('none')}>Không đụng tới</Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <Muted>2 · Việc chính cho mai ({fmtDateVi(tomorrow)})</Muted>
          {tomorrowTask ? (
            <>
              <p className="mt-2 text-lg font-semibold">{tomorrowTask.title}</p>
              <p className="text-stone-700">Bước đầu: {tomorrowTask.nextAction}</p>
              <Button className="mt-4 w-full" onClick={() => setStep(3)}>Tiếp</Button>
            </>
          ) : mode === 'continue' && task && task.status !== 'done' ? (
            <div className="mt-2 flex flex-col gap-3">
              <p className="text-stone-700">Tiếp tục <strong>{task.title}</strong> vào mai.</p>
              <Field label="Bước đầu tiên khi mở máy sáng mai" hint="Càng cụ thể càng dễ ngủ và càng dễ bắt đầu.">
                <Input autoFocus value={nextAction} onChange={(e) => setNextAction(e.target.value)} placeholder="Mở file X, làm tiếp từ câu 12" />
              </Field>
              <Button disabled={nextAction.trim().length < 5} onClick={() => void continueTomorrow()}>Chốt cho mai</Button>
              <Button variant="ghost" onClick={() => setMode('new')}>Mai làm việc khác</Button>
            </div>
          ) : (
            <div className="mt-2">
              {task && task.status !== 'done' && (
                <Muted className="mb-3">Việc "{task.title}" sẽ được bỏ khỏi kế hoạch (ghi lại là đổi việc).</Muted>
              )}
              <TaskForm
                scheduledFor={tomorrow}
                onCreated={async () => {
                  if (task && task.status !== 'done') await dropTask(task.id, 'đổi việc lúc đóng ngày', today)
                  setStep(3)
                }}
                onCancel={task && task.status !== 'done' ? () => setMode('continue') : undefined}
              />
            </div>
          )}
        </Card>
      )}

      {step === 3 && (
        <Card>
          <Muted>3 · Quét Parking Lot ({pending.length})</Muted>
          {pending.length === 0 ? (
            <>
              <p className="mt-2 text-stone-700">Sạch. Không còn gì treo trong đầu.</p>
              <Button className="mt-4 w-full" onClick={() => setStep(4)}>Tiếp</Button>
            </>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {pending.map((p) => (
                <li key={p.id} className="rounded-xl bg-stone-50 p-3">
                  <p className="mb-2">{p.text}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => void resolveParking(p.id, 'tomorrow', today)}>Lên mai (việc nhỏ)</Button>
                    <Button size="sm" variant="secondary" onClick={() => void resolveParking(p.id, 'later', today)}>Để cuối tuần</Button>
                    <Button size="sm" variant="danger" onClick={() => void deleteParking(p.id)}>Xoá</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {step === 4 && (
        <Card>
          <Muted>4 · Một điều đang lo, một bước tiếp theo</Muted>
          <p className="mt-1 text-sm text-stone-600">Viết ra để não không phải giữ. Tối nay nếu nghĩ tới, nhắc mình: đã có kế hoạch.</p>
          <div className="mt-3 flex flex-col gap-3">
            <Field label="Đang lo gì?">
              <Input value={concern} onChange={(e) => setConcern(e.target.value)} placeholder="Sợ không kịp deadline báo cáo thứ 5" />
            </Field>
            <Field label="Bước tiếp theo nhỏ nhất?">
              <Input value={nextStep} onChange={(e) => setNextStep(e.target.value)} placeholder="Sáng mai gửi mail hỏi anh A số liệu" />
            </Field>
          </div>
          <Button className="mt-4 w-full" onClick={() => setStep(5)}>{concern || nextStep ? 'Tiếp' : 'Không có gì, tiếp'}</Button>
        </Card>
      )}

      {step === 5 && (
        <Card>
          <Muted>5 · Đóng</Muted>
          <p className="mt-2 text-lg">Hôm nay đến đây là đủ.</p>
          <p className="mt-1 text-stone-700">
            Sau khi đóng, app chỉ còn ô Parking Lot cho tới sáng mai. Giờ ngủ mục tiêu: <strong>{settings.bedtimeTarget}</strong>.
          </p>
          <Button size="lg" className="mt-4" onClick={() => void finish()}>Đóng ngày</Button>
        </Card>
      )}

      <Button variant="ghost" onClick={onCancel}>Quay lại, chưa đóng</Button>
    </Page>
  )
}
