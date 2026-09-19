import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import { useT } from '../i18n'
import type { DodItem } from '../lib/types'

/**
 * Danh sách việc con có tick. Điều khiển từ ngoài qua value/onChange nên dùng được cả trong
 * TaskSheet (lưu khi bấm Lưu) và TaskRow (lưu ngay từng tick).
 */
export function SubtaskList({ value, onChange, editable = true, disabled = false, compact = false }: {
  value: DodItem[]
  onChange: (next: DodItem[]) => void
  /** false: chỉ tick, không thêm/xoá/sửa chữ */
  editable?: boolean
  /** true: chỉ xem */
  disabled?: boolean
  compact?: boolean
}) {
  const { t } = useT()
  const [draft, setDraft] = useState('')

  const toggle = (i: number, done: boolean) => onChange(value.map((d, j) => (j === i ? { ...d, done } : d)))
  const rename = (i: number, text: string) => onChange(value.map((d, j) => (j === i ? { ...d, text } : d)))
  const remove = (i: number) => onChange(value.filter((_, j) => j !== i))
  const add = () => {
    const text = draft.trim()
    if (!text) return
    onChange([...value, { text, done: false }])
    setDraft('')
  }

  return (
    <div className={compact ? 'text-[14px]' : ''}>
      <ul className="flex flex-col gap-1.5">
        {value.map((d, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <input
              type="checkbox" className="mt-1 h-4.5 w-4.5 shrink-0 accent-accent" checked={d.done} disabled={disabled}
              aria-label={d.text}
              onChange={(e) => toggle(i, e.target.checked)}
            />
            {editable ? (
              <input
                className={`min-w-0 flex-1 bg-transparent py-0.5 focus:outline-none ${d.done ? 'text-ink-3 line-through' : 'text-ink'}`}
                value={d.text} onChange={(e) => rename(i, e.target.value)}
              />
            ) : (
              <span className={`min-w-0 flex-1 py-0.5 ${d.done ? 'text-ink-3 line-through' : ''}`}>{d.text}</span>
            )}
            {editable && (
              <button type="button" aria-label={t('common.delete')} className="shrink-0 rounded p-0.5 text-ink-3 hover:text-bad" onClick={() => remove(i)}>
                <X size={14} />
              </button>
            )}
          </li>
        ))}
      </ul>
      {editable && (
        <div className="mt-1.5 flex items-center gap-2 text-ink-3">
          <Plus size={14} className="shrink-0" />
          <input
            className="min-w-0 flex-1 bg-transparent py-1 text-[14px] text-ink placeholder:text-ink-3/70 focus:outline-none"
            placeholder={t('sub.add.ph')} value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
            onBlur={add}
            enterKeyHint="done"
          />
        </div>
      )}
    </div>
  )
}
