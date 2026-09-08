import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useT } from '../i18n'
import { addParking } from '../lib/actions'
import { db } from '../lib/db'
import type { ISODate } from '../lib/dates'

/**
 * Ô ghi nhanh: gõ + Enter, không rời màn hình. Luôn mở, kể cả Night mode.
 * Không hiện list ở đây (xử lý lúc Đóng ngày) để không thành to-do list thứ hai.
 */
export function ParkingLot({ today, dark = false }: { today: ISODate; dark?: boolean }) {
  const { t } = useT()
  const [text, setText] = useState('')
  const [flash, setFlash] = useState(false)
  const pending = useLiveQuery(() => db.parking.filter((p) => !p.deleted && p.resolution === undefined).count(), [], 0)

  async function submit() {
    if (!text.trim()) return
    await addParking(text, today)
    setText('')
    setFlash(true)
    setTimeout(() => setFlash(false), 900)
  }

  const status = flash ? t('park.saved') : pending ? t('park.pending', { n: pending }) : t('park.hint')

  return (
    <div className={dark ? 'text-night-text' : ''}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className={`shrink-0 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.14em] ${dark ? 'text-night-muted' : 'text-ink-3'}`}>{t('park.title')}</span>
        <span className={`text-right text-[12px] ${dark ? 'text-night-muted' : 'text-ink-3'}`}>{status}</span>
      </div>
      <input
        className={`w-full border-0 border-b bg-transparent px-0 py-2 text-[15px] focus:outline-none ${
          dark
            ? 'border-white/15 text-night-text placeholder:text-night-muted/70 focus:border-accent-2'
            : 'border-line text-ink placeholder:text-ink-3/70 focus:border-accent'
        }`}
        placeholder={t('park.placeholder')}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            void submit()
          }
        }}
        enterKeyHint="done"
      />
    </div>
  )
}
