import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { JSDOM } from 'jsdom'

const script = readFileSync(
  new URL('../public/consent.js', import.meta.url),
  'utf8'
)
const siteId = randomUUID()
const config = {
  id: siteId,
  name: 'Test website',
  version: 1,
  language: 'en',
  accent: '#245b47',
  privacyUrl: 'https://example.test/privacy',
  analytics: 'Analytics provider description',
  marketing: 'Marketing provider description'
}
async function setup (
  options: {
    saved?: unknown
    unavailable?: boolean
    receiptFailure?: boolean
    storageFailure?: boolean
    preview?: boolean
    configuration?: Record<string, unknown>
  } = {}
) {
  const dom = new JSDOM(
    `<!doctype html><html><body>
    <script type="text/plain" data-consent="analytics">window.analyticsRuns=(window.analyticsRuns||0)+1;</script>
    <script type="text/plain" data-consent="marketing">window.marketingRuns=(window.marketingRuns||0)+1;</script>
    <script type="text/plain" data-consent="unknown">window.unknownRuns=true;</script>
    </body></html>`,
    {
      url: 'https://example.test',
      runScripts: 'dangerously',
      pretendToBeVisual: true
    }
  )
  const win = dom.window
  const requests: Array<{ url: string; body?: string }> = []
  if (options.saved)
    win.localStorage.setItem(
      `pureconsent:${siteId}`,
      JSON.stringify(options.saved)
    )
  if (options.storageFailure)
    Object.defineProperty(win, 'localStorage', {
      get () {
        throw new Error('Denied')
      }
    })
  win.fetch = (async (url: string, init?: RequestInit) => {
    requests.push({ url, body: init?.body as string | undefined })
    if (url.endsWith('/config')) {
      if (options.unavailable) throw new Error('offline')
      return {
        ok: true,
        json: async () => ({ ...config, ...options.configuration })
      }
    }
    return {
      ok: !options.receiptFailure,
      status: options.receiptFailure ? 503 : 201
    }
  }) as unknown as typeof fetch
  const tag = win.document.createElement('script')
  tag.src = 'https://consent.test/consent.js'
  tag.dataset.site = siteId
  if (options.preview) tag.dataset.preview = 'true'
  win.document.body.append(tag)
  Object.defineProperty(win.document, 'currentScript', {
    configurable: true,
    get: () => tag
  })
  win.eval(script)
  await new Promise(resolve => setTimeout(resolve, 30))
  const shadow = () =>
    win.document.getElementById('pureconsent-widget')?.shadowRoot
  const click = async (label: string) => {
    const button = [...(shadow()?.querySelectorAll('button') || [])].find(
      b => b.textContent === label
    )
    assert.ok(button, `Button exists: ${label}`)
    button.click()
    await new Promise(resolve => setTimeout(resolve, 20))
  }
  return { dom, win, requests, shadow, click }
}
test('no optional execution before consent; reject stores minimum choices', async () => {
  const { dom, win, requests, click } = await setup()
  try {
    assert.equal(win.analyticsRuns, undefined)
    assert.equal(win.marketingRuns, undefined)
    await click('Reject optional')
    assert.equal(win.analyticsRuns, undefined)
    assert.equal(win.marketingRuns, undefined)
    const lateScript = win.document.createElement('script')
    lateScript.type = 'text/plain'
    lateScript.dataset.consent = 'marketing'
    lateScript.textContent = 'window.lateMarketingRuns=true'
    win.document.body.append(lateScript)
    await new Promise(resolve => setTimeout(resolve, 20))
    assert.equal(win.lateMarketingRuns, undefined)
    const receipt = JSON.parse(
      requests.find(r => r.url.endsWith('/consent') && r.body)!.body!
    )
    assert.deepEqual(receipt.choices, {
      necessary: true,
      analytics: false,
      marketing: false
    })
    assert.equal(receipt.action, 'reject')
    assert.deepEqual(Object.keys(receipt).sort(), [
      'action',
      'choices',
      'consentId',
      'id',
      'language',
      'version'
    ])
  } finally {
    dom.window.close()
  }
})
test('unsaved category changes cannot activate scripts; save activates only that category once', async () => {
  const { dom, win, shadow, click } = await setup()
  try {
    await click('Choose preferences')
    const input = shadow()!.querySelector<HTMLInputElement>(
      'input[aria-label="Analytics"]'
    )!
    input.click()
    win.document.body.append(win.document.createElement('div'))
    await new Promise(resolve => setTimeout(resolve, 20))
    assert.equal(win.analyticsRuns, undefined)
    await click('Save preferences')
    assert.equal(win.analyticsRuns, 1)
    assert.equal(win.marketingRuns, undefined)
    assert.equal(win.unknownRuns, undefined)
    win.document.body.append(win.document.createElement('div'))
    await new Promise(resolve => setTimeout(resolve, 20))
    assert.equal(win.analyticsRuns, 1)
    await click('Privacy choices')
    assert.ok(shadow()!.textContent!.includes('Withdraw consent'))
  } finally {
    dom.window.close()
  }
})
test('current saved consent restores; expired and old notice versions fail closed', async () => {
  for (const [version, expires, shouldRun] of [
    [1, Date.now() + 100000, true],
    [2, Date.now() + 100000, false],
    [1, Date.now() - 100, false]
  ] as const) {
    const { dom, win, shadow } = await setup({
      saved: {
        version,
        expires,
        consentId: randomUUID(),
        choices: { necessary: true, analytics: true, marketing: false }
      }
    })
    try {
      assert.equal(win.analyticsRuns, shouldRun ? 1 : undefined)
      assert.equal(!!shadow()?.querySelector('[role="dialog"]'), !shouldRun)
    } finally {
      dom.window.close()
    }
  }
})
test('configuration outage leaves scripts inert', async () => {
  const { dom, win } = await setup({ unavailable: true })
  try {
    assert.equal(win.analyticsRuns, undefined)
    assert.equal(win.marketingRuns, undefined)
  } finally {
    dom.window.close()
  }
})
test('failed receipt shows failure, keeps retry payload, and never falsely claims server success', async () => {
  const { dom, win, shadow, click } = await setup({ receiptFailure: true })
  try {
    await click('Reject optional')
    assert.ok(shadow()!.textContent!.includes('could not be sent'))
    const record = JSON.parse(
      win.localStorage.getItem(`pureconsent:${siteId}`)!
    )
    assert.equal(record.pending.action, 'reject')
  } finally {
    dom.window.close()
  }
})
test('unavailable local storage does not crash the banner', async () => {
  const { dom, win, shadow, click } = await setup({ storageFailure: true })
  try {
    await click('Reject optional')
    assert.equal(win.analyticsRuns, undefined)
    assert.ok(shadow()!.textContent!.includes('storage is unavailable'))
  } finally {
    dom.window.close()
  }
})
test('preview choices and withdrawal never send receipts or display a retry action', async () => {
  const { dom, requests, shadow, click } = await setup({ preview: true })
  try {
    await click('Accept all')
    assert.equal(requests.length, 0)
    assert.equal(shadow()!.textContent!.includes('Retry record'), false)
    await click('Privacy choices')
    await click('Withdraw consent')
    assert.equal(requests.length, 0)
  } finally {
    dom.window.close()
  }
})
test('page views are separate from consent, deduplicated in-page, and track explicit SPA navigation', async () => {
  const { dom, win, requests, click } = await setup()
  try {
    assert.equal(requests.filter(r => r.url.endsWith('/impression')).length, 1)
    assert.equal(requests.filter(r => r.url.endsWith('/consent')).length, 0)
    ;(
      win as unknown as { PureConsent: { trackPageView: () => void } }
    ).PureConsent.trackPageView()
    assert.equal(requests.filter(r => r.url.endsWith('/impression')).length, 1)
    win.history.pushState({}, '', '/next-page')
    ;(
      win as unknown as { PureConsent: { trackPageView: () => void } }
    ).PureConsent.trackPageView()
    await new Promise(r => setTimeout(r, 20))
    assert.equal(requests.filter(r => r.url.endsWith('/impression')).length, 2)
    await click('Reject optional')
    assert.equal(requests.filter(r => r.url.endsWith('/impression')).length, 2)
    for (const r of requests.filter(r => r.url.endsWith('/impression')))
      assert.deepEqual(Object.keys(JSON.parse(r.body!)), ['id'])
  } finally {
    dom.window.close()
  }
})
test('French, translated provider text, brand font and white-label render from entitled configuration', async () => {
  const { dom, shadow, click } = await setup({
    configuration: {
      language: 'fr',
      allowedLanguages: ['en', 'de', 'fr'],
      hideBranding: true,
      fontFamily: 'Georgia, serif',
      translations: {
        fr: { analytics: 'Mesure des visites', marketing: 'Publicité adaptée' }
      }
    }
  })
  try {
    assert.ok(shadow()!.textContent!.includes('Votre vie privée'))
    assert.equal(
      shadow()!.textContent!.includes('Consentement par PureConsent'),
      false
    )
    await click('Choisir mes préférences')
    assert.ok(shadow()!.textContent!.includes('Mesure des visites'))
    assert.ok(
      shadow()!.querySelector('style')!.textContent!.includes('Georgia, serif')
    )
  } finally {
    dom.window.close()
  }
})
