import {
  DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ReactNode } from 'react'

/**
 * Danh sách dọc kéo thả sắp thứ tự. Touch cần giữ 180ms để không cản scroll.
 * onReorder nhận mảng id theo thứ tự mới.
 */
export function SortableList({ ids, onReorder, children }: { ids: string[]; onReorder: (ids: string[]) => void; children: ReactNode }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    if (from < 0 || to < 0) return
    onReorder(arrayMove(ids, from, to))
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>{children}</SortableContext>
    </DndContext>
  )
}

/** Bọc một dòng để kéo được. Tay cầm là cả dòng (giữ lâu trên touch). */
export function SortableItem({ id, children, className = '' }: { id: string; children: ReactNode; className?: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`${isDragging ? 'z-10 opacity-90 shadow-card' : ''} ${className}`}
      {...attributes}
      {...listeners}
    >
      {children}
    </li>
  )
}
