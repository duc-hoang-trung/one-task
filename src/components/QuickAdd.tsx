import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useT } from '../i18n'
import { createTask } from '../lib/actions'
import type { ISODate } from '../lib/dates'
import { parseQuickAdd } from '../lib/quickAdd'
import type { Area, Quadrant } from '../lib/types'

/** Ô thêm nhanh: Enter để tạo. Toggle khu vực; token #w/#p/!n/~m ghi đè. */
export function QuickAdd({
  scheduledFor, defaultArea, quadrant, onCreated, placeholder,
}: { scheduledFor?: ISODate; defaultArea: Area; quadrant?: Quadrant; onCreated?: (id: string) => void; placeholder?: string }) {
  const { t } = useT()
  const [text, setText] = useState('')
  const [area, setArea] = useState<Area>(defaultArea)

  async function submit() {
    const q = parseQuickAdd(text)
    if (!q.title) return
    const task = await createTask({ title: q.title, area: q.area ?? area, quadrant: q.quadrant ?? quadrant, estimateMin: q.estimateMin, scheduledFor })
    setText('')
    onCreated?.(task.id)
  }

  return (
    <div>
      <div className="flex items-center gap-2 rounded-xl border border-line bg-paper px-2 py-1 focus-within:border-accent">
        <Plus size={16} className="shrink-0 text-ink-3" />
        <input
          className="min-w-0 flex-1 bg-transparent py-1.5 text-[15px] placeholder:text-ink-3/70 focus:outline-none"
          placeholder={placeholder ?? t('quick.ph')}
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
        <button
          type="button"
          className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${area === 'work' ? 'bg-ink text-paper' : 'bg-paper-3 text-ink-2'}`}
          onClick={() => setArea((a) => (a === 'work' ? 'personal' : 'work'))}
        >
          {t(`area.${area}`)}
        </button>
      </div>
      <p className="mt-1 px-1 text-[11px] text-ink-3">{t('quick.hint')}</p>
    </div>
  )
}
