import { useState } from 'react'
import { Button, Card, Field, Input, Muted, Page } from '../components/ui'
import { wipeAll } from '../lib/actions'
import { isClockOverridden } from '../lib/clock'
import { db, exportAll } from '../lib/db'
import type { Settings } from '../lib/types'

export function SettingsScreen({ settings, onboarding = false, onDone }: { settings: Settings; onboarding?: boolean; onDone?: () => void }) {
  const [s, setS] = useState(settings)
  const [saved, setSaved] = useState(false)
  const [confirmWipe, setConfirmWipe] = useState(false)

  async function save() {
    await db.settings.put({ ...s, onboarded: true })
    setSaved(true)
    setTimeout(() => setSaved(false), 1200)
    onDone?.()
  }

  async function download() {
    const data = await exportAll()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `motviec-${data.exportedAt.slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Page title={onboarding ? 'Một Việc' : 'Cài đặt'} subtitle={onboarding ? 'Ba mốc giờ. Còn lại app tự lo.' : undefined}>
      {onboarding && (
        <Card className="bg-stone-100 ring-0">
          <p className="text-stone-800">Một việc chính mỗi ngày. Sáng 1 phút: bắt đầu. Tối 3 phút: đóng ngày. Sau đó khoá tới sáng.</p>
        </Card>
      )}
      <Card>
        <div className="flex flex-col gap-4">
          <Field label="Giờ đóng ngày (Shutdown)" hint="Nên cách giờ ngủ ≥ 2 tiếng. App sẽ nhắc đúng một lần.">
            <Input type="time" value={s.shutdownTime} onChange={(e) => setS({ ...s, shutdownTime: e.target.value })} />
          </Field>
          <Field label="Giờ ngủ mục tiêu">
            <Input type="time" value={s.bedtimeTarget} onChange={(e) => setS({ ...s, bedtimeTarget: e.target.value })} />
          </Field>
          <Field label="Giờ mở máy buổi sáng" hint="Chỉ để hiện trong Night mode: 'Sáng mai lúc…'.">
            <Input type="time" value={s.morningTime} onChange={(e) => setS({ ...s, morningTime: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phút tối thiểu">
              <Input type="number" min={5} max={60} value={s.minFocusMin} onChange={(e) => setS({ ...s, minFocusMin: Number(e.target.value) || 10 })} />
            </Field>
            <Field label="Phút gia hạn">
              <Input type="number" min={5} max={60} value={s.extendMin} onChange={(e) => setS({ ...s, extendMin: Number(e.target.value) || 15 })} />
            </Field>
          </div>
          <Button size="lg" onClick={() => void save()}>{saved ? 'Đã lưu' : onboarding ? 'Bắt đầu' : 'Lưu'}</Button>
        </div>
      </Card>

      {!onboarding && (
        <>
          <Card>
            <h2 className="font-semibold">Dữ liệu</h2>
            <Muted>Mọi thứ nằm trong trình duyệt này (IndexedDB). Không có server, không có tài khoản.</Muted>
            <div className="mt-3 flex flex-col gap-2">
              <Button variant="secondary" onClick={() => void download()}>Tải bản sao JSON</Button>
              {confirmWipe ? (
                <div className="flex gap-2">
                  <Button variant="danger" onClick={() => void wipeAll().then(() => location.reload())}>Xoá thật</Button>
                  <Button variant="ghost" onClick={() => setConfirmWipe(false)}>Thôi</Button>
                </div>
              ) : (
                <Button variant="danger" onClick={() => setConfirmWipe(true)}>Xoá toàn bộ dữ liệu…</Button>
              )}
            </div>
          </Card>
          <Card>
            <h2 className="font-semibold">Test / demo</h2>
            <Muted>
              Thêm <code>?d=YYYY-MM-DD&t=HH:MM</code> vào URL để giả lập thời gian trong tab này; <code>?reset-clock</code> để về giờ thật.
              {isClockOverridden() && <strong className="block text-amber-700">Đang chạy giờ giả lập.</strong>}
            </Muted>
          </Card>
        </>
      )}
    </Page>
  )
}
