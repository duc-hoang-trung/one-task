import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { History } from 'lucide-react'
import { fmtDate, useT } from '../i18n'
import { scheduleTask, sweptToday } from '../lib/actions'
import type { ISODate } from '../lib/dates'
import { Button, Card, Eyebrow, Muted } from './ui'

/** Nhiều quá thì thành bức tường chữ; phần còn lại vẫn nằm trong Backlog. */
const MAX_SHOWN = 5

const seenKey = (today: ISODate) => `overdue.seen:${today}`
const wasSeen = (today: ISODate) => {
  try { return localStorage.getItem(seenKey(today)) === '1' } catch { return false }
}

/** Các việc vừa trôi về Backlog trong ngày logic hôm nay. */
export function useSweptToday(today: ISODate) {
  return useLiveQuery(() => sweptToday(today), [today], [])
}

/**
 * Nhắc các việc vừa bị trôi từ ngày trước về Backlog (xem actions.sweepOverdue).
 * Không chặn màn hình: kéo lên hôm nay từng việc, hoặc để yên trong Backlog.
 */
export function OverdueCard({ today }: { today: ISODate }) {
  const { t, lang } = useT()
  const swept = useSweptToday(today)
  // Theo ngày, không phải cờ một lần: qua nửa đêm (today đổi) thẻ phải hiện lại được.
  const [dismissed, setDismissed] = useState<ISODate | ''>('')

  if (swept.length === 0 || dismissed === today || wasSeen(today)) return null

  const dismiss = () => {
    try { localStorage.setItem(seenKey(today), '1') } catch { /* private mode */ }
    setDismissed(today)
  }

  return (
    <Card tone="accent" testId="overdue">
      <Eyebrow className="flex items-center gap-1.5"><History size={12} />{t('today.overdue')}</Eyebrow>
      <Muted className="mt-1 text-ink-2">{t('today.overdue.hint', { n: swept.length })}</Muted>
      <ul className="mt-3 flex flex-col gap-1.5">
        {swept.slice(0, MAX_SHOWN).map((x) => {
          const from = x.deferrals[x.deferrals.length - 1]?.fromDate
          return (
            <li key={x.id} className="flex items-center gap-2 rounded-xl bg-paper/70 px-2.5 py-2 ring-1 ring-line">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px]">{x.title}</span>
                {from && <span className="block text-[12px] text-ink-3">{t('today.overdue.from', { d: fmtDate(lang, from) })}</span>}
              </span>
              <Button size="sm" variant="secondary" onClick={() => void scheduleTask(x.id, today)}>{t('today.overdue.toToday')}</Button>
            </li>
          )
        })}
      </ul>
      {swept.length > MAX_SHOWN && <Muted className="mt-2">{t('today.overdue.more', { n: swept.length - MAX_SHOWN })}</Muted>}
      <Button variant="ghost" size="sm" className="mt-2" onClick={dismiss}>{t('today.overdue.keep')}</Button>
    </Card>
  )
}
