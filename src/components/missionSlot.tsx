import { Moon, Sun, Sunrise } from 'lucide-react'
import type { MissionSlot } from '../lib/types'

/** Icon cho từng buổi: mặt trời mọc · mặt trời · trăng. */
export const slotIcon: Record<MissionSlot, typeof Sun> = {
  morning: Sunrise,
  day: Sun,
  evening: Moon,
}

/** Màu chữ theo buổi, đủ nhạt để không tranh chỗ với tên nhiệm vụ. */
export const slotTone: Record<MissionSlot, string> = {
  morning: 'text-accent',
  day: 'text-good',
  evening: 'text-ink-2',
}

export function SlotIcon({ slot, size = 13 }: { slot: MissionSlot; size?: number }) {
  const Icon = slotIcon[slot]
  return <Icon size={size} className="shrink-0" />
}
