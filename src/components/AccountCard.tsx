import { useState } from 'react'
import { Cloud, CloudOff, LogOut, RefreshCw } from 'lucide-react'
import { useT } from '../i18n'
import { signInWithEmail, signOut, syncNow, useSync } from '../sync'
import { Button, Card, Field, Input, Muted } from './ui'

const pad = (n: number) => String(n).padStart(2, '0')
const hm = (ms: number) => { const d = new Date(ms); return `${pad(d.getHours())}:${pad(d.getMinutes())}` }

/** Mục "Tài khoản & đồng bộ" trong Cài đặt. */
export function AccountCard() {
  const { t } = useT()
  const s = useSync()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState('')

  async function send() {
    setErr('')
    try {
      await signInWithEmail(email.trim())
      setSent(true)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <Card>
      <h2 className="font-display flex items-center gap-2 text-xl">
        {s.status === 'off' || s.status === 'signed-out' ? <CloudOff size={18} className="text-ink-3" /> : <Cloud size={18} className="text-accent" />}
        {t('acc.title')}
      </h2>

      {s.status === 'off' ? (
        <Muted className="mt-1">{t('acc.off')}</Muted>
      ) : s.status === 'signed-out' ? (
        <div className="mt-3 flex flex-col gap-3">
          <Muted>{t('acc.why')}</Muted>
          {sent ? (
            <p className="rounded-xl bg-accent-soft/70 p-3 text-ink-2">{t('acc.sent', { email })}</p>
          ) : (
            <>
              <Field label={t('acc.email')}>
                <Input type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </Field>
              <Button disabled={!email.includes('@')} onClick={() => void send()}>{t('acc.sendLink')}</Button>
              {err && <p className="text-sm text-bad">{err}</p>}
            </>
          )}
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          <p className="text-ink-2">{t('acc.signedInAs')} <strong className="text-ink">{s.email}</strong></p>
          <Muted>
            {s.status === 'syncing' && t('acc.status.syncing')}
            {s.status === 'offline' && t('acc.status.offline', { n: s.pending })}
            {s.status === 'error' && `${t('acc.status.error')} ${s.error ?? ''}`}
            {s.status === 'idle' && (s.lastSyncAt ? t('acc.lastSync', { t: hm(s.lastSyncAt) }) : '—')}
            {s.pending > 0 && s.status !== 'offline' && ` · ${t('acc.pending', { n: s.pending })}`}
          </Muted>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => void syncNow()} disabled={s.status === 'syncing'}>
              <RefreshCw size={14} className={s.status === 'syncing' ? 'animate-spin' : ''} />{t('acc.syncNow')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void signOut()}><LogOut size={14} />{t('acc.signOut')}</Button>
          </div>
        </div>
      )}
    </Card>
  )
}
