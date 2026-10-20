import { createHmac, timingSafeEqual } from 'node:crypto'
export const cookieName = 'pc_operator'
export function authConfigured () {
  return (
    (process.env.ADMIN_PASSWORD?.length || 0) >= 16 &&
    (process.env.SESSION_SECRET?.length || 0) >= 32
  )
}
function equal (a: string, b: string) {
  const left = Buffer.from(a),
    right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}
export function checkPassword (value: string) {
  return authConfigured() && equal(value, process.env.ADMIN_PASSWORD!)
}
function sign (value: string) {
  return createHmac('sha256', process.env.SESSION_SECRET!)
    .update(value)
    .digest('hex')
}
export function issueSession () {
  const expires = String(Date.now() + 8 * 60 * 60 * 1000)
  return `${expires}.${sign(expires)}`
}
export function validSession (token?: string) {
  if (!authConfigured() || !token) return false
  const [expires, signature, extra] = token.split('.')
  return (
    !extra &&
    /^\d+$/.test(expires) &&
    Number(expires) > Date.now() &&
    Number(expires) <= Date.now() + 8 * 60 * 60 * 1000 &&
    !!signature &&
    equal(signature, sign(expires))
  )
}
export function localOperator () {
  return (
    process.env.NODE_ENV !== 'production' &&
    !process.env.ADMIN_PASSWORD &&
    !process.env.SESSION_SECRET
  )
}
export function sameOrigin (request: Request) {
  if (process.env.NODE_ENV !== 'production' && !process.env.APP_ORIGIN) {
    try {
      const origin = new URL(request.headers.get('origin') || '')
      return ['localhost', '127.0.0.1'].includes(origin.hostname) &&
        origin.host === request.headers.get('host')
    } catch { return false }
  }
  const expected = process.env.APP_ORIGIN || new URL(request.url).origin
  return request.headers.get('origin') === expected
}
const buckets = new Map<string, { count: number; until: number }>()
export function rateLimit (key: string, max: number, windowMs = 60_000) {
  const now = Date.now()
  if (buckets.size > 10000)
    for (const [k, v] of buckets) if (v.until < now) buckets.delete(k)
  const entry = buckets.get(key)
  if (!entry || entry.until < now) {
    if (buckets.size >= 10000) return false
    buckets.set(key, { count: 1, until: now + windowMs })
    return true
  }
  return ++entry.count <= max
}
