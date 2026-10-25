'use client'
import { useTranslation, useLocale } from '@/components/locale-provider'
import { useState, type FormEvent } from 'react'
import { PLANS, features, type Plan, type Interval } from '@/lib/plans'


export type Customer = {
  name: string
  workspace: string
  email: string
  effectivePlan: Plan
  billingInterval?: Interval
  subscriptionStatus?: string
  paidThrough?: number
  cancelAtPeriodEnd?: boolean
}
export function AccountPanel ({
  account,
  usage,
  reload,
  kind
}: {
  account: Customer
  usage: { count: number; month: string }
  reload: () => Promise<void>
  kind: 'Billing' | 'Account'
}) {
  const t = useTranslation()
  const locale = useLocale()
  const [interval, setInterval] = useState<Interval>('month')
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('')
  async function action (path: string, body?: unknown, method = 'POST') {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const r = await fetch(`/api/${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {})
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error)
      if (data.url) {
        location.href = data.url
        return
      }
      if (path === 'account' && method === 'DELETE') {
        location.href = '/'
        return
      }
      if (path === 'account/password') {
        location.href = '/auth/login'
        return
      }
      await reload()
      setMessage('Changes saved.')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  function submit (e: FormEvent<HTMLFormElement>, path: string, method: string) {
    e.preventDefault()
    void action(path, Object.fromEntries(new FormData(e.currentTarget)), method)
  }
  const plan = PLANS[account.effectivePlan]
  return (
    <div className='account-sections'>
      {error && (
        <div role='alert' className='alert error'>
          {t(String(error))}
        </div>
      )}
      {message && (
        <div role='status' className='alert success'>
          {t(String(message))}
        </div>
      )}
      {kind === 'Billing' ? (
        <>
          <section className='panel'>
            <span className='eyebrow'>{t('YOUR SUBSCRIPTION')}</span>
            <h2>
              {t(String(plan.name))}
              {t(' plan')}
            </h2>
            {account.billingInterval && (
              <p>
                {t('Billed ')}
                {account.billingInterval === 'year'
                  ? t('yearly')
                  : t('monthly')}
                {t('. Page-view allowance resets each calendar month.')}
              </p>
            )}
            <p>
              {account.subscriptionStatus &&
              account.subscriptionStatus !== 'none'
                ? `${t('Subscription status')}: ${t(
                    account.subscriptionStatus
                  )}. `
                : ''}
              {account.cancelAtPeriodEnd
                ? t('Cancellation scheduled at the end of your billing period.')
                : ''}
            </p>
            {!!account.paidThrough && (
              <p>
                {t('Current paid access ends ')}
                {new Date(account.paidThrough).toLocaleDateString(locale)}.
              </p>
            )}
            <div className='usage-bar'>
              <span
                style={{
                  width: `${Math.min(100, (usage.count / plan.views) * 100)}%`
                }}
              />
            </div>
            <p>
              <strong>{usage.count.toLocaleString(locale)}</strong>
              {t(' of ')}
              {plan.views.toLocaleString(locale)}
              {t(' included page views · ')}
              {usage.month} UTC
            </p>
            {usage.count > plan.views && (
              <p className='alert'>
                {t(
                  'Your usage is above this plan’s allowance. Consider upgrading. Visitor choices continue working.'
                )}
              </p>
            )}
            <div className='hero-actions'>
              <button
                disabled={busy}
                className='button dark'
                onClick={() => action('billing/portal')}
              >
                {t('Manage billing & invoices')}
              </button>
              <button
                disabled={busy}
                className='button outline'
                onClick={() => action('billing/sync')}
              >
                {t('Refresh subscription')}
              </button>
            </div>
            <p className='muted'>
              {t(
                'Change plans, update payment details, or cancel through the secure billing portal. After checkout, refresh your subscription if your new plan has not appeared yet.'
              )}
            </p>
          </section>
          <div className='segmented billing-toggle'>
            <button
              type='button'
              className={interval === 'month' ? 'selected' : ''}
              onClick={() => setInterval('month')}
            >
              {t('Monthly')}
            </button>
            <button
              type='button'
              className={interval === 'year' ? 'selected' : ''}
              onClick={() => setInterval('year')}
            >
              {t('Yearly')}
            </button>
          </div>
          <div className='pricing-grid'>
            {Object.entries(PLANS).map(([key, p]) => (
              <section className='panel pricing-card' key={key}>
                <h2>{t(String(p.name))}</h2>
                <div className='price'>
                  €{interval === 'year' ? p.annual : p.price}
                  <small>
                    /
                    {interval === 'year' && key !== 'free'
                      ? t('year')
                      : t('month')}
                  </small>
                </div>
                <ul>
                  {features(key as Plan).map(f => (
                    <li key={t(String(f))}>{t(String(f))}</li>
                  ))}
                </ul>
                <button
                  disabled={
                    busy || key === 'free' || key === account.effectivePlan
                  }
                  className='button outline'
                  onClick={() =>
                    action('billing/checkout', { plan: key, interval })
                  }
                >
                  {key === account.effectivePlan
                    ? t('Current plan')
                    : key === 'free'
                    ? t('Included for everyone')
                    : `${t('Choose')} ${t(p.name)}`}
                </button>
              </section>
            ))}
          </div>
          <p className='muted'>
            {t(
              'Prices in EUR before applicable taxes. On downgrade, existing banners keep working; new websites and record retention follow your current plan.'
            )}
          </p>
        </>
      ) : (
        <>
          <form className='panel' onSubmit={e => submit(e, 'account', 'PATCH')}>
            <h2>{t('Workspace profile')}</h2>
            <div className='form-grid'>
              <label>
                {t('Your name')}
                <input
                  name='name'
                  defaultValue={account.name}
                  required
                  minLength={2}
                  maxLength={80}
                />
              </label>
              <label>
                {t('Workspace')}
                <input
                  name='workspace'
                  defaultValue={account.workspace}
                  required
                  minLength={2}
                  maxLength={80}
                />
              </label>
            </div>
            <p>
              {t('Verified email: ')}
              {account.email}
            </p>
            <button disabled={busy} className='button dark'>
              {t('Save profile')}
            </button>
          </form>
          <form
            className='panel'
            onSubmit={e => submit(e, 'account/password', 'POST')}
          >
            <h2>{t('Change password')}</h2>
            <p>{t('Changing your password signs out all active sessions.')}</p>
            <div className='form-grid'>
              <label>
                {t('Current password')}
                <input
                  type='password'
                  name='currentPassword'
                  required
                  autoComplete='current-password'
                  maxLength={128}
                />
              </label>
              <label>
                {t('New password')}
                <input
                  type='password'
                  name='password'
                  required
                  minLength={12}
                  maxLength={128}
                  autoComplete='new-password'
                />
              </label>
            </div>
            <button disabled={busy} className='button dark'>
              {t('Update password')}
            </button>
          </form>
          <section className='panel'>
            <h2>{t('Your data')}</h2>
            <p>
              {t(
                'Download your profile, website settings, and latest 1,000 retained receipts.'
              )}
            </p>
            <a className='button outline' href='/api/account/export'>
              {t('Export account data')}
            </a>
          </section>
          <form
            className='panel'
            onSubmit={e => {
              e.preventDefault()
              if (
                confirm(
                  t(
                    'Permanently delete this account and its websites and receipts? Export your data first. This cannot be undone.'
                  )
                )
              )
                submit(e, 'account', 'DELETE')
            }}
          >
            <h2>{t('Delete account')}</h2>
            <p>
              {t(
                'This permanently removes your workspace and stops all its banners. Active subscriptions must end first.'
              )}
            </p>
            <label>
              {t('Confirm your password')}
              <input
                type='password'
                name='password'
                required
                maxLength={128}
                autoComplete='current-password'
              />
            </label>
            <button disabled={busy} className='button outline'>
              {t('Delete my account')}
            </button>
          </form>
        </>
      )}
    </div>
  )
}
