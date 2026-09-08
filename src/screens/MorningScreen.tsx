import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { CancelFlow } from '../components/CancelFlow'
import { QuickAdd } from '../components/QuickAdd'
import { TaskRow } from '../components/TaskRow'
import { TaskForm } from '../components/TaskForm'
import { TaskSheet } from '../components/TaskSheet'
import { Button, Card, Eyebrow, Field, Input, Modal, Muted, Page } from '../components/ui'
import { fmtDate, useT } from '../i18n'
import { openMorning, startSession } from '../lib/actions'
import { db, isOpen, tasksFor } from '../lib/db'
import { addDays, type ISODate } from '../lib/dates'
import { focusMinutesByDate } from '../lib/metrics'
import { requestNotifyPermission } from '../lib/notify'
import type { Settings, Task } from '../lib/types'

/**
 * Buổi sáng: nếu có MIT → đúng 1 dòng bước đầu tiên, Bắt đầu / Huỷ…
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

  const [bedtime, setBedtime] = useState(yLog?.bedtimeActual ?? settings.bedtimeTarget)
  const [cancelling, setCancelling] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [creating, setCreating] = useState(false)

  async function start() {
    if (!mit) return
    if (settings.notifications.system) void requestNotifyPermission()
    await openMorning(today, bedtime, now)
    await startSession(mit.id, today, settings.minFocusMin, now.getTime())
  }

  return (
    <Page subtitle={fmtDate(lang, today)} title={t('morn.title')}>
      {emptyYesterday && (
        <Card tone="accent"><p className="text-ink-2">{t('morn.emptyYesterday')}</p></Card>
      )}

      {mit ? (
        <Card className="py-7">
          <Eyebrow>{t('morn.firstStep')}</Eyebrow>
          <p className="font-display mt-2 text-[30px] leading-[1.15] tracking-tight">{mit.nextAction || mit.title}</p>
          <Muted className="mt-4">
            {mit.nextAction ? `${t('morn.task')}: ${mit.title}` : ''}{mit.estimateMin ? ` · ~${mit.estimateMin}′` : ''}
            {open.length > 1 ? ` · ${t('morn.count', { n: open.length })}` : ''}
          </Muted>
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
          <Button size="lg" onClick={() => void start()}>{t('morn.start', { n: settings.minFocusMin })}</Button>
          <Button variant="ghost" onClick={() => setCancelling(true)}>{t('morn.cancel')}</Button>
        </>
      ) : (
        <Button size="lg" variant="secondary" onClick={() => void openMorning(today, bedtime, now)}>{t('morn.enter')}</Button>
      )}

      {editing && <TaskSheet task={editing} today={today} onClose={() => setEditing(null)} />}
      {creating && (
        <Modal onClose={() => setCreating(false)}>
          <TaskForm scheduledFor={today} heading={t('morn.newMit')} onCreated={() => setCreating(false)} onCancel={() => setCreating(false)} />
        </Modal>
      )}
      {cancelling && mit && (
        <CancelFlow
          task={mit} today={today} minFocusMin={settings.minFocusMin}
          onClose={() => setCancelling(false)}
          onStartAnyway={() => { setCancelling(false); void start() }}
          onResolved={() => { setCancelling(false); void openMorning(today, bedtime, now) }}
        />
      )}
    </Page>
  )
}
