import { useState } from 'react'
import { Button, Card, Field, Input, Muted, Page, Select } from '../components/ui'
import { AccountCard } from '../components/AccountCard'
import { useT } from '../i18n'
import { wipeAll } from '../lib/actions'
import { isClockOverridden } from '../lib/clock'
import { exportAll, put } from '../lib/db'
import type { Area, LangSetting, Settings } from '../lib/types'

export function SettingsScreen({ settings, onboarding = false, onDone }: { settings: Settings; onboarding?: boolean; onDone?: () => void }) {
  const { t } = useT()
  const [s, setS] = useState(settings)
  const [saved, setSaved] = useState(false)
  const [confirmWipe, setConfirmWipe] = useState(false)

  async function save() {
    await put('settings', { ...s, onboarded: true })
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

  // Đổi ngôn ngữ áp dụng ngay (lưu luôn) để người dùng thấy hiệu quả.
  async function setLang(lang: LangSetting) {
    const next = { ...s, lang }
    setS(next)
    await put('settings', { ...next, onboarded: settings.onboarded })
  }

  return (
    <Page title={onboarding ? t('app.name') : t('set.title')} subtitle={onboarding ? t('onb.subtitle') : undefined}>
      {onboarding && (
        <Card tone="accent">
          <p className="text-ink-2">{t('onb.intro')}</p>
        </Card>
      )}
      <Card>
        <div className="flex flex-col gap-4">
          <Field label={t('set.lang')}>
            <Select value={s.lang} onChange={(e) => void setLang(e.target.value as LangSetting)}>
              <option value="auto">{t('set.lang.auto')}</option>
              <option value="vi">Tiếng Việt</option>
              <option value="en">English</option>
            </Select>
          </Field>
          <Field label={t('set.shutdown')} hint={t('set.shutdown.hint')}>
            <Input type="time" value={s.shutdownTime} onChange={(e) => setS({ ...s, shutdownTime: e.target.value })} />
          </Field>
          <Field label={t('set.bedtime')}>
            <Input type="time" value={s.bedtimeTarget} onChange={(e) => setS({ ...s, bedtimeTarget: e.target.value })} />
          </Field>
          <Field label={t('set.morning')}>
            <Input type="time" value={s.morningTime} onChange={(e) => setS({ ...s, morningTime: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('set.minFocus')}>
              <Input type="number" min={5} max={60} value={s.minFocusMin} onChange={(e) => setS({ ...s, minFocusMin: Number(e.target.value) || 10 })} />
            </Field>
            <Field label={t('set.extend')}>
              <Input type="number" min={5} max={60} value={s.extendMin} onChange={(e) => setS({ ...s, extendMin: Number(e.target.value) || 15 })} />
            </Field>
            <Field label={t('set.pomodoro')} hint={t('set.pomodoro.hint')}>
              <Input type="number" min={10} max={90} value={s.pomodoroMin} onChange={(e) => setS({ ...s, pomodoroMin: Number(e.target.value) || 25 })} />
            </Field>
            <Field label={t('set.break')}>
              <Input type="number" min={1} max={30} value={s.breakMin} onChange={(e) => setS({ ...s, breakMin: Number(e.target.value) || 5 })} />
            </Field>
          </div>
          {!onboarding && (
            <>
              <Field label={t('set.defaultArea')}>
                <Select value={s.defaultArea} onChange={(e) => setS({ ...s, defaultArea: e.target.value as Area })}>
                  <option value="work">{t('area.work')}</option>
                  <option value="personal">{t('area.personal')}</option>
                </Select>
              </Field>
              <Field label={t('set.notify')} hint={t('set.notify.hint')}>
                <div className="flex flex-col gap-2 pt-1">
                  {(['sound', 'vibrate', 'system'] as const).map((k) => (
                    <label key={k} className="flex items-center gap-3">
                      <input type="checkbox" className="h-5 w-5 accent-accent" checked={s.notifications[k]} onChange={(e) => setS({ ...s, notifications: { ...s.notifications, [k]: e.target.checked } })} />
                      <span>{t(`set.notify.${k}`)}</span>
                    </label>
                  ))}
                  {typeof Notification !== 'undefined' && Notification.permission === 'denied' && <Muted className="text-bad">{t('set.notify.denied')}</Muted>}
                </div>
              </Field>
            </>
          )}
          <Button size="lg" onClick={() => void save()}>{saved ? t('common.saved') : onboarding ? t('onb.start') : t('common.save')}</Button>
        </div>
      </Card>

      {!onboarding && (
        <>
          <AccountCard />
          <Card>
            <h2 className="font-display text-xl">{t('set.data')}</h2>
            <Muted>{t('set.data.hint')}</Muted>
            <div className="mt-3 flex flex-col gap-2">
              <Button variant="secondary" onClick={() => void download()}>{t('set.export')}</Button>
              {confirmWipe ? (
                <div className="flex gap-2">
                  <Button variant="danger" onClick={() => void wipeAll().then(() => location.reload())}>{t('set.wipe.confirm')}</Button>
                  <Button variant="ghost" onClick={() => setConfirmWipe(false)}>{t('common.cancel')}</Button>
                </div>
              ) : (
                <Button variant="danger" onClick={() => setConfirmWipe(true)}>{t('set.wipe')}</Button>
              )}
            </div>
          </Card>
          <Card>
            <h2 className="font-display text-xl">{t('set.demo')}</h2>
            <Muted>
              {t('set.demo.hint')}
              {isClockOverridden() && <strong className="block text-accent">{t('set.demo.active')}</strong>}
            </Muted>
          </Card>
        </>
      )}
    </Page>
  )
}
