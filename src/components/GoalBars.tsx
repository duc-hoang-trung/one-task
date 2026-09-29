import { useLiveQuery } from 'dexie-react-hooks'
import { Target } from 'lucide-react'
import { Card, Eyebrow, Muted } from './ui'
import { useT } from '../i18n'
import { db } from '../lib/db'
import type { ISODate } from '../lib/dates'
import { goalProgress } from '../lib/metrics'
import { keyFor } from '../lib/period'
import { HORIZONS, type Goal, type Horizon, type Task } from '../lib/types'

/**
 * Thanh tiến độ mục tiêu của kỳ HIỆN TẠI cho từng chiều: tuần · tháng · quý · năm.
 * Tiến độ = việc đã gắn vào mục tiêu đó đã xong / tổng. Chiều nào chưa có mục tiêu thì bỏ qua,
 * không vẽ hàng rỗng; chưa có mục tiêu nào cả thì thẻ ẩn hẳn để khỏi chiếm chỗ đầu màn.
 */
export function GoalBars({ today }: { today: ISODate }) {
  const { t } = useT()
  const keys = HORIZONS.map((h) => keyFor(h, today))
  const goals = useLiveQuery(
    () => db.goals.where('periodKey').anyOf(keys).filter((g) => !g.deleted && g.status === 'open').toArray(),
    [keys.join(',')], [] as Goal[],
  )
  const ids = goals.map((g) => g.id)
  const tasks = useLiveQuery(
    async () => (ids.length ? db.tasks.where('goalId').anyOf(ids).toArray() : []),
    [ids.sort().join(',')], [] as Task[],
  )
  const rows = HORIZONS.map((h) => ({ h, key: keyFor(h, today), items: goals.filter((g) => g.periodKey === keyFor(h, today)) }))
    .filter((r) => r.items.length > 0)
  if (rows.length === 0) return null

  return (
    <Card className="py-3" testId="goalbars">
      {/* Chỉ để xem: tab Mục tiêu ngay dưới đã là chỗ sửa, thêm nút ở đây chỉ tạo hai lối vào trùng nhau. */}
      <div className="mb-2 flex items-center gap-1.5">
        <Target size={12} className="shrink-0 text-ink-3" />
        <Eyebrow>{t('goal.bars')}</Eyebrow>
      </div>
      <div className="flex flex-col gap-2">
        {rows.map(({ h, items }) => <Row key={h} h={h} items={items} tasks={tasks} />)}
      </div>
    </Card>
  )
}

function Row({ h, items, tasks }: { h: Horizon; items: Goal[]; tasks: Task[] }) {
  const { t } = useT()
  const { done, total } = goalProgress(items, tasks)
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const label = items.length === 1 ? items[0].title : t('goal.bars.many', { n: items.length })
  return (
    <div>
      <div className="flex items-baseline gap-2 text-[13px]">
        <span className="w-12 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-ink-3">{t(`goal.h.${h}`)}</span>
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {total > 0
          ? <span className="shrink-0 tabular-nums text-ink-3">{done}/{total}</span>
          : <Muted className="shrink-0 text-[11px]">{t('goal.bars.noTask')}</Muted>}
      </div>
      {total > 0 && (
        <div className="ml-14 mt-1 h-1.5 overflow-hidden rounded-full bg-paper-3">
          <div className={`h-full rounded-full transition-[width] ${pct === 100 ? 'bg-good' : 'bg-accent'}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  )
}
