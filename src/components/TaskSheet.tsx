import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Clock, Trash2 } from 'lucide-react'
import { useT } from '../i18n'
import { addTimeLog, deleteTask, deleteTimeLog, goalsFor, scheduleTask, timeLogsFor, updateTask } from '../lib/actions'
import { now } from '../lib/clock'
import { db } from '../lib/db'
import type { ISODate } from '../lib/dates'
import { sessionMinutes } from '../lib/metrics'
import { quarterKey, weekKey } from '../lib/period'
import { QUADRANTS, type Area, type DodItem, type Quadrant, type Task } from '../lib/types'
import { SubtaskList } from './SubtaskList'
import { Button, Eyebrow, Field, Input, Modal, Muted, Select } from './ui'

/** Sheet sửa một việc: mọi trường, kể cả ngày (hoặc Backlog), việc con, và timesheet của việc. */
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
  const [dod, setDod] = useState<DodItem[]>(task.dod)
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
      dod,
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

        <div>
          <span className="mb-1.5 block text-sm font-medium text-ink-2">{t('form.dod')}</span>
          <div className="rounded-xl border border-line bg-paper px-3 py-2">
            <SubtaskList value={dod} onChange={setDod} />
          </div>
        </div>

        <TimeSection task={task} today={today} />
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

/**
 * Timesheet của một việc: mọi phiên đồng hồ + mọi dòng ghi tay, tổng, và ô ghi thêm (ghi ngay,
 * không chờ nút Lưu của sheet vì nằm ở bảng riêng).
 */
function TimeSection({ task, today }: { task: Task; today: ISODate }) {
  const { t } = useT()
  const sessions = useLiveQuery(() => db.sessions.where('taskId').equals(task.id).toArray(), [task.id], [])
  const logs = useLiveQuery(() => timeLogsFor(task.id), [task.id], [])
  const [min, setMin] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState<string>(today)
  const nowMs = now().getTime()

  const timed = sessions.filter((s) => s.kind !== 'break').reduce((a, s) => a + sessionMinutes(s, nowMs), 0)
  const logged = logs.reduce((a, l) => a + l.minutes, 0)
  type Entry = { key: string; at: number; date: ISODate; minutes: number; kind: 'timer' | 'manual'; note?: string; id?: string }
  const entries: Entry[] = [
    ...sessions.filter((s) => s.kind !== 'break').map((s): Entry => ({ key: `s${s.id}`, at: s.startedAt, date: s.date, minutes: sessionMinutes(s, nowMs), kind: 'timer' })),
    ...logs.map((l): Entry => ({ key: `l${l.id}`, at: l.createdAt, date: l.date, minutes: l.minutes, kind: 'manual', note: l.note, id: l.id })),
  ].filter((e) => e.minutes > 0).sort((a, b) => b.at - a.at)

  async function add() {
    const n = Number(min)
    if (!(n > 0)) return
    await addTimeLog(task.id, (date || today) as ISODate, n, note)
    setMin('')
    setNote('')
  }

  const total = timed + logged
  return (
    <div data-testid="time-section">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <Eyebrow className="flex items-center gap-1"><Clock size={11} />{t('time.title')}</Eyebrow>
        {total > 0 && (
          <span className="rounded-full bg-paper-3/70 px-2 py-0.5 text-[12px] font-medium tabular-nums text-ink-2">{t('time.total', { n: total })}</span>
        )}
      </div>
      <div className="rounded-xl border border-line bg-paper px-3 py-2">
        {entries.length === 0 ? (
          <Muted className="py-1">{t('time.none')}</Muted>
        ) : (
          <>
            <ul className="flex flex-col divide-y divide-line">
              {entries.map((e) => (
                <li key={e.key} className="flex items-baseline gap-2.5 py-1.5 text-sm">
                  <span className="w-11 shrink-0 text-right font-medium tabular-nums">{e.minutes}′</span>
                  <span className="w-11 shrink-0 tabular-nums text-ink-3">{dm(e.date)}</span>
                  <span className="min-w-0 flex-1 truncate text-ink-2">
                    <span className="text-ink-3">{e.kind === 'timer' ? t('time.entry.timer') : t('time.entry.manual')}</span>{e.note ? ` · ${e.note}` : ''}
                  </span>
                  {e.id ? (
                    <button type="button" aria-label={t('common.delete')} className="shrink-0 self-center rounded p-1 text-ink-3 hover:text-bad" onClick={() => void deleteTimeLog(e.id!)}>
                      <Trash2 size={14} />
                    </button>
                  ) : <span className="w-6 shrink-0" />}
                </li>
              ))}
            </ul>
            {timed > 0 && logged > 0 && (
              <Muted className="mt-1 text-[11px]">{t('time.tracked', { n: timed })} · {t('time.logged', { n: logged })}</Muted>
            )}
          </>
        )}
        <form noValidate className="mt-2 grid grid-cols-[minmax(0,1fr)_5rem] gap-2 border-t border-line pt-2.5" onSubmit={(e) => { e.preventDefault(); void add() }}>
          <Input type="date" aria-label={t('time.log.date')} className="!py-1.5 text-sm" value={date} onChange={(e) => setDate(e.target.value)} />
          <Input type="number" inputMode="numeric" min={1} aria-label={t('common.min')} className="!py-1.5 text-center text-sm" placeholder={t('common.min')} value={min} onChange={(e) => setMin(e.target.value)} />
          <Input className="!py-1.5 text-sm" placeholder={t('time.log.note.ph')} value={note} onChange={(e) => setNote(e.target.value)} />
          <Button type="submit" size="sm" variant="secondary" disabled={!(Number(min) > 0)}>{t('time.log')}</Button>
        </form>
      </div>
    </div>
  )
}

const dm = (iso: ISODate) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
