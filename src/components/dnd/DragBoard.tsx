import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, TouchSensor, pointerWithin, rectIntersection, useDraggable, useDroppable,
  useSensor, useSensors, type CollisionDetection, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { useState, type ReactNode } from 'react'

/**
 * Bảng kéo thả giữa các vùng (không sắp thứ tự trong vùng).
 * onDrop(activeId, zoneId) khi thả một item vào một DropZone.
 */
export function DragBoard({
  onDrop, renderOverlay, children,
}: {
  onDrop: (activeId: string, zoneId: string) => void
  renderOverlay?: (activeId: string) => ReactNode
  children: ReactNode
}) {
  const [active, setActive] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  )
  const collision: CollisionDetection = (args) => {
    const within = pointerWithin(args)
    return within.length ? within : rectIntersection(args)
  }
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={(e: DragStartEvent) => setActive(String(e.active.id))}
      onDragCancel={() => setActive(null)}
      onDragEnd={(e: DragEndEvent) => {
        setActive(null)
        if (e.over) onDrop(String(e.active.id), String(e.over.id))
      }}
    >
      {children}
      <DragOverlay dropAnimation={null}>{active && renderOverlay ? renderOverlay(active) : null}</DragOverlay>
    </DndContext>
  )
}

export function DropZone({ id, children, className = '', activeClassName = 'ring-2 ring-accent/60 bg-accent-soft/40' }: { id: string; children: ReactNode; className?: string; activeClassName?: string }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className={`${className} ${isOver ? activeClassName : ''}`}>
      {children}
    </div>
  )
}

export function DragItem({ id, children, className = '', disabled = false }: { id: string; children: ReactNode; className?: string; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, disabled })
  return (
    <div ref={setNodeRef} className={`${isDragging ? 'opacity-30' : ''} ${className}`} {...attributes} {...listeners}>
      {children}
    </div>
  )
}
