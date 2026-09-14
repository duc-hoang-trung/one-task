import { Mail } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button, Card, Field, Input, Muted, Page } from '../components/ui'
import { useT } from '../i18n'
import { SignInError, signInWithEmail } from '../sync'

/** Supabase chỉ cho xin link mới mỗi 60 giây cho cùng một email; chặn sẵn ở đây cho đỡ tốn hạn mức. */
const RESEND_COOLDOWN_SEC = 60

/** Cổng vào app khi Supabase đã cấu hình: không mật khẩu, gửi link qua mail, mở trên cùng trình duyệt. */
export function LoginScreen() {
  const { t } = useT()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  /** Đếm ngược cho ĐÚNG địa chỉ vừa gửi; đổi sang email khác thì gửi được ngay. */
  const [wait, setWait] = useState(0)
  const [waitFor, setWaitFor] = useState('')

  useEffect(() => {
    if (wait <= 0) return
    const id = setTimeout(() => setWait((n) => n - 1), 1000)
    return () => clearTimeout(id)
  }, [wait])

  const target = email.trim()
  const cooling = wait > 0 && target.toLowerCase() === waitFor

  async function send() {
    if (!target.includes('@') || busy || cooling) return
    setBusy(true)
    setErr('')
    try {
      await signInWithEmail(target)
      setSent(target)
      setWaitFor(target.toLowerCase())
      setWait(RESEND_COOLDOWN_SEC)
    } catch (x) {
      if (x instanceof SignInError && x.code === 'cooldown') {
        const n = x.retryAfterSec ?? RESEND_COOLDOWN_SEC
        setWaitFor(target.toLowerCase())
        setWait(n)
        setErr(t('login.err.cooldown', { n }))
      } else if (x instanceof SignInError && x.code === 'rate-limit') {
        setErr(t('login.err.rateLimit'))
      } else {
        setErr(x instanceof Error ? x.message : String(x))
      }
    } finally {
      setBusy(false)
    }
  }

  const sendLabel = busy ? t('login.sending') : cooling ? t('login.resendIn', { n: wait }) : t('acc.sendLink')

  return (
    <Page width="narrow" className="justify-center pt-16">
      <div className="mb-2 text-center">
        <p className="font-display text-[40px] leading-none tracking-tight">{t('app.name')}</p>
        <Muted className="mt-2">{t('login.tagline')}</Muted>
      </div>
      <Card>
        {sent ? (
          <div className="flex flex-col gap-3">
            <p className="flex items-start gap-2 text-ink-2"><Mail size={18} className="mt-0.5 shrink-0 text-accent" />{t('login.sent', { email: sent })}</p>
            <Muted>{t('login.sentHint')}</Muted>
            <Button variant="ghost" size="sm" className="self-start" onClick={() => setSent('')}>{t('login.resend')}</Button>
            {wait > 0 && <Muted className="text-[13px]">{t('login.resendIn', { n: wait })}</Muted>}
          </div>
        ) : (
          <form noValidate className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void send() }}>
            <p className="text-ink-2">{t('login.why')}</p>
            <Field label={t('acc.email')}>
              <Input type="email" inputMode="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </Field>
            {err && <p className="text-sm text-bad">{err}</p>}
            <Button type="submit" size="lg" disabled={!target.includes('@') || busy || cooling}>{sendLabel}</Button>
          </form>
        )}
      </Card>
    </Page>
  )
}
