'use client'
import { useTranslation, useLocale } from '@/components/locale-provider'

import { useEffect, useState, type FormEvent } from 'react'
import type { Site } from '@/lib/domain'
type Member = { id: string; email: string; siteIds: string[]; status: string }

export function ClientsPanel({
  sites,
  agency
}: {
  sites: Site[]
  agency: boolean
}) {
  const t = useTranslation()
  const locale = useLocale()
  const [members, setMembers] = useState<Member[]>([]),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [dev, setDev] = useState(''),
    [busy, setBusy] = useState(false)
  async function load () {
    const r = await fetch('/api/members')
    const data = await r.json()
    if (!r.ok) throw new Error(data.error)
    setMembers(data)
  }
  useEffect(() => {
    load().catch(e => setError(e.message))
  }, [])
  async function invite (e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget,
      values = new FormData(form)
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const r = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: values.get('email'),
          siteIds: values.getAll('siteIds')
        })
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error)
      setMessage(
        'Invitation created. Your client must sign in with the invited email and accept it.'
      )
      setDev(data.developmentUrl || '')
      form.reset()
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  async function revoke (id: string) {
    setBusy(true)
    setError('')
    try {
      const r = await fetch(`/api/members/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error)
      await load()
      setMessage('Access revoked.')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className='panel client-panel'>
      <span className='eyebrow'>{t('CLIENT ACCESS')}</span>
      <h2>{t('Five seats. The right access.')}</h2>
      <p>
        {t(
          'Clients can edit banner settings, verify installation, and export records for assigned domains. Billing, account settings, adding websites, and invitations stay with you. Revoke and re-invite to change assignments.'
        )}
      </p>
      {!agency && (
        <div className='alert'>
          {t(
            'Client access requires Agency / Studio. Existing memberships are suspended while your plan is inactive; you can still revoke them.'
          )}
        </div>
      )}
      {error && (
        <p role='alert' className='alert error'>
          {t(String(error))}
        </p>
      )}
      {message && (
        <p role='status' className='alert success'>
          {t(String(message))}
        </p>
      )}
      {dev && (
        <p>
          {t('Development invitation: ')}
          <a href={dev}>{t('Open invitation')}</a>
        </p>
      )}
      <h3>
        {members.length}
        {t(' of 5 seats in use')}
      </h3>
      <div className='member-list'>
        {members.map(m => (
          <div className='member-row' key={m.id}>
            <div>
              <strong>{m.email}</strong>
              <p>
                {t(String(m.status))} ·{' '}
                {m.siteIds
                  .map(
                    id =>
                      sites.find(s => s.id === id)?.name || 'Removed website'
                  )
                  .join(', ')}
              </p>
            </div>
            <button
              className='button outline'
              disabled={busy}
              onClick={() => revoke(m.id)}
            >
              {t('Revoke access')}
            </button>
          </div>
        ))}
      </div>
      <form onSubmit={invite}>
        <h3>{t('Invite a client')}</h3>
        <label>
          {t('Client email')}
          <input type='email' name='email' required maxLength={254} />
        </label>
        <fieldset className='site-checks'>
          <legend>{t('Assigned domains')}</legend>
          {sites.map(s => (
            <label key={s.id}>
              <input type='checkbox' name='siteIds' value={s.id} />
              {s.name} · {s.origin}
            </label>
          ))}
        </fieldset>
        <button
          className='button dark'
          disabled={busy || !agency || members.length >= 5 || !sites.length}
        >
          {busy ? t('Sending…') : t('Send invitation')}
        </button>
        <p className='muted'>
          {t(
            'Invitations expire after seven days and reserve a seat until accepted, revoked, or expired.'
          )}
        </p>
      </form>
    </section>
  )
}
