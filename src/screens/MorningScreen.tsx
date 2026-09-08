import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { CancelFlow } from '../components/CancelFlow'
import { TaskForm } from '../components/TaskForm'
import { Button, Card, Eyebrow, Field, Input, Muted, Page } from '../components/ui'
import { fmtDate, useT } from '../i18n'
import { openMorning, startSession } from '../lib/actions'
import { db } from '../lib/db'
import { addDays, type ISODate } from '../lib/dates'
import { focusMinutesByDate } from '../lib/metrics'
import type { Settings, Task } from '../lib/types'

/** Buổi sáng: đúng 1 dòng Next Action. Không list. Hai lựa chọn: Bắt đầu · Huỷ… */
export function MorningScreen({ today, task, settings, now }: { today: ISODate; task?: Task; settings: Settings; now: Date }) {
  const { t, lang } = useT()
  const yesterday = addDays(today, -1)
  const yLog = useLiveQuery(() => db.dayLogs.get(yesterday), [yesterday])
  const ySessions = useLiveQuery(() => db.sessions.where('date').equals(yesterday).toArray(), [yesterday], [])
  const yFocus = focusMinutesByDate(ySessions, now.getTime()).get(yesterday) ?? 0
  const anyHistory = useLiveQuery(() => db.sessions.count(), [], 0)
  const emptyYesterday = anyHistory > 0 && yFocus < settings.minFocusMin && !yLog?.locked

  const [bedtime, setBedtime] = useState(yLog?.bedtimeActual ?? settings.bedtimeTarget)
  const [cancelling, setCancelling] = useState(false)

  async function start() {
    if (!task) return
    await openMorning(today, bedtime, now)
    await startSession(task.id, today, settings.minFocusMin, now.getTime())
  }

  if (!task) {
    return (
      <Page subtitle={fmtDate(lang, today)} title={t('morn.noTask')}>
        <Muted>{t('morn.noTaskHint')}</Muted>
        <Card>
          <TaskForm scheduledFor={today} onCreated={() => undefined} />
        </Card>
      </Page>
    )
  }

  return (
    <Page subtitle={fmtDate(lang, today)} title={t('morn.title')}>
      {emptyYesterday && (
        <Card tone="accent">
          <p className="text-ink-2">{t('morn.emptyYesterday')}</p>
        </Card>
      )}

      <Card className="py-7">
        <Eyebrow>{t('morn.firstStep')}</Eyebrow>
        <p className="font-display mt-2 text-[30px] leading-[1.15] tracking-tight">{task.nextAction || task.title}</p>
        {task.nextAction && (
          <Muted className="mt-4">
            {t('morn.task')}: {task.title}{task.estimateMin ? ` · ~${task.estimateMin}′` : ''}
          </Muted>
        )}
      </Card>

      <Card>
        <Field label={t('morn.bedtimeQ')} hint={t('morn.bedtimeHint', { target: settings.bedtimeTarget })}>
          <Input type="time" value={bedtime} onChange={(e) => setBedtime(e.target.value)} />
        </Field>
      </Card>

      <Button size="lg" onClick={() => void start()}>{t('morn.start', { n: settings.minFocusMin })}</Button>
      <Button variant="ghost" onClick={() => setCancelling(true)}>{t('morn.cancel')}</Button>

      {cancelling && (
        <CancelFlow
          task={task}
          today={today}
          minFocusMin={settings.minFocusMin}
          onClose={() => setCancelling(false)}
          onStartAnyway={() => {
            setCancelling(false)
            void start()
          }}
          onResolved={() => {
            setCancelling(false)
            void openMorning(today, bedtime, now)
          }}
        />
      )}
    </Page>
  )
}
