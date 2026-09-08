import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useT } from '../i18n'
import { createTask, type NewTaskInput } from '../lib/actions'
import { goalsFor } from '../lib/actions'
import { quarterKey, weekKey } from '../lib/period'
import type { ISODate } from '../lib/dates'
import { QUADRANTS, type Area, type Quadrant } from '../lib/types'
import { checkTitle, MAX_ESTIMATE_MIN } from '../lib/vagueness'
import { Button, Field, Input, Segmented, Select, Textarea } from './ui'

/**
 * Form tạo việc đầy đủ (mặc định gắn ★). Chỉ tên việc là bắt buộc; các trường khác tuỳ chọn, gợi ý ngắn.
 * Bộ lọc mơ hồ chỉ gợi ý mềm, không chặn.
 */
export function TaskForm({
  scheduledFor, heading, onCreated, onCancel, compact = false, asMain = true, defaultArea = 'work',
}: {
  scheduledFor: ISODate
  heading?: string
  onCreated: (taskId: string) => void
  onCancel?: () => void
  compact?: boolean
  /** Gắn sao việc quan trọng nhất của ngày ngay khi tạo. */
  asMain?: boolean
  defaultArea?: Area
}) {
  const { t } = useT()
  const goals = useLiveQuery(
    async () => [...(await goalsFor(weekKey(scheduledFor))), ...(await goalsFor(quarterKey(scheduledFor)))].filter((g) => g.status === 'open'),
    [scheduledFor], [],
  )
  const [title, setTitle] = useState('')
  const [area, setArea] = useState<Area>(defaultArea)
  const [quadrant, setQuadrant] = useState<Quadrant | ''>('')
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
      area,
      quadrant: quadrant || undefined,
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

      <div className="grid grid-cols-2 gap-3">
        <Field label={t('sheet.area')}>
          <Segmented
            value={area} onChange={setArea} className="w-full [&>button]:flex-1"
            options={[{ value: 'work', label: t('area.work') }, { value: 'personal', label: t('area.personal') }]}
          />
        </Field>
        <Field label={t('sheet.quadrant')}>
          <Select value={quadrant} onChange={(e) => setQuadrant(e.target.value as Quadrant | '')}>
            <option value="">{t('q.none')}</option>
            {QUADRANTS.map((q) => <option key={q} value={q}>{q.toUpperCase()} · {t(`q.${q}`)}</option>)}
          </Select>
        </Field>
      </div>

      <Field label={t('form.nextAction')} hint={t('form.nextAction.hint')}>
        <Input value={nextAction} onChange={(e) => setNextAction(e.target.value)} placeholder={t('form.nextAction.ph')} />
      </Field>

      {more ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('form.estimate')} hint={estHint}>
              <Input type="number" inputMode="numeric" min={5} value={estimate} onChange={(e) => setEstimate(e.target.value)} placeholder={t('form.estimate.ph')} />
            </Field>
            {goals.length > 0 && (
              <Field label={t('form.goal')}>
                <Select value={goalId} onChange={(e) => setGoalId(e.target.value)}>
                  <option value="">{t('form.goal.none')}</option>
                  {goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
                </Select>
              </Field>
            )}
          </div>

          <Field label={t('form.dod')} hint={t('form.dod.hint')}>
            <Textarea value={dod} onChange={(e) => setDod(e.target.value)} placeholder={t('form.dod.ph')} />
          </Field>

          <Field label={t('form.consequence')} hint={t('form.consequence.hint')}>
            <Input value={consequence} onChange={(e) => setConsequence(e.target.value)} placeholder={t('form.consequence.ph')} />
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
