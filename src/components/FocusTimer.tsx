import { Coffee, Play } from 'lucide-react'
import { useEffect } from 'react'
import { useT } from '../i18n'
import { alertUser, once } from '../lib/notify'
import { endSession, extendSession, startBreak, startSession } from '../lib/actions'
import type { ISODate } from '../lib/dates'
import type { Session, Settings } from '../lib/types'
import { Button, Muted } from './ui'

const pad = (n: number) => String(n).padStart(2, '0')
const R = 46
const C = 2 * Math.PI * R

/**
 * Đếm ngược phiên đang chạy (focus hoặc break).
 * Hết giờ focus hỏi "thêm N?" chứ không hỏi "xong chưa?".
 * Khi đã tập trung liền ≥ pomodoroMin → gợi ý nghỉ breakMin (không bắt buộc).
 */
export function FocusTimer({
  session, nowMs, settings, streakMin, today, taskId,
}: {
  session: Session
  nowMs: number
  settings: Pick<Settings, 'extendMin' | 'pomodoroMin' | 'breakMin' | 'minFocusMin' | 'notifications'>
  streakMin: number
  today: ISODate
  taskId: string
}) {
  const { t } = useT()
  const isBreak = session.kind === 'break'
  const elapsedSec = Math.floor((nowMs - session.startedAt) / 1000)
  const totalSec = session.plannedMin * 60
  const leftSec = totalSec - elapsedSec
  const over = leftSec <= 0
  const shown = Math.abs(leftSec)
  const pct = Math.min(1, elapsedSec / totalSec)
  const suggestBreak = !isBreak && streakMin >= settings.pomodoroMin

  useEffect(() => {
    if (!over) return
    once(`timer:${session.id}:${session.plannedMin}`, () =>
      isBreak
        ? alertUser(settings.notifications, t('notif.breakDone'), t('notif.breakDone.body'), 'break', 'break')
        : alertUser(settings.notifications, t('notif.timerDone', { n: session.plannedMin }), t('notif.timerDone.body'), 'done', 'timer'),
    )
  }, [over, isBreak, session.id, session.plannedMin, settings.notifications, t])

  const resume = () => void startSession(taskId, today, settings.minFocusMin, nowMs)

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative flex h-44 w-44 items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={R} fill="none" className="stroke-paper-3" strokeWidth="3" />
          <circle
            cx="50" cy="50" r={R} fill="none"
            className={isBreak ? 'stroke-good' : over ? 'stroke-accent-2' : 'stroke-accent'} strokeWidth="3"
            strokeDasharray={`${C}`} strokeDashoffset={`${C * (1 - pct)}`} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div className="text-center">
          {isBreak && <Muted className="mb-1 flex items-center justify-center gap-1 text-good"><Coffee size={14} />{t('timer.onBreak')}</Muted>}
          <div className="font-display text-[44px] leading-none tabular-nums tracking-tight">
            {over && <span className="text-accent">+</span>}{pad(Math.floor(shown / 60))}:{pad(shown % 60)}
          </div>
          <Muted className="mt-2">{over ? (isBreak ? t('timer.breakOver') : t('timer.over')) : t('timer.left', { n: session.plannedMin })}</Muted>
        </div>
      </div>

      {isBreak ? (
        <div className="flex w-full flex-col gap-2">
          <Button size="lg" variant={over ? 'primary' : 'secondary'} onClick={resume}><Play size={18} />{t('timer.resume')}</Button>
          {!over && <Button variant="ghost" size="sm" onClick={resume}>{t('timer.skipBreak')}</Button>}
        </div>
      ) : over ? (
        <div className="flex w-full flex-col gap-2">
          <p className="text-center text-ink-2">{suggestBreak ? t('timer.breakHint', { n: streakMin }) : t('timer.overMsg', { n: session.plannedMin })}</p>
          {suggestBreak ? (
            <>
              <Button size="lg" onClick={() => void startBreak(today, settings.breakMin, nowMs)}><Coffee size={18} />{t('timer.break', { n: settings.breakMin })}</Button>
              <Button variant="secondary" onClick={() => void extendSession(session.id, settings.extendMin)}>{t('timer.extend', { n: settings.extendMin })}</Button>
            </>
          ) : (
            <Button size="lg" onClick={() => void extendSession(session.id, settings.extendMin)}>{t('timer.extend', { n: settings.extendMin })}</Button>
          )}
          <Button variant="ghost" onClick={() => void endSession(session.id, nowMs)}>{t('timer.stop')}</Button>
        </div>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => void endSession(session.id, nowMs)}>{t('timer.stopEarly')}</Button>
      )}
    </div>
  )
}
