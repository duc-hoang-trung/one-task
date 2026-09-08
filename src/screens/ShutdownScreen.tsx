import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { TaskForm } from '../components/TaskForm'
import { Button, Card, Eyebrow, Field, Input, Muted, Page } from '../components/ui'
import { fmtDate, useT } from '../i18n'
import { closeDay, completeTask, deleteParking, dropTask, rescheduleTask, resolveParking } from '../lib/actions'
import { db, mainTaskFor } from '../lib/db'
import { addDays, type ISODate } from '../lib/dates'
import type { Settings, Task } from '../lib/types'

type Outcome = 'done' | 'progress' | 'none'

/** Nghi thức đóng ngày, 5 bước, ~3 phút. */
export function ShutdownScreen({
  today, task, settings, now, onCancel,
}: { today: ISODate; task?: Task; settings: Settings; now: Date; onCancel: () => void }) {
  const { t, lang } = useT()
  const tomorrow = addDays(today, 1)
  const [step, setStep] = useState(task ? 1 : 2)
  const [outcome, setOutcome] = useState<Outcome>(task ? 'progress' : 'none')
  const [mode, setMode] = useState<'continue' | 'new'>(task && task.status !== 'done' ? 'continue' : 'new')
  const [nextAction, setNextAction] = useState(task?.nextAction ?? '')
  const [concern, setConcern] = useState('')
  const [nextStep, setNextStep] = useState('')

  const tomorrowTask = useLiveQuery(() => mainTaskFor(tomorrow), [tomorrow])
  const pending = useLiveQuery(() => db.parking.filter((p) => !p.deleted && p.resolution === undefined).toArray(), [], [])

  async function pickOutcome(o: Outcome) {
    setOutcome(o)
    if (o === 'done' && task) {
      await completeTask(task.id)
      setMode('new')
    }
    setStep(2)
  }

  async function continueTomorrow() {
    if (!task) return
    await rescheduleTask(task.id, tomorrow, nextAction)
    setStep(3)
  }

  async function finish() {
    await closeDay({ today, outcome, worry: { concern: concern.trim(), nextStep: nextStep.trim() }, now })
  }

  const unfinished = task && task.status !== 'done'

  return (
    <Page subtitle={fmtDate(lang, today)} title={t('sd.title')}>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-accent' : 'bg-paper-3'}`} />
        ))}
      </div>

      {step === 1 && task && (
        <Card>
          <Eyebrow>1 · {t('sd.s1')}</Eyebrow>
          <h2 className="font-display mt-1.5 text-xl">{task.title}</h2>
          <div className="mt-4 flex flex-col gap-2">
            <Button onClick={() => void pickOutcome('done')}>{t('sd.s1.done')}</Button>
            <Button variant="secondary" onClick={() => void pickOutcome('progress')}>{t('sd.s1.progress')}</Button>
            <Button variant="secondary" onClick={() => void pickOutcome('none')}>{t('sd.s1.none')}</Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <Eyebrow>2 · {t('sd.s2')} · {fmtDate(lang, tomorrow)}</Eyebrow>
          {tomorrowTask ? (
            <>
              <p className="font-display mt-2 text-xl">{tomorrowTask.title}</p>
              {tomorrowTask.nextAction && <p className="text-ink-2">{t('sd.s2.first')}: {tomorrowTask.nextAction}</p>}
              <Button className="mt-4 w-full" onClick={() => setStep(3)}>{t('common.next')}</Button>
            </>
          ) : mode === 'continue' && unfinished ? (
            <div className="mt-2 flex flex-col gap-3">
              <p className="text-ink-2">{t('sd.s2.continue', { title: task.title })}</p>
              <Field label={t('sd.s2.nextAction')} hint={t('sd.s2.nextAction.hint')}>
                <Input autoFocus value={nextAction} onChange={(e) => setNextAction(e.target.value)} placeholder={t('sd.s2.nextAction.ph')} />
              </Field>
              <Button onClick={() => void continueTomorrow()}>{t('sd.s2.commit')}</Button>
              <Button variant="ghost" onClick={() => setMode('new')}>{t('sd.s2.other')}</Button>
            </div>
          ) : (
            <div className="mt-2">
              {unfinished && <Muted className="mb-3">{t('sd.s2.dropNote', { title: task.title })}</Muted>}
              <TaskForm
                scheduledFor={tomorrow}
                compact
                onCreated={async () => {
                  if (unfinished) await dropTask(task.id, 'switched at shutdown', today)
                  setStep(3)
                }}
                onCancel={unfinished ? () => setMode('continue') : undefined}
              />
            </div>
          )}
        </Card>
      )}

      {step === 3 && (
        <Card>
          <Eyebrow>3 · {t('sd.s3', { n: pending.length })}</Eyebrow>
          {pending.length === 0 ? (
            <>
              <p className="mt-2 text-ink-2">{t('sd.s3.clean')}</p>
              <Button className="mt-4 w-full" onClick={() => setStep(4)}>{t('common.next')}</Button>
            </>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {pending.map((p) => (
                <li key={p.id} className="rounded-xl bg-paper p-3 ring-1 ring-line">
                  <p className="mb-2">{p.text}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => void resolveParking(p.id, 'tomorrow', today)}>{t('sd.s3.tomorrow')}</Button>
                    <Button size="sm" variant="secondary" onClick={() => void resolveParking(p.id, 'later', today)}>{t('sd.s3.later')}</Button>
                    <Button size="sm" variant="danger" onClick={() => void deleteParking(p.id)}>{t('common.delete')}</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {step === 4 && (
        <Card>
          <Eyebrow>4 · {t('sd.s4')}</Eyebrow>
          <p className="mt-1.5 text-sm text-ink-2">{t('sd.s4.hint')}</p>
          <div className="mt-3 flex flex-col gap-3">
            <Field label={t('sd.s4.concern')}>
              <Input value={concern} onChange={(e) => setConcern(e.target.value)} placeholder={t('sd.s4.concern.ph')} />
            </Field>
            <Field label={t('sd.s4.step')}>
              <Input value={nextStep} onChange={(e) => setNextStep(e.target.value)} placeholder={t('sd.s4.step.ph')} />
            </Field>
          </div>
          <Button className="mt-4 w-full" onClick={() => setStep(5)}>{concern || nextStep ? t('common.next') : t('sd.s4.nothing')}</Button>
        </Card>
      )}

      {step === 5 && (
        <Card>
          <Eyebrow>5 · {t('sd.s5')}</Eyebrow>
          <p className="font-display mt-2 text-2xl">{t('sd.s5.enough')}</p>
          <p className="mt-2 text-ink-2">{t('sd.s5.hint', { t: settings.bedtimeTarget })}</p>
          <Button size="lg" className="mt-5" onClick={() => void finish()}>{t('sd.s5.close')}</Button>
        </Card>
      )}

      <Button variant="ghost" onClick={onCancel}>{t('sd.notYet')}</Button>
    </Page>
  )
}
