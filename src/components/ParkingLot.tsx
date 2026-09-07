import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { addParking } from '../lib/actions'
import { db } from '../lib/db'
import type { ISODate } from '../lib/dates'
import { Muted } from './ui'

/**
 * Ô ghi nhanh: gõ + Enter, không rời màn hình. Luôn mở, kể cả Night mode.
 * Không hiện list ở đây (xử lý lúc Đóng ngày) để không biến thành to-do list thứ hai.
 */
export function ParkingLot({ today, dark = false }: { today: ISODate; dark?: boolean }) {
  const [text, setText] = useState('')
  const [flash, setFlash] = useState(false)
  const pending = useLiveQuery(
    () => db.parking.filter((p) => p.resolution === undefined).count(),
    [], 0,
  )

  async function submit() {
    if (!text.trim()) return
    await addParking(text, today)
    setText('')
    setFlash(true)
    setTimeout(() => setFlash(false), 900)
  }

  return (
    <div className={dark ? 'rounded-2xl bg-stone-800 p-4 ring-1 ring-stone-700' : 'rounded-2xl bg-stone-100 p-4'}>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <span className={`shrink-0 text-sm font-medium ${dark ? 'text-stone-200' : 'text-stone-700'}`}>Parking Lot</span>
        <Muted className={`text-right ${dark ? 'text-stone-400' : ''}`}>
          {flash ? 'Đã ghi. Quay lại việc.' : pending ? `${pending} ý chờ xử lý lúc đóng ngày` : 'Ý tưởng xen vào → ghi, không switch'}
        </Muted>
      </div>
      <input
        className={`w-full rounded-xl border px-3 py-2.5 text-base focus:outline-none ${
          dark
            ? 'border-stone-600 bg-stone-900 text-stone-100 placeholder:text-stone-500 focus:border-stone-300'
            : 'border-stone-300 bg-white placeholder:text-stone-400 focus:border-stone-900'
        }`}
        placeholder="Gõ rồi Enter…"
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
