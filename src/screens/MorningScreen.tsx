import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, Play } from 'lucide-react'
import { CancelFlow } from '../components/CancelFlow'
import { QuickAdd } from '../components/QuickAdd'
import { beginFocus, defaultFocusMin, DurationChips } from '../components/StartFocus'
import { TaskRow } from '../components/TaskRow'
import { TaskForm } from '../components/TaskForm'
import { TaskSheet } from '../components/TaskSheet'
import { Button, Card, Eyebrow, Field, Input, Modal, Muted, Page } from '../components/ui'
import { fmtDate, useT } from '../i18n'
import { openMorning } from '../lib/actions'
import { db, isOpen, tasksFor } from '../lib/db'
import { addDays, type ISODate } from '../lib/dates'
import { focusMinutesByDate } from '../lib/metrics'
import type { Settings, Task } from '../lib/types'

/**
 * Buổi sáng: nếu có MIT → đúng 1 dòng bước đầu tiên, chọn thời lượng, Bắt đầu / Huỷ…
 * Nếu chưa có MIT → danh sách hôm nay để gắn sao (không bắt buộc) rồi "Vào ngày".
 */
export function MorningScreen({ today, task: mit, settings, now }: { today: ISODate; task?: Task; settings: Settings; now: Date }) {
  const { t, lang } = useT()
  const yesterday = addDays(today, -1)
  const yLog = useLiveQuery(() => db.dayLogs.get(yesterday), [yesterday])
  const ySessions = useLiveQuery(() => db.sessions.where('date').equals(yesterday).toArray(), [yesterday], [])
  const yFocus = focusMinutesByDate(ySessions, now.getTime()).get(yesterday) ?? 0
  const anyHistory = useLiveQuery(() => db.sessions.count(), [], 0)
  const emptyYesterday = anyHistory > 0 && yFocus < settings.minFocusMin && !yLog?.locked
  const tasks = useLiveQuery(() => tasksFor(today), [today], [])
  const open = tasks.filter(isOpen)
  const others = open.filter((x) => x.id !== mit?.id)

  const [bedtime, setBedtime] = useState(yLog?.bedtimeActual ?? settings.bedtimeTarget)
  const [min, setMin] = useState(() => defaultFocusMin(mit, settings))
  useEffect(() => { setMin(defaultFocusMin(mit, settings)) }, [mit?.id, mit?.estimateMin]) // eslint-disable-line react-hooks/exhaustive-deps
  const [cancelling, setCancelling] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [creating, setCreating] = useState(false)
  const [showOthers, setShowOthers] = useState(false)

  async function start(minutes = min) {
    if (!mit) return
    await openMorning(today, bedtime, now)
    await beginFocus(mit, today, minutes, settings, now.getTime())
  }

  return (
    <Page subtitle={fmtDate(lang, today)} title={t('morn.title')} width="narrow">
      {emptyYesterday && (
        <Card tone="accent"><p className="text-ink-2">{t('morn.emptyYesterday')}</p></Card>
      )}

      {mit ? (
        <Card className="py-7">
          <Eyebrow>{t('morn.firstStep')}</Eyebrow>
          <p className="font-display mt-2 text-[30px] leading-[1.15] tracking-tight">{mit.nextAction || mit.title}</p>
          {(mit.nextAction || mit.estimateMin) && (
            <Muted className="mt-4">
              {[mit.nextAction ? `${t('morn.task')}: ${mit.title}` : '', mit.estimateMin ? `~${mit.estimateMin}′` : ''].filter(Boolean).join(' · ')}
            </Muted>
          )}
          {others.length > 0 && (
            <div className="mt-4 border-t border-line pt-3">
              <button className="flex items-center gap-1 text-[12px] font-semibold uppercase tracking-wide text-ink-3" onClick={() => setShowOthers((s) => !s)}>
                {showOthers ? <ChevronDown size={14} /> : <ChevronRight size={14} />}{t('morn.others', { n: others.length })}
              </button>
              {showOthers && (
                <ul className="mt-2 flex flex-col gap-1.5">
                  {others.map((x) => <li key={x.id}><TaskRow task={x} today={today} onEdit={setEditing} compact /></li>)}
                </ul>
              )}
            </div>
          )}
        </Card>
      ) : (
        <Card className="py-4">
          <Eyebrow className="mb-1">{t('morn.count', { n: open.length })}</Eyebrow>
          <Muted className="mb-3">{t('morn.pickMitHint')}</Muted>
          {open.length > 0 && (
            <ul className="mb-3 flex flex-col gap-1.5">
              {open.map((x) => <li key={x.id}><TaskRow task={x} today={today} onEdit={setEditing} /></li>)}
            </ul>
          )}
          <QuickAdd scheduledFor={today} defaultArea={settings.defaultArea} />
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setCreating(true)}>★ {t('morn.newMit')}</Button>
        </Card>
      )}

      <Card>
        <Field label={t('morn.bedtimeQ')} hint={t('morn.bedtimeHint', { target: settings.bedtimeTarget })}>
          <Input type="time" value={bedtime} onChange={(e) => setBedtime(e.target.value)} />
        </Field>
      </Card>

      {mit ? (
        <>
          <DurationChips value={min} onChange={setMin} settings={settings} estimate={mit.estimateMin} />
          <Button size="lg" onClick={() => void start()}><Play size={18} />{t('morn.start', { n: min })}</Button>
          <Button variant="ghost" onClick={() => setCancelling(true)}>{t('morn.cancel')}</Button>
        </>
      ) : (
        <Button size="lg" variant="secondary" onClick={() => void openMorning(today, bedtime, now)}>{t('morn.enter')}</Button>
      )}

      {editing && <TaskSheet task={editing} today={today} onClose={() => setEditing(null)} />}
      {creating && (
        <Modal onClose={() => setCreating(false)}>
          <TaskForm scheduledFor={today} heading={t('morn.newMit')} defaultArea={settings.defaultArea} onCreated={() => setCreating(false)} onCancel={() => setCreating(false)} />
        </Modal>
      )}
      {cancelling && mit && (
        <CancelFlow
          task={mit} today={today} minFocusMin={settings.minFocusMin}
          onClose={() => setCancelling(false)}
          onStartAnyway={() => { setCancelling(false); void start(settings.minFocusMin) }}
          onResolved={() => { setCancelling(false); void openMorning(today, bedtime, now) }}
        />
      )}
    </Page>
  )
}
