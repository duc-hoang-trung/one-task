import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

const GAP = 4
/** Chừa tab bar dưới cùng trên điện thoại. */
const BOTTOM_SAFE = 80

/**
 * Menu nổi neo vào một element, render ra body (portal) nên không bị Card / section khác đè,
 * không phụ thuộc stacking context của màn hình. Căn phải theo anchor; lật lên nếu thiếu chỗ dưới.
 * Đóng khi bấm ngoài, cuộn, đổi kích cỡ, Escape.
 */
export function Popover({ anchor, onClose, children, width = 208 }: {
  anchor: HTMLElement
  onClose: () => void
  children: ReactNode
  width?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    const a = anchor.getBoundingClientRect()
    const h = ref.current?.offsetHeight ?? 0
    const left = Math.max(8, Math.min(a.right - width, window.innerWidth - width - 8))
    const below = a.bottom + GAP
    const fits = below + h <= window.innerHeight - BOTTOM_SAFE
    setPos({ top: fits ? below : Math.max(8, a.top - GAP - h), left })
  }, [anchor, width])

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('pointerdown', onDown, true)
    window.addEventListener('scroll', onClose, { capture: true, passive: true })
    window.addEventListener('resize', onClose)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('scroll', onClose, { capture: true })
      window.removeEventListener('resize', onClose)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return createPortal(
    <div
      ref={ref}
      role="menu"
      style={{ position: 'fixed', top: pos?.top ?? -9999, left: pos?.left ?? -9999, width, zIndex: 60 }}
      className="overflow-hidden rounded-xl bg-paper shadow-card ring-1 ring-line"
      // React event vẫn nổi qua portal lên listener của dnd-kit ở dòng cha → chặn tại đây
      onPointerDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body,
  )
}
