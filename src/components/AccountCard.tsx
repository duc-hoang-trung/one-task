import { useState } from 'react'
import { Cloud, CloudOff, LogOut, RefreshCw } from 'lucide-react'
import { useT } from '../i18n'
import { signOut, syncNow, useSync } from '../sync'
import { Button, Card, Muted } from './ui'

const pad = (n: number) => String(n).padStart(2, '0')
const hm = (ms: number) => { const d = new Date(ms); return `${pad(d.getHours())}:${pad(d.getMinutes())}` }

/** Mục "Tài khoản & đồng bộ" trong Cài đặt. Đăng nhập nằm ở cổng vào app, ở đây chỉ còn trạng thái và đăng xuất. */
export function AccountCard() {
  const { t } = useT()
  const s = useSync()
  const [confirm, setConfirm] = useState(false)
  const [err, setErr] = useState('')

  async function out() {
    setErr('')
    try {
      await signOut()
    } catch (e) {
      setErr(e instanceof Error && e.message === 'pending' ? t('acc.signOut.pending', { n: s.pending }) : String(e))
      setConfirm(false)
    }
  }

  return (
    <Card>
      <h2 className="font-display flex items-center gap-2 text-xl">
        {s.status === 'off' || s.status === 'signed-out' || s.status === 'loading' ? <CloudOff size={18} className="text-ink-3" /> : <Cloud size={18} className="text-accent" />}
        {t('acc.title')}
      </h2>

      {s.status === 'off' || s.status === 'signed-out' || s.status === 'loading' ? (
        <Muted className="mt-1">{t('acc.off')}</Muted>
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
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void syncNow()} disabled={s.status === 'syncing'}>
              <RefreshCw size={16} className={s.status === 'syncing' ? 'animate-spin' : ''} />{t('acc.syncNow')}
            </Button>
            {confirm ? (
              <>
                <Button variant="danger" onClick={() => void out()}>{t('acc.signOut.confirm')}</Button>
                <Button variant="ghost" onClick={() => setConfirm(false)}>{t('common.cancel')}</Button>
              </>
            ) : (
              <Button variant="ghost" onClick={() => setConfirm(true)}><LogOut size={16} />{t('acc.signOut')}</Button>
            )}
          </div>
          {confirm && <Muted>{t('acc.signOut.hint')}</Muted>}
          {err && <p className="text-sm text-bad">{err}</p>}
        </div>
      )}
    </Card>
  )
}
