import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, TouchSensor, pointerWithin, rectIntersection, useDraggable, useDroppable,
  useSensor, useSensors, type CollisionDetection, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

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
      {/* Portal ra body: nếu để trong Page (có animation/transform) thì bóng kéo bị lệch so với chuột và nằm dưới tab bar. */}
      {createPortal(<DragOverlay dropAnimation={null} zIndex={70}>{active && renderOverlay ? renderOverlay(active) : null}</DragOverlay>, document.body)}
    </DndContext>
  )
}

export function DropZone({ id, children, className = '', activeClassName = 'ring-2 ring-accent/60 bg-accent-soft/40', disabled = false }: {
  id: string; children: ReactNode; className?: string; activeClassName?: string; disabled?: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled })
  return (
    <div ref={setNodeRef} className={`${className} ${isOver ? activeClassName : ''}`}>
      {children}
    </div>
  )
}

export function DragItem({ id, children, className = '', disabled = false }: { id: string; children: ReactNode; className?: string; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, disabled })
  return (
    <div ref={setNodeRef} className={`draggable ${disabled ? '' : 'cursor-grab active:cursor-grabbing'} ${isDragging ? 'opacity-30' : ''} ${className}`} {...attributes} {...listeners}>
      {children}
    </div>
  )
}
