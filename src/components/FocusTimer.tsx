import { Coffee, Pause, Play } from 'lucide-react'
import { useEffect } from 'react'
import { useTicker } from '../hooks'
import { useT } from '../i18n'
import { toHM } from '../lib/dates'
import { alertUser, once } from '../lib/notify'
import { endSession, extendSession, pauseSession, resumeSession, startBreak, startSession } from '../lib/actions'
import type { ISODate } from '../lib/dates'
import { elapsedMs, isFocus, isPaused, isRunning, marks } from '../lib/session'
import type { Session, Settings } from '../lib/types'
import { Button, Muted } from './ui'

const pad = (n: number) => String(n).padStart(2, '0')
const R = 46
const C = 2 * Math.PI * R
/** Hết giờ quá lâu (vd. bấm Tiếp tục sau một giờ tạm dừng) thì không kêu nữa. */
const ALERT_WINDOW_MS = 2 * 60_000

/**
 * Đếm ngược phiên đang chạy (focus hoặc break). Tự tick, không phụ thuộc đồng hồ app.
 * Focus có thể tạm dừng (tay hoặc tự động khi ẩn app); break tính theo giờ thật.
 * Hết giờ focus hỏi "thêm N?" chứ không hỏi "xong chưa?".
 * Khi đã tập trung liền ≥ pomodoroMin → gợi ý nghỉ breakMin (không bắt buộc).
 */
export function FocusTimer({
  session, settings, streakMin, today, taskId,
}: {
  session: Session
  settings: Pick<Settings, 'extendMin' | 'pomodoroMin' | 'breakMin' | 'minFocusMin' | 'notifications'>
  streakMin: number
  today: ISODate
  taskId: string
}) {
  const { t } = useT()
  const isBreak = !isFocus(session)
  const paused = isPaused(session)
  const running = isRunning(session)
  const nowMs = useTicker(running)
  const elapsed = elapsedMs(session, nowMs)
  const elapsedSec = Math.floor(elapsed / 1000)
  const totalSec = session.plannedMin * 60
  const leftSec = totalSec - elapsedSec
  const over = leftSec <= 0
  const shown = Math.abs(leftSec)
  const pct = Math.min(1, elapsedSec / totalSec)
  const suggestBreak = !isBreak && streakMin >= settings.pomodoroMin

  // Heartbeat: dấu vết "vẫn đang hiển thị" để đối soát khi app bị giết không kịp báo ẩn.
  useEffect(() => {
    if (!running || isBreak) return
    marks.seen(session.id, nowMs)
  }, [running, isBreak, session.id, Math.floor(nowMs / 5000)]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!over || !running || elapsed - totalSec * 1000 > ALERT_WINDOW_MS) return
    once(`timer:${session.id}:${session.plannedMin}`, () =>
      isBreak
        ? alertUser(settings.notifications, t('notif.breakDone'), t('notif.breakDone.body'), 'break', 'break')
        : alertUser(settings.notifications, t('notif.timerDone', { n: session.plannedMin }), t('notif.timerDone.body'), 'done', 'timer'),
    )
  }, [over, running, elapsed, totalSec, isBreak, session.id, session.plannedMin, settings.notifications, t])

  const resumeAfterBreak = () => void startSession(taskId, today, settings.minFocusMin)
  const stop = () => { marks.clear(); void endSession(session.id) }

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative flex h-44 w-44 items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={R} fill="none" className="stroke-paper-3" strokeWidth="3" />
          <circle
            cx="50" cy="50" r={R} fill="none"
            className={paused ? 'stroke-ink-3' : isBreak ? 'stroke-good' : over ? 'stroke-accent-2' : 'stroke-accent'} strokeWidth="3"
            strokeDasharray={`${C}`} strokeDashoffset={`${C * (1 - pct)}`} strokeLinecap="round"
          />
        </svg>
        <div className="text-center">
          {isBreak && <Muted className="mb-1 flex items-center justify-center gap-1 text-good"><Coffee size={14} />{t('timer.onBreak')}</Muted>}
          {paused && <Muted className="mb-1 flex items-center justify-center gap-1 text-[12px]"><Pause size={12} />{t('timer.pausedShort', { t: toHM(new Date(session.pausedAt!)) })}</Muted>}
          <div data-testid="timer" className={`font-display text-[44px] leading-none tabular-nums tracking-tight ${paused ? 'text-ink-3' : ''}`}>
            {over && <span className="text-accent">+</span>}{pad(Math.floor(shown / 60))}:{pad(shown % 60)}
          </div>
          <Muted className="mt-2">{over ? (isBreak ? t('timer.breakOver') : t('timer.over')) : t('timer.left', { n: session.plannedMin })}</Muted>
        </div>
      </div>

      {paused ? (
        <div className="flex w-full flex-col gap-2">
          <Button size="lg" onClick={() => { marks.clear(); void resumeSession(session.id) }}><Play size={18} />{t('timer.continue')}</Button>
          <Muted className="text-center">{t('timer.paused', { t: toHM(new Date(session.pausedAt!)) })}. {t('timer.pausedHint')}</Muted>
          <Button variant="ghost" size="sm" onClick={stop}>{t('timer.stop')}</Button>
        </div>
      ) : isBreak ? (
        <div className="flex w-full flex-col gap-2">
          <Button size="lg" variant={over ? 'primary' : 'secondary'} onClick={resumeAfterBreak}><Play size={18} />{t('timer.resume')}</Button>
          {!over && <Button variant="ghost" size="sm" onClick={resumeAfterBreak}>{t('timer.skipBreak')}</Button>}
        </div>
      ) : over ? (
        <div className="flex w-full flex-col gap-2">
          <p className="text-center text-ink-2">{suggestBreak ? t('timer.breakHint', { n: streakMin }) : t('timer.overMsg', { n: session.plannedMin })}</p>
          {suggestBreak ? (
            <>
              <Button size="lg" onClick={() => void startBreak(today, settings.breakMin)}><Coffee size={18} />{t('timer.break', { n: settings.breakMin })}</Button>
              <Button variant="secondary" onClick={() => void extendSession(session.id, settings.extendMin)}>{t('timer.extend', { n: settings.extendMin })}</Button>
            </>
          ) : (
            <Button size="lg" onClick={() => void extendSession(session.id, settings.extendMin)}>{t('timer.extend', { n: settings.extendMin })}</Button>
          )}
          <Button variant="ghost" onClick={stop}>{t('timer.stop')}</Button>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => void extendSession(session.id, settings.extendMin)}>{t('timer.addMore', { n: settings.extendMin })}</Button>
          <Button variant="ghost" size="sm" onClick={() => void pauseSession(session.id)}><Pause size={14} />{t('timer.pause')}</Button>
          <Button variant="ghost" size="sm" onClick={stop}>{t('timer.stopEarly')}</Button>
        </div>
      )}
    </div>
  )
}
