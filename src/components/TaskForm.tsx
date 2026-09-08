import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useT } from '../i18n'
import { createTask, type NewTaskInput } from '../lib/actions'
import { goalsFor } from '../lib/actions'
import { weekKey } from '../lib/period'
import type { ISODate } from '../lib/dates'
import { checkTitle, MAX_ESTIMATE_MIN } from '../lib/vagueness'
import { Button, Field, Input, Textarea } from './ui'

/**
 * Form tạo việc chính. Chỉ tên việc là bắt buộc. Các trường khác tuỳ chọn, gợi ý ngắn.
 * Bộ lọc mơ hồ chỉ gợi ý mềm, không chặn.
 */
export function TaskForm({
  scheduledFor, heading, onCreated, onCancel, compact = false, asMain = true,
}: {
  scheduledFor: ISODate
  heading?: string
  onCreated: (taskId: string) => void
  onCancel?: () => void
  compact?: boolean
  /** Gắn sao việc quan trọng nhất của ngày ngay khi tạo. */
  asMain?: boolean
}) {
  const { t } = useT()
  const goals = useLiveQuery(
    async () => (await goalsFor(weekKey(scheduledFor))).filter((g) => g.status === 'open'),
    [scheduledFor], [],
  )
  const [title, setTitle] = useState('')
  const [dod, setDod] = useState('')
  const [consequence, setConsequence] = useState('')
  const [estimate, setEstimate] = useState('')
  const [nextAction, setNextAction] = useState('')
  const [goalId, setGoalId] = useState('')
  const [touched, setTouched] = useState(false)
  const [more, setMore] = useState(!compact)

  const vague = title.trim().length >= 4 ? checkTitle(title) : { ok: true as const }
  const est = Number(estimate)
  const titleHint = !vague.ok && vague.reason.startsWith('"')
    ? t('form.title.vague', { w: vague.reason.split('"')[1] })
    : t('form.title.hint')
  const estHint = est > MAX_ESTIMATE_MIN ? t('form.estimate.big', { n: MAX_ESTIMATE_MIN }) : t('form.estimate.hint')

  async function submit() {
    setTouched(true)
    if (!title.trim()) return
    const input: NewTaskInput = {
      title,
      dod: dod.split('\n').map((s) => s.trim()).filter(Boolean),
      consequence,
      estimateMin: est > 0 ? est : undefined,
      nextAction,
      scheduledFor,
      goalId: goalId || undefined,
      isMain: asMain,
    }
    const created = await createTask(input)
    onCreated(created.id)
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      {heading && <h2 className="font-display text-xl">{heading}</h2>}

      <Field label={t('form.title')} hint={titleHint} error={touched && !title.trim() ? t('form.titleRequired') : undefined}>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('form.title.ph')} autoFocus />
      </Field>

      <Field label={t('form.nextAction')} hint={t('form.nextAction.hint')}>
        <Input value={nextAction} onChange={(e) => setNextAction(e.target.value)} placeholder={t('form.nextAction.ph')} />
      </Field>

      {more ? (
        <>
          {goals.length > 0 && (
            <Field label={t('form.goal')}>
              <div className="flex flex-col gap-2">
                {goals.map((g) => (
                  <label key={g.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-colors ${goalId === g.id ? 'border-accent bg-accent-soft/60' : 'border-line'}`}>
                    <input type="radio" name="goal" className="accent-accent" value={g.id} checked={goalId === g.id} onChange={() => setGoalId(g.id)} />
                    <span>{g.title}</span>
                  </label>
                ))}
                <label className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-ink-2 ${goalId === '' ? 'border-accent bg-accent-soft/60' : 'border-line'}`}>
                  <input type="radio" name="goal" className="accent-accent" value="" checked={goalId === ''} onChange={() => setGoalId('')} />
                  <span>{t('form.goal.none')}</span>
                </label>
              </div>
            </Field>
          )}

          <Field label={t('form.dod')} hint={t('form.dod.hint')}>
            <Textarea value={dod} onChange={(e) => setDod(e.target.value)} placeholder={t('form.dod.ph')} />
          </Field>

          <Field label={t('form.consequence')} hint={t('form.consequence.hint')}>
            <Input value={consequence} onChange={(e) => setConsequence(e.target.value)} placeholder={t('form.consequence.ph')} />
          </Field>

          <Field label={t('form.estimate')} hint={estHint}>
            <Input type="number" inputMode="numeric" min={5} value={estimate} onChange={(e) => setEstimate(e.target.value)} placeholder={t('form.estimate.ph')} className="max-w-[10rem]" />
          </Field>
        </>
      ) : (
        <button type="button" className="self-start text-sm text-accent hover:underline" onClick={() => setMore(true)}>
          + {t('form.dod')} · {t('form.consequence')} · {t('form.estimate')}
        </button>
      )}

      <div className="flex gap-2 pt-1">
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>{t('common.cancel')}</Button>}
        <Button type="submit" className="flex-1">{t('form.submit')}</Button>
      </div>
    </form>
  )
}
