import { endSession, extendSession } from '../lib/actions'
import type { Session } from '../lib/types'
import { Button, Muted } from './ui'

const pad = (n: number) => String(n).padStart(2, '0')

/** Đếm ngược phiên đang chạy. Hết giờ hỏi "thêm N?" chứ không hỏi "xong chưa?". */
export function FocusTimer({ session, nowMs, extendMin }: { session: Session; nowMs: number; extendMin: number }) {
  const elapsedSec = Math.floor((nowMs - session.startedAt) / 1000)
  const totalSec = session.plannedMin * 60
  const leftSec = totalSec - elapsedSec
  const over = leftSec <= 0
  const shown = Math.abs(leftSec)
  const pct = Math.min(100, (elapsedSec / totalSec) * 100)

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative flex h-40 w-40 items-center justify-center rounded-full bg-stone-100">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" fill="none" stroke="#e7e5e4" strokeWidth="6" />
          <circle
            cx="50" cy="50" r="46" fill="none" stroke={over ? '#f59e0b' : '#1c1917'} strokeWidth="6"
            strokeDasharray={`${2 * Math.PI * 46}`} strokeDashoffset={`${2 * Math.PI * 46 * (1 - pct / 100)}`} strokeLinecap="round"
          />
        </svg>
        <div className="text-center">
          <div className="text-4xl font-semibold tabular-nums">{over && '+'}{pad(Math.floor(shown / 60))}:{pad(shown % 60)}</div>
          <Muted>{over ? 'đã xong phần hẹn' : `còn / ${session.plannedMin}'`}</Muted>
        </div>
      </div>

      {over ? (
        <div className="flex w-full flex-col gap-2">
          <p className="text-center text-stone-700">Hết {session.plannedMin} phút. Đang vào guồng rồi.</p>
          <Button size="lg" onClick={() => void extendSession(session.id, extendMin)}>Thêm {extendMin} phút</Button>
          <Button variant="ghost" onClick={() => void endSession(session.id)}>Dừng ở đây</Button>
        </div>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => void endSession(session.id)}>Dừng sớm</Button>
      )}
    </div>
  )
}
