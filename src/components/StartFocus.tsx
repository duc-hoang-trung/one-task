import { Play } from 'lucide-react'
import { useState } from 'react'
import { useT } from '../i18n'
import { startSession } from '../lib/actions'
import type { ISODate } from '../lib/dates'
import { requestNotifyPermission } from '../lib/notify'
import type { Settings, Task } from '../lib/types'
import { Button, Modal, Muted } from './ui'

const LAST_KEY = 'focus.lastMin'
const MAX_MIN = 240

/** Thời lượng gợi ý: phút khởi động, pomodoro, 45, 60 (bỏ trùng, tăng dần). */
export function focusPresets(settings: Pick<Settings, 'minFocusMin' | 'pomodoroMin'>): number[] {
  return [...new Set([settings.minFocusMin, settings.pomodoroMin, 45, 60])].filter((n) => n > 0).sort((a, b) => a - b)
}

/** Lần chọn gần nhất (localStorage), rơi về phút khởi động. */
export function lastFocusMin(settings: Pick<Settings, 'minFocusMin'>): number {
  try {
    const n = Number(localStorage.getItem(LAST_KEY))
    if (n > 0 && n <= MAX_MIN) return n
  } catch { /* private mode */ }
  return settings.minFocusMin
}

/** Mặc định cho nút Bắt đầu: ước lượng của việc (nếu ≤ 90′) → lần chọn gần nhất → phút khởi động. */
export function defaultFocusMin(task: Pick<Task, 'estimateMin'> | undefined, settings: Pick<Settings, 'minFocusMin'>): number {
  return task?.estimateMin && task.estimateMin <= 90 ? task.estimateMin : lastFocusMin(settings)
}

/** Bắt đầu phiên với thời lượng đã chọn, ghi nhớ lựa chọn, xin quyền thông báo nếu bật. */
export async function beginFocus(task: Task, today: ISODate, minutes: number, settings: Settings) {
  const n = Math.min(MAX_MIN, Math.max(1, Math.round(minutes) || settings.minFocusMin))
  try { localStorage.setItem(LAST_KEY, String(n)) } catch { /* ignore */ }
  if (settings.notifications.system) void requestNotifyPermission()
  await startSession(task.id, today, n)
}

/**
 * Dãy chip chọn phút: preset + ước lượng của việc (nếu có) + "Khác" nhập tay.
 * Không có nút riêng: gọi onChange, nút Bắt đầu bên ngoài hiện số đã chọn.
 */
export function DurationChips({ value, onChange, settings, estimate, className = '' }: {
  value: number; onChange: (n: number) => void; settings: Pick<Settings, 'minFocusMin' | 'pomodoroMin'>; estimate?: number; className?: string
}) {
  const { t } = useT()
  const presets = focusPresets(settings)
  const est = estimate && estimate > 0 && !presets.includes(estimate) ? estimate : undefined
  const isPreset = presets.includes(value) || value === est
  const [custom, setCustom] = useState(!isPreset)
  const chip = (n: number, label: string) => (
    <button
      key={label} type="button"
      className={`rounded-full px-3 py-1 text-[13px] font-medium tabular-nums transition-colors ${value === n && !custom ? 'bg-ink text-paper' : 'bg-paper-3/70 text-ink-2 hover:bg-paper-3'}`}
      onClick={() => { setCustom(false); onChange(n) }}
    >
      {label}
    </button>
  )
  return (
    <div className={`flex flex-wrap items-center justify-center gap-1.5 ${className}`}>
      {presets.map((n) => chip(n, `${n}′`))}
      {est && chip(est, `~${est}′ · ${t('focus.est')}`)}
      {custom ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 text-paper">
          <input
            autoFocus type="number" inputMode="numeric" min={1} max={MAX_MIN}
            className="w-12 bg-transparent text-center text-[13px] tabular-nums text-paper focus:outline-none"
            value={value} onChange={(e) => onChange(Number(e.target.value))}
            aria-label={t('focus.customPh')}
          />
          <span className="text-[11px] opacity-70">{t('focus.customPh')}</span>
        </span>
      ) : (
        <button type="button" className="rounded-full px-3 py-1 text-[13px] font-medium text-ink-2 hover:bg-paper-3/70" onClick={() => setCustom(true)}>
          {t('focus.custom')}
        </button>
      )}
    </div>
  )
}

/** Hộp chọn thời lượng rồi bắt đầu cho một việc bất kỳ (nút ▶ ở dòng việc). */
export function StartFocusModal({ task, today, settings, onClose }: {
  task: Task; today: ISODate; settings: Settings; onClose: () => void
}) {
  const { t } = useT()
  const [min, setMin] = useState(() => defaultFocusMin(task, settings))
  async function go() {
    await beginFocus(task, today, min, settings)
    onClose()
  }
  return (
    <Modal onClose={onClose}>
      <Muted>{t('focus.on')}</Muted>
      <h2 className="font-display mt-1 text-[22px] leading-snug">{task.title}</h2>
      {task.nextAction && <p className="mt-1 text-sm text-ink-2">{task.nextAction}</p>}
      <p className="mt-4 text-sm font-medium text-ink-2">{t('focus.howLong')}</p>
      <DurationChips value={min} onChange={setMin} settings={settings} estimate={task.estimateMin} className="mt-2 justify-start" />
      <div className="mt-5 flex gap-2">
        <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
        <Button className="flex-1" onClick={() => void go()}><Play size={16} />{t('today.start', { n: min })}</Button>
      </div>
    </Modal>
  )
}
