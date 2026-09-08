import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Star } from 'lucide-react'
import { QuickAdd } from '../components/QuickAdd'
import { TaskForm } from '../components/TaskForm'
import { TaskRow } from '../components/TaskRow'
import { TaskSheet } from '../components/TaskSheet'
import { Button, Card, Eyebrow, Field, Input, Modal, Muted, Page } from '../components/ui'
import { fmtDate, useT } from '../i18n'
import { carryOver, closeDay, completeTask, deleteParking, dropTask, promoteToTask, scheduleTask } from '../lib/actions'
import { backlogTasks, db, isOpen, tasksFor } from '../lib/db'
import { addDays, type ISODate } from '../lib/dates'
import { sessionMinutes } from '../lib/metrics'
import type { Settings, Task } from '../lib/types'

/**
 * Nghi thức đóng ngày, 5 bước, ~3 phút:
 *  1. Rà việc hôm nay: mỗi việc chưa xong → Mai / Backlog / Bỏ (hoặc tất cả sang mai)
 *  2. Chốt mai: danh sách mai, gắn sao việc quan trọng nhất (tuỳ chọn), thêm từ Backlog
 *  3. Parking Lot về 0: → Backlog / → Mai / Xoá
 *  4. Một lo lắng + một bước tiếp theo
 *  5. Đóng → Night mode
 */
export function ShutdownScreen({
  today, settings, now, onCancel,
}: { today: ISODate; task?: Task; settings: Settings; now: Date; onCancel: () => void }) {
  const { t, lang } = useT()
  const tomorrow = addDays(today, 1)
  const [step, setStep] = useState(1)
  const [concern, setConcern] = useState('')
  const [nextStep, setNextStep] = useState('')
  const [editing, setEditing] = useState<Task | null>(null)
  const [creating, setCreating] = useState(false)

  const todays = useLiveQuery(() => tasksFor(today), [today], [])
  const tomorrows = useLiveQuery(() => tasksFor(tomorrow), [tomorrow], [])
  const backlog = useLiveQuery(() => backlogTasks(), [], [])
  const sessions = useLiveQuery(() => db.sessions.where('date').equals(today).toArray(), [today], [])
  const pending = useLiveQuery(
    () => db.parking.filter((p) => !p.deleted && !p.promotedTaskId && (p.resolution === undefined || p.resolution === 'later')).toArray(), [], [],
  )

  const open = todays.filter(isOpen)
  const done = todays.filter((x) => x.status === 'done')
  const mit = todays.find((x) => x.isMain)
  const mitMinutes = mit ? sessions.filter((s) => s.taskId === mit.id && s.kind !== 'break').reduce((a, s) => a + sessionMinutes(s, now.getTime()), 0) : 0
  const outcome: 'done' | 'progress' | 'none' = !mit ? 'none' : mit.status === 'done' ? 'done' : mitMinutes > 0 ? 'progress' : 'none'
  const suggested = backlog.filter((x) => x.quadrant === 'q1' || x.quadrant === 'q2').slice(0, 5)

  async function finish() {
    await closeDay({ today, outcome, worry: { concern: concern.trim(), nextStep: nextStep.trim() }, now })
  }

  const Dots = () => (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((i) => <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-accent' : 'bg-paper-3'}`} />)}
    </div>
  )

  return (
    <Page subtitle={fmtDate(lang, today)} title={t('sd.title')}>
      <Dots />

      {step === 1 && (
        <Card>
          <Eyebrow>1 · {t('sd.review', { d: done.length, n: todays.length })}</Eyebrow>
          {open.length === 0 ? (
            <p className="mt-2 text-ink-2">{todays.length ? t('sd.review.clean') : t('sd.review.empty')}</p>
          ) : (
            <>
              <Muted className="mt-1">{t('sd.review.hint')}</Muted>
              <ul className="mt-3 flex flex-col gap-2">
                {open.map((x) => (
                  <li key={x.id} className="rounded-xl bg-paper/70 p-2.5 ring-1 ring-line">
                    <p className="flex items-center gap-1.5 text-[15px]">{x.isMain && <Star size={13} className="fill-accent text-accent" />}{x.title}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Button size="sm" variant="secondary" onClick={() => void completeTask(x.id)}>{t('common.done')}</Button>
                      <Button size="sm" variant="secondary" onClick={() => void scheduleTask(x.id, tomorrow)}>{t('row.tomorrow')}</Button>
                      <Button size="sm" variant="ghost" onClick={() => void scheduleTask(x.id, undefined)}>{t('row.backlog')}</Button>
                      <Button size="sm" variant="danger" onClick={() => void dropTask(x.id, 'dropped at shutdown', today)}>{t('common.drop')}</Button>
                    </div>
                  </li>
                ))}
              </ul>
              <Button variant="secondary" className="mt-3 w-full" onClick={() => void carryOver(today, tomorrow)}>{t('sd.review.allTomorrow', { n: open.length })}</Button>
            </>
          )}
          <Button className="mt-4 w-full" disabled={open.length > 0} onClick={() => setStep(2)}>{t('common.next')}</Button>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <Eyebrow>2 · {t('sd.s2')} · {fmtDate(lang, tomorrow)}</Eyebrow>
          <Muted className="mt-1">{t('sd.plan.hint')}</Muted>
          {tomorrows.filter(isOpen).length > 0 && (
            <ul className="mt-3 flex flex-col gap-1.5">
              {tomorrows.filter(isOpen).map((x) => <li key={x.id}><TaskRow task={x} today={today} onEdit={setEditing} compact /></li>)}
            </ul>
          )}
          <div className="mt-3"><QuickAdd scheduledFor={tomorrow} defaultArea={settings.defaultArea} /></div>
          <Button variant="ghost" size="sm" className="mt-1" onClick={() => setCreating(true)}>★ {t('morn.newMit')}</Button>
          {suggested.length > 0 && (
            <div className="mt-3">
              <Eyebrow className="mb-1.5">{t('sd.plan.fromBacklog')}</Eyebrow>
              <ul className="flex flex-col gap-1">
                {suggested.map((x) => (
                  <li key={x.id} className="flex items-center gap-2 rounded-lg bg-paper/70 px-2 py-1.5 text-sm ring-1 ring-line">
                    <span className="min-w-0 flex-1 truncate">{x.title}</span>
                    <Button size="sm" variant="secondary" onClick={() => void scheduleTask(x.id, tomorrow)}>→ {t('row.tomorrow')}</Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Button className="mt-4 w-full" onClick={() => setStep(3)}>{t('common.next')}</Button>
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
                    <Button size="sm" variant="secondary" onClick={() => void promoteToTask(p.id, { area: settings.defaultArea })}>→ {t('row.backlog').replace(/^Về |^To /, '')}</Button>
                    <Button size="sm" variant="secondary" onClick={() => void promoteToTask(p.id, { area: settings.defaultArea, scheduledFor: tomorrow })}>→ {t('row.tomorrow')}</Button>
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
            <Field label={t('sd.s4.concern')}><Input value={concern} onChange={(e) => setConcern(e.target.value)} placeholder={t('sd.s4.concern.ph')} /></Field>
            <Field label={t('sd.s4.step')}><Input value={nextStep} onChange={(e) => setNextStep(e.target.value)} placeholder={t('sd.s4.step.ph')} /></Field>
          </div>
          <Button className="mt-4 w-full" onClick={() => setStep(5)}>{concern || nextStep ? t('common.next') : t('sd.s4.nothing')}</Button>
        </Card>
      )}

      {step === 5 && (
        <Card>
          <Eyebrow>5 · {t('sd.s5')}</Eyebrow>
          <p className="font-display mt-2 text-2xl">{t('sd.s5.enough')}</p>
          <p className="mt-2 text-ink-2">{t('sd.s5.summary', { d: done.length, n: todays.length, m: tomorrows.filter(isOpen).length })}</p>
          <p className="mt-1 text-ink-2">{t('sd.s5.hint', { t: settings.bedtimeTarget })}</p>
          <Button size="lg" className="mt-5" onClick={() => void finish()}>{t('sd.s5.close')}</Button>
        </Card>
      )}

      <Button variant="ghost" onClick={onCancel}>{t('sd.notYet')}</Button>

      {editing && <TaskSheet task={editing} today={today} onClose={() => setEditing(null)} />}
      {creating && (
        <Modal onClose={() => setCreating(false)}>
          <TaskForm scheduledFor={tomorrow} heading={t('morn.newMit')} onCreated={() => setCreating(false)} onCancel={() => setCreating(false)} />
        </Modal>
      )}
    </Page>
  )
}
