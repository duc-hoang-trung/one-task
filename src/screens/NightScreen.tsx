import { useLiveQuery } from 'dexie-react-hooks'
import { ParkingLot } from '../components/ParkingLot'
import { Card, Muted, Page } from '../components/ui'
import { db, mainTaskFor } from '../lib/db'
import { addDays, type ISODate } from '../lib/dates'
import type { Settings } from '../lib/types'

/** Night mode: khoá. Không task, không kế hoạch, không list. Chỉ Parking Lot. */
export function NightScreen({ today, settings }: { today: ISODate; settings: Settings }) {
  const tomorrow = addDays(today, 1)
  const next = useLiveQuery(() => mainTaskFor(tomorrow), [tomorrow])
  const log = useLiveQuery(() => db.dayLogs.get(today), [today])

  return (
    <div className="min-h-full bg-stone-900 text-stone-100">
      <Page title="Đã đóng ngày" subtitle={log?.shutdownAt ? `lúc ${log.shutdownAt}` : undefined}>
        <Card tone="dark">
          <Muted className="text-stone-400">Đã có kế hoạch cho việc này. Sáng mai lúc {settings.morningTime}:</Muted>
          <p className="mt-2 text-xl font-medium leading-snug">{next?.nextAction ?? '—'}</p>
          {next && <Muted className="mt-2 text-stone-400">{next.title}</Muted>}
        </Card>
        {log?.worry?.concern && (
          <Card tone="dark">
            <Muted className="text-stone-400">Điều đang lo đã có bước tiếp theo:</Muted>
            <p className="mt-1">{log.worry.nextStep || '(chưa ghi bước)'}</p>
          </Card>
        )}
        <ParkingLot today={today} dark />
        <Muted className="text-center text-stone-500">Giờ ngủ mục tiêu {settings.bedtimeTarget}. Không có gì cần quyết cho tới sáng.</Muted>
      </Page>
    </div>
  )
}
