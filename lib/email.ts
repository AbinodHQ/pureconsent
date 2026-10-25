import { localeForHost, translator, type Locale } from './i18n/shared'
import { appOrigin, token, hashToken } from './auth'
import { saveToken, UserError, type Account } from './store'


export function assertEmailConfigured () {
  if (
    (process.env.RESEND_API_KEY && !process.env.EMAIL_FROM) ||
    (process.env.NODE_ENV === 'production' &&
      (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM))
  )
    throw new UserError(
      'Email delivery is not configured. Please contact support.',
      503
    )
}

const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[
        c
      ]!)
  )

async function deliver (
  email: string,
  subject: string,
  explanation: string,
  label: string,
  url: string,
  expiry: string,
  locale: Locale = 'en'
) {
  const t = translator(locale)
  subject = t(subject)
  explanation = t(explanation)
  label = t(label)
  expiry = t(expiry)
  assertEmailConfigured()
  if (!process.env.RESEND_API_KEY) return { developmentUrl: url }
  const text = `${explanation}\n\n${label}: ${url}\n\n${expiry}\n${t(
    'If you did not request this, you can ignore this email.'
  )}\n${t('PureConsent — privacy choices made clear.')}`
  const html = `<div style="background:#F8FAFC;padding:32px;font-family:Arial,sans-serif;color:#0B0F19;font-size:16px;line-height:1.6"><div style="max-width:560px;margin:auto;background:white;padding:32px;border:1px solid #E2E8F0;border-radius:12px"><strong style="font-size:24px">PureConsent</strong><h1 style="font-size:24px">${escape(
    subject
  )}</h1><p>${escape(
    explanation
  )}</p><p style="margin:28px 0"><a href="${escape(
    url
  )}" style="background:#4F46E5;color:white;padding:14px 22px;border-radius:8px;text-decoration:none">${escape(
    label
  )}</a></p><p>${escape(expiry)}</p><p>${t(
    'If the button does not work, copy this link into your browser:'
  )}</p><p style="overflow-wrap:anywhere">${escape(
    url
  )}</p><p style="color:#475569">If you did not request this, you can ignore this email.</p></div></div>`
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: email,
        subject,
        text,
        html
      }),
      signal: AbortSignal.timeout(15000)
    })
    if (!response.ok) throw new Error('Provider rejected delivery')
  } catch {
    throw new UserError(
      'Email could not be sent. Please request a new email shortly or contact support.',
      503
    )
  }
  return {}
}

export async function sendAction (
  account: Account,
  kind: 'verify' | 'reset',
  request: Request
) {
  assertEmailConfigured()
  const secret = token()
  await saveToken({
    tokenHash: hashToken(secret),
    ownerId: account.id,
    kind,
    expiresAt: new Date(Date.now() + (kind === 'reset' ? 3600000 : 86400000))
  })
  return deliver(
    account.email,
    kind === 'verify'
      ? 'Verify your PureConsent account'
      : 'Reset your PureConsent password',
    kind === 'verify'
      ? 'Confirm your email address to activate your PureConsent workspace.'
      : 'We received a request to reset your PureConsent password.',
    kind === 'verify' ? 'Verify email address' : 'Reset password',
    `${appOrigin(request)}/auth/${kind}?token=${secret}`,
    kind === 'verify'
      ? 'This link expires in 24 hours and can be used once.'
      : 'This link expires in one hour and can be used once. Changing your password signs out existing sessions.',
    localeForHost(new URL(appOrigin(request)).host)
  )
}

export async function sendInvitation (
  email: string,
  workspace: string,
  url: string
) {
  const locale = localeForHost(new URL(url).host)
  if (locale === 'de')
    return deliver(
      email,
      `Einladung zu ${workspace} auf PureConsent`,
      `Du wurdest eingeladen, zugewiesene Websites in ${workspace} zu verwalten. Melde dich mit dieser E-Mail-Adresse an oder erstelle ein Konto und nimm die Einladung an.`,
      'Einladung ansehen',
      url,
      'Diese Einladung läuft nach sieben Tagen ab.',
      'de'
    )
  return deliver(
    email,
    `Invitation to ${workspace} on PureConsent`,
    `You have been invited to manage assigned websites in ${workspace}. Sign in or create an account using this email address, then accept the invitation.`,
    'View invitation',
    url,
    'This invitation expires in seven days.'
  )
}
