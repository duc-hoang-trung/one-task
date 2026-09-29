import { useEffect, useState } from 'react'
import { BellRing } from 'lucide-react'
import { Button, Card, Muted } from './ui'
import { useT } from '../i18n'
import { currentSubscription, disablePush, enablePush, pushConfigured, pushSupported, type PushResult } from '../sync/push'

/**
 * Bật/tắt nhắc qua push. Chỉ hiện khi đã cấu hình khoá VAPID + Supabase.
 * Phải bật bằng một cú chạm: iOS chỉ cho xin quyền thông báo từ thao tác người dùng, và
 * chỉ cho push khi PWA đã Thêm vào màn hình chính (lúc đó PushManager mới tồn tại).
 */
export function PushCard() {
  const { t } = useT()
  const [on, setOn] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<PushResult | ''>('')

  useEffect(() => { void currentSubscription().then((s) => setOn(!!s)) }, [])

  if (!pushConfigured) return null

  const supported = pushSupported()
  async function toggle() {
    setBusy(true)
    setMsg('')
    if (on) {
      await disablePush()
      setOn(false)
    } else {
      const r = await enablePush()
      setMsg(r === 'on' ? '' : r)
      setOn(r === 'on')
    }
    setBusy(false)
  }

  return (
    <Card>
      <h2 className="font-display flex items-center gap-2 text-xl">
        <BellRing size={18} className={on ? 'text-accent' : 'text-ink-3'} />{t('push.title')}
      </h2>
      <Muted className="mt-1">{t('push.why')}</Muted>
      {!supported ? (
        <Muted className="mt-3 text-ink-2">{t('push.unsupported')}</Muted>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button variant={on ? 'ghost' : 'primary'} onClick={() => void toggle()} disabled={busy || on === null}>
            {on ? t('push.off') : t('push.on')}
          </Button>
          {on && <Muted>{t('push.state.on')}</Muted>}
        </div>
      )}
      {msg === 'denied' && <p className="mt-2 text-sm text-bad">{t('push.denied')}</p>}
      {msg === 'error' && <p className="mt-2 text-sm text-bad">{t('push.error')}</p>}
      {msg === 'unsupported' && <p className="mt-2 text-sm text-bad">{t('push.unsupported')}</p>}
    </Card>
  )
}
