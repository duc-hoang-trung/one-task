import { useEffect, useState } from 'react'
import { deferTask } from '../lib/actions'
import { fmtDateVi, toISODate, type ISODate } from '../lib/dates'
import type { DeferralReason, Task } from '../lib/types'
import { Button, Modal, Muted } from './ui'

const HOLD_SECONDS = 5

/**
 * Flow Huỷ có ma sát: đọc lại hậu quả tự viết 5 giây → chọn lý do.
 *  - new-info  : thông tin mới cho thấy việc này thật sự không cần → bỏ
 *  - urgent    : có việc khẩn hơn hôm nay → dời sang mai
 *  - dont-want : không muốn làm → chỉ có 1 nút: "Làm 10 phút rồi quyết"
 */
export function CancelFlow({
  task, today, minFocusMin, onStartAnyway, onResolved, onClose,
}: {
  task: Task
  today: ISODate
  minFocusMin: number
  onStartAnyway: () => void
  onResolved: (reason: DeferralReason) => void
  onClose: () => void
}) {
  const [left, setLeft] = useState(HOLD_SECONDS)
  const [reason, setReason] = useState<DeferralReason | null>(null)

  useEffect(() => {
    if (left <= 0) return
    const id = setTimeout(() => setLeft((l) => l - 1), 1000)
    return () => clearTimeout(id)
  }, [left])

  async function pick(r: DeferralReason) {
    if (r === 'dont-want') {
      setReason(r)
      return
    }
    await deferTask(task.id, today, r)
    onResolved(r)
  }

  async function startAnyway() {
    await deferTask(task.id, today, 'dont-want', 'đã làm 10 phút rồi quyết')
    onStartAnyway()
  }

  return (
    <Modal onClose={left <= 0 ? onClose : undefined}>
      <Muted>Bạn tự viết câu này lúc {fmtDateVi(toISODate(new Date(task.createdAt)))}:</Muted>
      <blockquote className="my-4 rounded-xl border-l-4 border-amber-500 bg-amber-50 p-4 text-lg leading-snug text-stone-900">
        “{task.consequence}”
      </blockquote>

      {left > 0 ? (
        <Muted className="text-center">Đọc lại {left}s…</Muted>
      ) : reason === 'dont-want' ? (
        <div className="flex flex-col gap-3">
          <p className="text-stone-700">
            "Không muốn làm" là cảm giác lúc này, không phải đánh giá về việc. Cảm giác đó thường tan sau vài phút bắt đầu.
          </p>
          <Button size="lg" onClick={() => void startAnyway()}>Làm {minFocusMin} phút rồi quyết</Button>
          <Button variant="ghost" onClick={onClose}>Quay lại</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Muted>Vì sao không làm hôm nay?</Muted>
          <Button variant="secondary" onClick={() => void pick('new-info')}>Có thông tin mới: việc này thật sự không cần nữa</Button>
          <Button variant="secondary" onClick={() => void pick('urgent')}>Có việc khẩn hơn hôm nay → dời sang mai</Button>
          <Button variant="secondary" onClick={() => void pick('dont-want')}>Không muốn làm</Button>
          <Button variant="ghost" onClick={onClose}>Thôi, làm tiếp</Button>
        </div>
      )}
    </Modal>
  )
}
