import { useT } from '../i18n'
import type { Quadrant } from '../lib/types'

export const quadrantTone: Record<Quadrant, string> = {
  q1: 'bg-bad/12 text-bad',
  q2: 'bg-accent-soft text-accent',
  q3: 'bg-paper-3 text-ink-2',
  q4: 'bg-paper-3/60 text-ink-3',
}

export function QuadrantChip({ q, short = true }: { q?: Quadrant; short?: boolean }) {
  const { t } = useT()
  if (!q) return null
  return (
    <span className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${quadrantTone[q]}`}>
      {short ? q.toUpperCase() : t(`q.${q}`)}
    </span>
  )
}
