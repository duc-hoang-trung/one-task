import { useLiveQuery } from 'dexie-react-hooks'
import { DragItem, DropZone } from '../../components/dnd/DragBoard'
import { QuadrantChip } from '../../components/QuadrantChip'
import { QuickAdd } from '../../components/QuickAdd'
import { Eyebrow, Muted } from '../../components/ui'
import { useT } from '../../i18n'
import { backlogTasks, byOrder, isOpen } from '../../lib/db'
import { QUADRANTS, type Area } from '../../lib/types'

const LIMIT = 8
const qRank = (q?: string) => (q ? QUADRANTS.indexOf(q as (typeof QUADRANTS)[number]) : QUADRANTS.length)

/**
 * Backlog dùng chung cho Tuần và Tháng: kéo việc từ đây vào một ngày, kéo việc về đây để gỡ khỏi lịch.
 * Q1 → Q4 → chưa phân loại, tối đa 8 dòng. Phải nằm trong cùng DragBoard với các vùng thả.
 */
export function BacklogPanel({ defaultArea, className = '' }: { defaultArea: Area; className?: string }) {
  const { t } = useT()
  const backlog = useLiveQuery(() => backlogTasks(), [], [])
  const open = backlog.filter(isOpen).sort((a, b) => qRank(a.quadrant) - qRank(b.quadrant) || byOrder(a, b))
  return (
    <DropZone id="backlog" className={`flex flex-col rounded-2xl border border-dashed border-line p-3 ${className}`}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <Eyebrow>{t('plan.backlogZone', { n: open.length })}</Eyebrow>
        <Muted className="truncate text-[11px]">{t('plan.backlogZone.hint')}</Muted>
      </div>
      <ul className="flex flex-col gap-1">
        {open.slice(0, LIMIT).map((x) => (
          <li key={x.id}>
            <DragItem id={`task:${x.id}`}>
              <div className="flex items-center gap-2 rounded-lg bg-paper/70 px-2 py-1.5 text-sm ring-1 ring-line"><QuadrantChip q={x.quadrant} /><span className="truncate">{x.title}</span></div>
            </DragItem>
          </li>
        ))}
      </ul>
      {open.length > LIMIT && <Muted className="mt-1">+{open.length - LIMIT} …</Muted>}
      <div className="mt-2"><QuickAdd defaultArea={defaultArea} placeholder={t('plan.addBacklog.ph')} /></div>
    </DropZone>
  )
}
