import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { createTask, type NewTaskInput } from '../lib/actions'
import { db } from '../lib/db'
import { weekStart, type ISODate } from '../lib/dates'
import { checkEstimate, checkTitle, MAX_ESTIMATE_MIN } from '../lib/vagueness'
import { Button, Field, Input, Textarea } from './ui'

/**
 * Form tạo việc chính. 4 trường bắt buộc: Việc · DoD · Hậu quả · Ước lượng, cộng Next Action.
 * Bộ lọc mơ hồ chặn cứng ở tiêu đề; ước lượng > 90' bắt tách.
 */
export function TaskForm({
  scheduledFor, heading, onCreated, onCancel,
}: {
  scheduledFor: ISODate
  heading?: string
  onCreated: (taskId: string) => void
  onCancel?: () => void
}) {
  const goals = useLiveQuery(
    () => db.goals.where('weekStart').equals(weekStart(scheduledFor)).filter((g) => g.status === 'open').toArray(),
    [scheduledFor], [],
  )
  const [title, setTitle] = useState('')
  const [dod, setDod] = useState('')
  const [consequence, setConsequence] = useState('')
  const [estimate, setEstimate] = useState('')
  const [nextAction, setNextAction] = useState('')
  const [goalId, setGoalId] = useState('')
  const [touched, setTouched] = useState(false)

  const titleCheck = checkTitle(title)
  const estCheck = checkEstimate(Number(estimate))
  const dodLines = dod.split('\n').map((s) => s.trim()).filter(Boolean)
  const errors = {
    title: !titleCheck.ok ? `${titleCheck.reason} ${titleCheck.hint}` : '',
    dod: dodLines.length === 0 ? 'Cần ít nhất 1 dòng kiểm được. Ví dụ: "20 câu có đáp án".' : '',
    consequence: consequence.trim().length < 5 ? 'Viết 1 câu: nếu không làm thì mất gì? Chính câu này sẽ hiện lại khi bạn định huỷ.' : '',
    estimate: !estCheck.ok ? `${estCheck.reason} ${estCheck.hint}` : '',
    nextAction: nextAction.trim().length < 5 ? 'Bước đầu tiên cụ thể để mở máy là làm ngay. Ví dụ: "Mở quiz S3, làm câu 1–5".' : '',
    goal: goals.length > 0 && !goalId ? 'Việc phải phục vụ 1 trong 2 mục tiêu tuần.' : '',
  }
  const valid = Object.values(errors).every((e) => !e)

  async function submit() {
    setTouched(true)
    if (!valid) return
    const input: NewTaskInput = {
      title, dod: dodLines, consequence, estimateMin: Number(estimate), nextAction, scheduledFor, goalId: goalId || undefined,
    }
    const t = await createTask(input)
    onCreated(t.id)
  }

  const err = (k: keyof typeof errors) => (touched ? errors[k] : '')

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      {heading && <h2 className="text-lg font-semibold">{heading}</h2>}

      {goals.length > 0 && (
        <Field label="Phục vụ mục tiêu tuần" error={err('goal')}>
          <div className="flex flex-col gap-2">
            {goals.map((g) => (
              <label key={g.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 ${goalId === g.id ? 'border-stone-900 bg-stone-50' : 'border-stone-300'}`}>
                <input type="radio" name="goal" value={g.id} checked={goalId === g.id} onChange={() => setGoalId(g.id)} />
                <span>{g.title}</span>
              </label>
            ))}
          </div>
        </Field>
      )}

      <Field label="Việc (động từ + đếm được)" error={err('title')} hint='Ví dụ: "Làm 20 câu S3", không phải "Học AWS".'>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Làm 20 câu S3" autoFocus />
      </Field>

      <Field label="Definition of Done (mỗi dòng 1 mục kiểm được)" error={err('dod')}>
        <Textarea value={dod} onChange={(e) => setDod(e.target.value)} placeholder={'20 câu có đáp án\nGhi lại 3 lỗi sai vào note'} />
      </Field>

      <Field label="Nếu không làm thì mất gì? (1 câu)" error={err('consequence')} hint="Câu này sẽ hiện lại đúng lúc bạn định huỷ.">
        <Input value={consequence} onChange={(e) => setConsequence(e.target.value)} placeholder="Trượt kỳ thi tháng 10, mất 3 tháng ôn lại" />
      </Field>

      <Field label={`Ước lượng (phút, ≤ ${MAX_ESTIMATE_MIN})`} error={err('estimate')} hint="Quá 90 phút thì tách: phần đầu hôm nay, phần sau vào Parking Lot.">
        <Input type="number" inputMode="numeric" min={5} max={MAX_ESTIMATE_MIN} value={estimate} onChange={(e) => setEstimate(e.target.value)} placeholder="45" />
      </Field>

      <Field label="Next Action (bước đầu tiên khi mở máy)" error={err('nextAction')}>
        <Input value={nextAction} onChange={(e) => setNextAction(e.target.value)} placeholder="Mở quiz S3, làm câu 1–5" />
      </Field>

      <div className="flex gap-2">
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Thôi</Button>}
        <Button type="submit" className="flex-1">Chốt việc này</Button>
      </div>
    </form>
  )
}
