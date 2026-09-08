import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useT } from '../i18n'
import { deleteTask, goalsFor, scheduleTask, updateTask } from '../lib/actions'
import type { ISODate } from '../lib/dates'
import { quarterKey, weekKey } from '../lib/period'
import { QUADRANTS, type Area, type Quadrant, type Task } from '../lib/types'
import { Button, Field, Input, Modal, Select, Textarea } from './ui'

/** Sheet sửa một việc: mọi trường, kể cả ngày (hoặc Backlog). */
export function TaskSheet({ task, today, onClose }: { task: Task; today: ISODate; onClose: () => void }) {
  const { t } = useT()
  const [title, setTitle] = useState(task.title)
  const [area, setArea] = useState<Area>(task.area)
  const [quadrant, setQuadrant] = useState<Quadrant | ''>(task.quadrant ?? '')
  const [date, setDate] = useState<string>(task.scheduledFor ?? '')
  const [startAt, setStartAt] = useState(task.startAt ?? '')
  const [estimate, setEstimate] = useState(task.estimateMin ? String(task.estimateMin) : '')
  const [nextAction, setNextAction] = useState(task.nextAction)
  const [consequence, setConsequence] = useState(task.consequence)
  const [dod, setDod] = useState(task.dod.map((d) => d.text).join('\n'))
  const [goalId, setGoalId] = useState(task.goalId ?? '')

  const refDate = date || today
  const goals = useLiveQuery(
    async () => [...(await goalsFor(weekKey(refDate))), ...(await goalsFor(quarterKey(refDate)))].filter((g) => g.status === 'open'),
    [refDate], [],
  )

  async function save() {
    if (!title.trim()) return
    await updateTask(task.id, {
      title, area, quadrant: quadrant || undefined, startAt: startAt || undefined,
      estimateMin: Number(estimate) > 0 ? Number(estimate) : undefined,
      nextAction, consequence, goalId: goalId || undefined,
      dod: dod.split('\n'),
    })
    const target = date || undefined
    if (target !== task.scheduledFor) await scheduleTask(task.id, target)
    onClose()
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="font-display mb-3 text-xl">{t('sheet.title')}</h2>
      <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto pr-1">
        <Field label={t('form.title')}>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('sheet.area')}>
            <Select value={area} onChange={(e) => setArea(e.target.value as Area)}>
              <option value="work">{t('area.work')}</option>
              <option value="personal">{t('area.personal')}</option>
            </Select>
          </Field>
          <Field label={t('sheet.quadrant')}>
            <Select value={quadrant} onChange={(e) => setQuadrant(e.target.value as Quadrant | '')}>
              <option value="">{t('q.none')}</option>
              {QUADRANTS.map((q) => <option key={q} value={q}>{q.toUpperCase()} · {t(`q.${q}`)}</option>)}
            </Select>
          </Field>
          <Field label={t('sheet.date')} hint={date ? undefined : t('sheet.backlog')}>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label={t('sheet.startAt')}>
            <Input type="time" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
          </Field>
          <Field label={t('form.estimate')}>
            <Input type="number" inputMode="numeric" min={5} value={estimate} onChange={(e) => setEstimate(e.target.value)} />
          </Field>
          <Field label={t('sheet.goal')}>
            <Select value={goalId} onChange={(e) => setGoalId(e.target.value)}>
              <option value="">{t('sheet.goal.none')}</option>
              {goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
            </Select>
          </Field>
        </div>
        <Field label={t('form.nextAction')}>
          <Input value={nextAction} onChange={(e) => setNextAction(e.target.value)} placeholder={t('form.nextAction.ph')} />
        </Field>
        <Field label={t('form.consequence')}>
          <Input value={consequence} onChange={(e) => setConsequence(e.target.value)} placeholder={t('form.consequence.ph')} />
        </Field>
        <Field label={t('form.dod')} hint={t('form.dod.hint')}>
          <Textarea value={dod} onChange={(e) => setDod(e.target.value)} placeholder={t('form.dod.ph')} />
        </Field>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <Button variant="danger" size="sm" onClick={() => void deleteTask(task.id).then(onClose)}>{t('row.delete')}</Button>
        <span className="flex-1" />
        <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
        <Button onClick={() => void save()}>{t('sheet.save')}</Button>
      </div>
    </Modal>
  )
}
