import test from 'node:test'
import assert from 'node:assert/strict'
import { appOrigin, sameOrigin, sessionCookieDomain } from '../lib/auth'
import { localeForHost, translator } from '../lib/i18n/shared'
import { proxy } from '../proxy'
import { NextRequest } from 'next/server'

test('locale hosts, translated content and private session migration are constrained to the two application hosts', () => {
  const prior = { ...process.env }
  try {
    Object.assign(process.env, {
      NODE_ENV: 'production',
      APP_ORIGIN: 'https://pureconsent.de'
    })
    for (const [host, locale] of [
      ['pureconsent.de', 'de'],
      ['com.pureconsent.de', 'en']
    ] as const) {
      const url = `https://${host}/dashboard?workspace=example`
      assert.equal(localeForHost(host), locale)
      assert.equal(appOrigin(new Request(url)), `https://${host}`)
      assert.equal(
        sameOrigin(
          new Request(url, { headers: { origin: `https://${host}` } })
        ),
        true
      )
      assert.equal(
        sameOrigin(
          new Request(url, {
            headers: { origin: 'https://untrusted.pureconsent.de' }
          })
        ),
        false
      )
      assert.equal(sessionCookieDomain(new Request(url)), '.pureconsent.de')
      const response = proxy(
        new NextRequest(url, {
          headers: { cookie: 'pc_session=' + 'a'.repeat(64) }
        })
      )
      const cookie = response.cookies.get('pc_session_v2')!
      assert.equal(cookie.domain, '.pureconsent.de')
      assert.equal(cookie.httpOnly, true)
      assert.equal(cookie.secure, true)
      assert.equal(
        response.headers.get('x-middleware-request-x-pc-pathname'),
        '/dashboard'
      )
    }
    assert.equal(
      sessionCookieDomain(new Request('https://preview.vercel.app')),
      undefined
    )
    assert.equal(
      proxy(
        new NextRequest('https://preview.vercel.app', {
          headers: { cookie: 'pc_session=' + 'a'.repeat(64) }
        })
      ).cookies.get('pc_session_v2'),
      undefined
    )
    assert.equal(
      appOrigin(new Request('https://evil.test')),
      'https://pureconsent.de'
    )
    assert.equal(translator('de')(' Sign in '), ' Anmelden ')
    assert.equal(translator('en')('Sign in'), 'Sign in')
    assert.equal(
      translator('de')('Untranslated customer name'),
      'Untranslated customer name'
    )
  } finally {
    for (const key of Object.keys(process.env))
      if (!(key in prior)) delete process.env[key]
    Object.assign(process.env, prior)
  }
})
