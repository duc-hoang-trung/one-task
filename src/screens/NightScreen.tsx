import { useLiveQuery } from 'dexie-react-hooks'
import { ParkingLot } from '../components/ParkingLot'
import { Card, Page } from '../components/ui'
import { useT } from '../i18n'
import { db, isOpen, mainTaskFor, tasksFor } from '../lib/db'
import { addDays, type ISODate } from '../lib/dates'
import type { Settings } from '../lib/types'

/** Night mode: khoá. Không task, không kế hoạch, không list. Chỉ Parking Lot. */
export function NightScreen({ today, settings }: { today: ISODate; settings: Settings }) {
  const { t } = useT()
  const tomorrow = addDays(today, 1)
  const next = useLiveQuery(() => mainTaskFor(tomorrow), [tomorrow])
  const tomorrows = useLiveQuery(() => tasksFor(tomorrow), [tomorrow], [])
  const openN = tomorrows.filter(isOpen).length
  const log = useLiveQuery(() => db.dayLogs.get(today), [today])

  return (
    <div className="min-h-full bg-night text-night-text" style={{ backgroundImage: 'radial-gradient(900px 500px at 50% -10%, rgb(245 158 11 / 0.08), transparent 60%)' }}>
      <Page title={<span className="text-night-text">{t('night.title')}</span>} subtitle={log?.shutdownAt ? t('night.at', { t: log.shutdownAt }) : undefined}>
        <Card tone="dark" className="py-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-night-muted">{t('night.planned', { t: settings.morningTime })}</p>
          <p className="font-display mt-3 text-[28px] leading-[1.15]">{next ? next.nextAction || next.title : openN ? t('morn.count', { n: openN }) : '—'}</p>
          {next && <p className="mt-3 text-sm text-night-muted">{next.nextAction ? next.title : ''}{openN > 1 ? ` · ${t('morn.count', { n: openN })}` : ''}</p>}
        </Card>
        {log?.worry?.concern && (
          <Card tone="dark">
            <p className="text-sm text-night-muted">{t('night.worry')}</p>
            <p className="mt-1">{log.worry.nextStep || t('night.noStep')}</p>
          </Card>
        )}
        <Card tone="dark" className="py-4">
          <ParkingLot today={today} dark />
        </Card>
        <p className="text-center text-sm text-night-muted">{t('night.footer', { t: settings.bedtimeTarget })}</p>
      </Page>
    </div>
  )
}
