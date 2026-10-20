import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { ZodError } from 'zod'
import {
  consentInput,
  csv,
  OWNER,
  originAllowed,
  publicSite,
  siteInput
} from '@/lib/domain'
import {
  createSite,
  getSite,
  listReceipts,
  listSites,
  saveReceipt,
  storageMode,
  updateSite
} from '@/lib/store'
import {
  checkPassword,
  cookieName,
  issueSession,
  localOperator,
  rateLimit,
  sameOrigin,
  validSession
} from '@/lib/auth'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const json = (
  value: unknown,
  status = 200,
  headers: Record<string, string> = {}
) =>
  NextResponse.json(value, {
    status,
    headers: { 'Cache-Control': 'no-store', ...headers }
  })
async function body (request: Request) {
  if (!request.headers.get('content-type')?.includes('application/json'))
    throw new Error('JSON required.')
  const reader = request.body?.getReader()
  if (!reader) throw new Error('Request body required.')
  const chunks: Uint8Array[] = []
  let length = 0
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    length += value.length
    if (length > 8192) {
      await reader.cancel()
      throw new Error('Request body too large.')
    }
    chunks.push(value)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}
async function handler (
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params
  const method = request.method
  try {
    // Public endpoints require an exact configured website origin. No wildcard CORS.
    if (path[0] === 'public' && path.length === 3) {
      const site = await getSite(path[1])
      let callerOrigin = request.headers.get('origin')
      // Browsers may omit Origin on a same-origin GET; use its Referer for config only.
      if (!callerOrigin && method === 'GET' && path[2] === 'config') {
        try { callerOrigin = new URL(request.headers.get('referer') || '').origin }
        catch { callerOrigin = null }
      }
      if (!site || !originAllowed(site, callerOrigin))
        return json({ error: 'Origin not allowed.' }, 403)
      const headers = {
        'Access-Control-Allow-Origin': site.origin,
        Vary: 'Origin',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
      if (method === 'OPTIONS')
        return new NextResponse(null, { status: 204, headers })
      if (path[2] === 'config' && method === 'GET')
        return json(publicSite(site), 200, headers)
      if (path[2] === 'consent' && method === 'POST') {
        if (!rateLimit(`consent:${site.id}`, 300))
          return json({ error: 'Please retry shortly.' }, 429, headers)
        let input
        try {
          input = consentInput.parse(await body(request))
        } catch {
          return json({ error: 'Invalid consent record.' }, 400, headers)
        }
        if (input.version !== site.version)
          return json(
            { error: 'Notice changed. Reload the page before choosing.' },
            409,
            headers
          )
        await saveReceipt({
          ...input,
          siteId: site.id,
          ownerId: OWNER,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + site.retentionDays * 86400000),
          notice: {
            name: site.name,
            privacyUrl: site.privacyUrl,
            analytics: site.analytics,
            marketing: site.marketing,
            version: site.version
          }
        })
        return json({ id: input.id, saved: true }, 201, headers)
      }
      return json({ error: 'Not found.' }, 404, headers)
    }
    if (path.join('/') === 'auth/login' && method === 'POST') {
      if (!sameOrigin(request))
        return json({ error: 'Origin not allowed.' }, 403)
      // One operator for this MVP; global bucket avoids trusting spoofable proxy headers.
      if (!rateLimit('login', 8, 15 * 60_000))
        return json(
          { error: 'Too many attempts. Try again in 15 minutes.' },
          429
        )
      const input = await body(request)
      if (typeof input.password !== 'string' || !checkPassword(input.password))
        return json(
          { error: 'Invalid password or authentication is not configured.' },
          401
        )
      const response = json({ ok: true })
      response.cookies.set(cookieName, issueSession(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 28800
      })
      return response
    }
    if (
      !localOperator() &&
      !validSession(request.cookies.get(cookieName)?.value)
    )
      return json({ error: 'Sign in to continue.' }, 401)
    if (!['GET', 'HEAD'].includes(method) && !sameOrigin(request))
      return json({ error: 'Origin not allowed.' }, 403)
    if (path.join('/') === 'auth/logout' && method === 'POST') {
      const response = json({ ok: true })
      response.cookies.delete(cookieName)
      return response
    }
    if (path[0] === 'overview' && method === 'GET') {
      const [sites, receipts] = await Promise.all([listSites(), listReceipts()])
      return json({
        sites,
        receipts,
        storage: storageMode(),
        local: localOperator()
      })
    }
    if (path[0] === 'sites' && path.length === 1 && method === 'POST') {
      return json(await createSite(siteInput.parse(await body(request))), 201)
    }
    if (path[0] === 'sites' && path.length === 2 && method === 'PATCH') {
      const site = await updateSite(
        path[1],
        siteInput.parse(await body(request))
      )
      return site ? json(site) : json({ error: 'Website not found.' }, 404)
    }
    if (path[0] === 'receipts' && method === 'GET') {
      const rows = await listReceipts(
        request.nextUrl.searchParams.get('siteId') || undefined
      )
      if (request.nextUrl.searchParams.get('format') === 'csv')
        return new NextResponse(csv(rows), {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition':
              'attachment; filename="pureconsent-records.csv"',
            'Cache-Control': 'no-store'
          }
        })
      return json(rows)
    }
    return json({ error: 'Not found.' }, 404)
  } catch (error) {
    if (error instanceof ZodError)
      return json(
        {
          error: error.issues
            .map(i => `${i.path.join('.')}: ${i.message}`)
            .join('; ')
        },
        400
      )
    if (error instanceof SyntaxError)
      return json({ error: 'Invalid JSON.' }, 400)
    const message = error instanceof Error ? error.message : ''
    if (
      [
        'This origin is already registered.',
        'JSON required.',
        'Request body required.',
        'Request body too large.'
      ].includes(message)
    )
      return json({ error: message }, 400)
    if ((error as { code?: number }).code === 11000)
      return json({ error: 'This origin is already registered.' }, 409)
    const reference = randomUUID()
    // Avoid logging MongoDB connection strings, raw input, or visitor information.
    console.error(
      `PureConsent request ${reference} failed (${
        error instanceof Error ? error.name : 'unknown'
      }).`
    )
    return json(
      {
        error: `Storage unavailable. Check your server configuration. Reference: ${reference}`
      },
      503
    )
  }
}
export { handler as GET, handler as POST, handler as PATCH, handler as OPTIONS }
