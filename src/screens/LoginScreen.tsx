import { Mail } from 'lucide-react'
import { useState } from 'react'
import { Button, Card, Field, Input, Muted, Page } from '../components/ui'
import { useT } from '../i18n'
import { signInWithEmail } from '../sync'

/** Cổng vào app khi Supabase đã cấu hình: không mật khẩu, gửi link qua mail, mở trên cùng trình duyệt. */
export function LoginScreen() {
  const { t } = useT()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function send() {
    const e = email.trim()
    if (!e.includes('@') || busy) return
    setBusy(true)
    setErr('')
    try {
      await signInWithEmail(e)
      setSent(e)
    } catch (x) {
      setErr(x instanceof Error ? x.message : String(x))
    } finally {
      setBusy(false)
    }
  }

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
          </div>
        ) : (
          <form noValidate className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void send() }}>
            <p className="text-ink-2">{t('login.why')}</p>
            <Field label={t('acc.email')}>
              <Input type="email" inputMode="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </Field>
            {err && <p className="text-sm text-bad">{err}</p>}
            <Button type="submit" size="lg" disabled={!email.includes('@') || busy}>{busy ? t('login.sending') : t('acc.sendLink')}</Button>
          </form>
        )}
      </Card>
    </Page>
  )
}
