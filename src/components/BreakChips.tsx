import type { Settings } from '../lib/types'

/** Các mốc nghỉ gợi ý: phút nghỉ trong Cài đặt + 10 · 15 · 20 (bỏ trùng, tăng dần). */
export function breakPresets(settings: Pick<Settings, 'breakMin'>): number[] {
  return [...new Set([settings.breakMin, 5, 10, 15, 20])].filter((n) => n > 0).sort((a, b) => a - b)
}

/** Dãy chip chọn số phút nghỉ. Chạm một chip là nghỉ luôn với số phút đó. */
export function BreakChips({ settings, onPick, className = '' }: {
  settings: Pick<Settings, 'breakMin'>
  onPick: (min: number) => void
  className?: string
}) {
  return (
    <div className={`flex flex-wrap items-center justify-center gap-1.5 ${className}`}>
      {breakPresets(settings).map((n) => (
        <button
          key={n} type="button"
          className="rounded-full bg-good/15 px-3 py-1 text-[13px] font-medium tabular-nums text-good transition-colors hover:bg-good/25"
          onClick={() => onPick(n)}
        >
          {n}′
        </button>
      ))}
    </div>
  )
}
