import { useEffect, useState } from 'react'
import { fmtDate, useT } from '../i18n'
import { deferTask } from '../lib/actions'
import { toISODate, type ISODate } from '../lib/dates'
import type { DeferralReason, Task } from '../lib/types'
import { Button, Modal, Muted } from './ui'

const HOLD_SECONDS = 5

/**
 * Flow Huỷ có ma sát: đọc lại hậu quả tự viết 5 giây (nếu có) → chọn lý do.
 *  - new-info  : việc này thật sự không cần → bỏ
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
  const { t, lang } = useT()
  const hasConsequence = task.consequence.trim().length > 0
  const [left, setLeft] = useState(hasConsequence ? HOLD_SECONDS : 0)
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
    await deferTask(task.id, today, 'dont-want', 'started anyway')
    onStartAnyway()
  }

  return (
    <Modal onClose={left <= 0 ? onClose : undefined}>
      {hasConsequence ? (
        <>
          <Muted>{t('cancel.wrote', { d: fmtDate(lang, toISODate(new Date(task.createdAt))) })}</Muted>
          <blockquote className="font-display my-4 rounded-2xl border-l-4 border-accent bg-accent-soft/70 p-4 text-[22px] leading-snug text-ink">
            “{task.consequence}”
          </blockquote>
        </>
      ) : (
        <p className="font-display mb-4 text-[22px] leading-snug">{task.title}</p>
      )}

      {left > 0 ? (
        <Muted className="text-center tabular-nums">{t('cancel.reading', { n: left })}</Muted>
      ) : reason === 'dont-want' ? (
        <div className="flex flex-col gap-3">
          <p className="text-ink-2">{t('cancel.dontWantMsg')}</p>
          <Button size="lg" variant="accent" onClick={() => void startAnyway()}>{t('cancel.tenThenDecide', { n: minFocusMin })}</Button>
          <Button variant="ghost" onClick={onClose}>{t('common.back')}</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Muted>{t('cancel.why')}</Muted>
          <Button variant="secondary" onClick={() => void pick('new-info')}>{t('cancel.newInfo')}</Button>
          <Button variant="secondary" onClick={() => void pick('urgent')}>{t('cancel.urgent')}</Button>
          <Button variant="secondary" onClick={() => void pick('dont-want')}>{t('cancel.dontWant')}</Button>
          <Button variant="ghost" onClick={onClose}>{t('cancel.keep')}</Button>
        </div>
      )}
    </Modal>
  )
}
