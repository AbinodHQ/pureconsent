'use client'
import { LanguageSwitcher } from '@/components/language-switcher'
import { useTranslation, useLocale } from '@/components/locale-provider'
import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { Brand } from './brand'


const titles: Record<string, string> = {
  signup: 'Start with a little more trust.',
  login: 'Welcome back.',
  forgot: 'Reset your password.',
  reset: 'Choose a new password.',
  verify: 'Verify your email.',
  resend: 'Resend verification.'
}
export function AuthForm ({ mode }: { mode: string }) {
  const t = useTranslation()
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState(''),
    [dev, setDev] = useState(''),
    [done, setDone] = useState(false)
  async function submit (e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const values = Object.fromEntries(new FormData(e.currentTarget))
      const r = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          terms: values.terms === 'on',
          token: new URLSearchParams(location.search).get('token')
        })
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error)
      if (mode === 'login') {
        const next = new URLSearchParams(location.search).get('next')
        location.href = next?.startsWith('/dashboard?') ? next : '/dashboard'
        return
      }
      setMessage(data.message)
      setDone(['verify', 'reset', 'signup'].includes(mode))
      setDev(data.developmentUrl || '')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className='login-page'>
      <Brand />
      <LanguageSwitcher />
      <form className='login-card' onSubmit={submit}>
        <span className='eyebrow'>{t('YOUR PRIVACY WORKSPACE')}</span>
        <h1>{t(String(titles[mode]))}</h1>
        <p>
          {mode === 'signup'
            ? t('Create your free workspace. No credit card required.')
            : mode === 'verify'
            ? t('Confirm this email address to activate your workspace.')
            : t('Secure access to your websites and consent records.')}
        </p>
        {mode === 'signup' && (
          <>
            <label>
              {t('Your name')}
              <input
                name='name'
                required
                minLength={2}
                maxLength={80}
                autoComplete='name'
              />
            </label>
            <label>
              {t('Workspace name')}
              <input
                name='workspace'
                required
                minLength={2}
                maxLength={80}
                placeholder={t('Your company')}
              />
            </label>
          </>
        )}
        {!['verify', 'reset'].includes(mode) && (
          <label>
            {t('Email')}
            <input
              name='email'
              type='email'
              autoComplete='email'
              required
              maxLength={254}
            />
          </label>
        )}
        {['signup', 'login', 'reset'].includes(mode) && (
          <label>
            {t('Password')}
            <input
              name='password'
              type='password'
              required
              minLength={mode === 'login' ? 1 : 12}
              maxLength={128}
              autoComplete={
                mode === 'login' ? 'current-password' : 'new-password'
              }
            />
            {mode !== 'login' && <small>{t('At least 12 characters.')}</small>}
          </label>
        )}
        {mode === 'signup' && (
          <label className='terms-check'>
            <input type='checkbox' name='terms' required />
            <span>
              {t('I agree to the ')}
              <Link href='/terms'>{t('Terms')}</Link>
              {t(' and acknowledge the ')}
              <Link href='/privacy'>{t('Privacy notice')}</Link>.
            </span>
          </label>
        )}
        {error && (
          <p className='alert error' role='alert'>
            {t(String(error))}
          </p>
        )}
        {message && (
          <p className='alert success' role='status'>
            {t(String(message))}
          </p>
        )}
        {dev && (
          <p className='alert'>
            {t(
              'Email delivery is not connected in this local environment. Use this test link: '
            )}
            <a href={dev}>{t('Open secure link')}</a>
          </p>
        )}
        {!done && (
          <button className='button dark full' disabled={busy}>
            {busy
              ? t('Please wait…')
              : mode === 'login'
              ? t('Sign in')
              : mode === 'signup'
              ? t('Create free account')
              : mode === 'verify'
              ? t('Verify email')
              : t('Continue')}
          </button>
        )}
        {done && (
          <Link
            className='button dark full'
            href={mode === 'signup' ? '/auth/resend' : '/auth/login'}
          >
            {mode === 'signup'
              ? t('Resend verification email')
              : t('Continue to sign in')}
          </Link>
        )}
        <div className='auth-links'>
          <Link href={mode === 'login' ? '/auth/signup' : '/auth/login'}>
            {mode === 'login' ? t('Create an account') : t('Back to sign in')}
          </Link>
          <Link href='/auth/forgot'>{t('Forgot password?')}</Link>
          <Link href='/auth/resend'>{t('Resend verification')}</Link>
        </div>
      </form>
      <Link href='/'>{t('← Back to PureConsent')}</Link>
    </main>
  )
}
