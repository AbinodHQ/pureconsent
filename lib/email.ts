import { appOrigin, token, hashToken } from './auth';
import { saveToken, UserError, type Account } from './store';
export async function sendAction(account: Account, kind: 'verify' | 'reset', request: Request) {
  if (process.env.NODE_ENV === 'production' && (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM)) throw new UserError('Email delivery is not configured. Please contact support.', 503);
  const secret = token();
  await saveToken({ tokenHash: hashToken(secret), ownerId: account.id, kind, expiresAt: new Date(Date.now() + (kind === 'reset' ? 3600000 : 86400000)) });
  const url = `${appOrigin(request)}/auth/${kind}?token=${secret}`;
  if (!process.env.RESEND_API_KEY) return { developmentUrl: url };
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.EMAIL_FROM, to: account.email, subject: kind === 'verify' ? 'Verify your PureConsent account' : 'Reset your PureConsent password', text: `Open this link to ${kind === 'verify' ? 'verify your email' : 'reset your password'}: ${url}\nIf you did not request this, ignore this email.` }), signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new UserError('Email could not be delivered. Please retry shortly.', 503);
  return {};
}
