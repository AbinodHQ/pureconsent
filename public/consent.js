/* PureConsent v0.1 — dependency-free, explicitly tagged script activation. */
;(() => {
  'use strict'
  const tag = document.currentScript
  if (!tag || window.PureConsent) return
  const api = new URL(tag.src).origin
  const siteId = tag.dataset.site
  const preview = tag.dataset.preview === 'true'
  if (!siteId && !preview) return
  const key = `pureconsent:${siteId || 'preview'}`
  const empty = () => ({ necessary: true, analytics: false, marketing: false })
  let config, host, root, record, pending, previousFocus
  let choices = empty(),
    expanded = false,
    visible = true,
    busy = false
  const activated = new Set()
  const t = {
    en: {
      title: 'Your privacy. Your choice.',
      body: 'We use necessary storage to remember your choice. Optional services stay off until you allow them.',
      accept: 'Accept all',
      reject: 'Reject optional',
      settings: 'Choose preferences',
      save: 'Save preferences',
      necessary: 'Necessary',
      always: 'Always on',
      necessaryBody: 'Remembers your privacy preferences on this website.',
      analytics: 'Analytics',
      marketing: 'Marketing',
      privacy: 'Privacy notice',
      reopen: 'Privacy choices',
      withdraw: 'Withdraw consent',
      close: 'Close preferences',
      saved: 'Your choice is saved on this device.',
      failed:
        'Your choice applies here, but the consent record could not be sent.',
      retry: 'Retry record',
      changed: 'The notice has changed. Reload this page to review it.',
      memory:
        'Browser storage is unavailable. Your choice lasts for this page only.',
      demo: 'Interactive preview · no records are sent',
      powered: 'Consent by PureConsent'
    },
    de: {
      title: 'Ihre Privatsphäre. Ihre Wahl.',
      body: 'Wir speichern Ihre Auswahl. Optionale Dienste bleiben deaktiviert, bis Sie diese erlauben.',
      accept: 'Alle akzeptieren',
      reject: 'Optionale ablehnen',
      settings: 'Auswahl anpassen',
      save: 'Auswahl speichern',
      necessary: 'Notwendig',
      always: 'Immer aktiv',
      necessaryBody:
        'Speichert Ihre Datenschutzeinstellungen für diese Website.',
      analytics: 'Analyse',
      marketing: 'Marketing',
      privacy: 'Datenschutzhinweise',
      reopen: 'Datenschutzauswahl',
      withdraw: 'Einwilligung widerrufen',
      close: 'Einstellungen schließen',
      saved: 'Ihre Auswahl wurde auf diesem Gerät gespeichert.',
      failed:
        'Ihre Auswahl gilt hier, aber der Nachweis konnte nicht gesendet werden.',
      retry: 'Erneut senden',
      changed: 'Die Hinweise wurden geändert. Bitte laden Sie diese Seite neu.',
      memory:
        'Browserspeicher ist nicht verfügbar. Ihre Auswahl gilt nur auf dieser Seite.',
      demo: 'Interaktive Vorschau · keine Nachweise werden gesendet',
      powered: 'Consent by PureConsent'
    }
  }
  let language = 'en',
    words = t.en,
    status = '',
    storageAvailable = true
  const uuid = () => crypto.randomUUID()
  function read () {
    try {
      return JSON.parse(localStorage.getItem(key))
    } catch {
      storageAvailable = false
      return null
    }
  }
  function persist () {
    if (preview) return
    try {
      localStorage.setItem(key, JSON.stringify(record))
    } catch {
      storageAvailable = false
    }
  }
  function valid (value) {
    return (
      value &&
      value.version === config.version &&
      value.expires > Date.now() &&
      value.expires <= Date.now() + 181 * 86400000 &&
      typeof value.consentId === 'string' &&
      value.choices?.necessary === true &&
      typeof value.choices.analytics === 'boolean' &&
      typeof value.choices.marketing === 'boolean'
    )
  }
  function emit () {
    window.dispatchEvent(
      new CustomEvent('pureconsent:change', { detail: { ...choices } })
    )
  }
  function activate () {
    if (!document?.documentElement) return
    document
      .querySelectorAll('script[type="text/plain"][data-consent]')
      .forEach(node => {
        const category = node.dataset.consent
        if (
          !['analytics', 'marketing'].includes(category) ||
          !record?.choices[category] ||
          activated.has(node)
        )
          return
        activated.add(node)
        const script = document.createElement('script')
        for (const attribute of node.attributes) {
          if (
            !['type', 'src', 'data-src', 'data-consent'].includes(
              attribute.name
            )
          )
            script.setAttribute(attribute.name, attribute.value)
        }
        script.async = false
        if (node.dataset.src) script.src = node.dataset.src
        else script.textContent = node.textContent
        node.after(script)
      })
  }
  function element (name, text, className) {
    const node = document.createElement(name)
    if (text) node.textContent = text
    if (className) node.className = className
    return node
  }
  function button (text, click, className) {
    const node = element('button', text, className)
    node.type = 'button'
    node.onclick = click
    return node
  }
  function toggle (category, description, fixed = false) {
    const label = element('label', '', 'category')
    const copy = element('span')
    copy.append(
      element('strong', words[category]),
      element('small', description)
    )
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.checked = choices[category]
    input.disabled = fixed
    input.setAttribute('aria-label', words[category])
    input.onchange = () => {
      choices[category] = input.checked
    }
    label.append(copy, input)
    if (fixed) input.title = words.always
    return label
  }
  function render (focus = false) {
    if (!root) return
    root.replaceChildren()
    const style = element('style')
    style.textContent = `
      :host{all:initial;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#0B0F19;line-height:1.5}
      *{box-sizing:border-box}button,a,input{font:inherit}button,a{touch-action:manipulation}
      button{cursor:pointer;border:1px solid #cbd5e1;background:#fff;color:#0B0F19;padding:11px 14px;border-radius:7px;font-weight:600}
      button:hover{background:#f1f5f9}button:focus-visible,a:focus-visible,input:focus-visible{outline:3px solid #5787c4;outline-offset:3px}
      .panel{position:fixed;z-index:2147483647;bottom:24px;left:24px;width:460px;max-width:calc(100vw - 32px);max-height:calc(100dvh - 32px);overflow:auto;background:#fff;border:1px solid #e2e8f0;border-top:4px solid ${config.accent};border-radius:12px;padding:24px;box-shadow:0 12px 60px #18322630}
      .eyebrow{font-size:14px;text-transform:uppercase;letter-spacing:1.8px;color:#475569;margin-bottom:12px}
      h2{font-size:24px;letter-spacing:-.6px;line-height:1.2;margin:0 0 12px}p{font-size:15px;color:#475569;margin:0 0 18px}
      .actions{display:flex;gap:8px}.actions button{flex:1;background:#0B0F19;color:#fff;border-color:#0B0F19;font-size:14px}.actions button:hover{background:#1e293b}
      .preferences{width:100%;margin-top:8px;font-size:14px}.footer{display:flex;justify-content:space-between;gap:12px;margin-top:17px;font-size:14px;color:#475569}.footer a{color:inherit}
      .reopen{position:fixed;z-index:2147483646;bottom:18px;left:18px;box-shadow:0 3px 18px #18322620;font-size:14px}
      .category{display:flex;align-items:center;gap:14px;padding:13px 0;border-top:1px solid #e2e8f0}.category span{flex:1}.category strong{font-size:15px}.category small{display:block;color:#475569;font-size:14px;margin-top:4px}.category input{width:20px;height:20px;accent-color:#0B0F19}
      .status{position:fixed;z-index:2147483647;bottom:70px;left:18px;max-width:calc(100vw - 36px);width:400px;background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:14px;font-size:14px;box-shadow:0 4px 20px #18322615}.status button{padding:5px 9px;margin:6px 6px 0 0;font-size:14px}
      @media(max-width:480px){.panel{left:16px;bottom:16px;padding:20px}.actions{flex-wrap:wrap}.actions button{min-width:120px}}
      @media(prefers-reduced-motion:reduce){*{scroll-behavior:auto}}`
    root.append(style)
    if (!visible) {
      root.append(button(words.reopen, () => open(), 'reopen'))
      if (status) {
        const notice = element('div', status, 'status')
        notice.setAttribute('role', 'status')
        if (pending) notice.append(button(words.retry, () => send()))
        notice.append(
          button('×', () => {
            status = ''
            render()
          })
        )
        notice.lastChild.setAttribute('aria-label', words.close)
        root.append(notice)
      }
      return
    }
    const panel = element('section', '', 'panel')
    panel.setAttribute('role', 'dialog')
    panel.setAttribute('aria-labelledby', 'pc-title')
    panel.lang = language
    const title = element('h2', words.title)
    title.id = 'pc-title'
    title.tabIndex = -1
    panel.append(
      element('div', preview ? words.demo : config.name, 'eyebrow'),
      title,
      element('p', words.body)
    )
    if (expanded) {
      panel.append(
        toggle('necessary', words.necessaryBody, true),
        toggle('analytics', config.analytics),
        toggle('marketing', config.marketing)
      )
    }
    const actions = element('div', '', 'actions')
    actions.append(
      button(words.reject, () => choose('reject', empty())),
      button(words.accept, () =>
        choose('accept', { necessary: true, analytics: true, marketing: true })
      )
    )
    panel.append(actions)
    panel.append(
      button(
        expanded ? words.save : words.settings,
        () => {
          if (expanded) choose('custom', choices)
          else {
            expanded = true
            render(true)
          }
        },
        'preferences'
      )
    )
    if (record)
      panel.append(
        button(words.withdraw, () => choose('withdraw', empty()), 'preferences')
      )
    if (record)
      panel.append(
        button(
          words.close,
          () => {
            choices = { ...record.choices }
            visible = false
            render()
            previousFocus?.focus()
          },
          'preferences'
        )
      )
    const footer = element('div', '', 'footer')
    const privacy = element('a', words.privacy)
    privacy.href = config.privacyUrl
    privacy.target = '_blank'
    privacy.rel = 'noopener noreferrer'
    footer.append(privacy, element('span', words.powered))
    panel.append(footer)
    root.append(panel)
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape' && record) {
        choices = { ...record.choices }
        visible = false
        render()
        previousFocus?.focus()
      }
    })
    if (focus) title.focus()
  }
  async function send () {
    if (preview || !pending || busy) return
    busy = true
    try {
      const response = await fetch(`${api}/api/public/${siteId}/consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        body: JSON.stringify(pending),
        signal: AbortSignal.timeout(8000),
        keepalive: true
      })
      if (!response.ok)
        throw new Error(response.status === 409 ? 'changed' : 'failed')
      pending = null
      record.pending = null
      persist()
      status = storageAvailable ? words.saved : words.memory
    } catch (error) {
      status = error.message === 'changed' ? words.changed : words.failed
    } finally {
      busy = false
      render()
    }
  }
  async function choose (action, selected) {
    if (busy) return
    const before = record?.choices || empty()
    choices = { ...selected }
    const revoked =
      (before.analytics && !choices.analytics) ||
      (before.marketing && !choices.marketing)
    pending = {
      id: uuid(),
      consentId: record?.consentId || uuid(),
      version: config.version,
      language,
      action,
      choices: { ...choices }
    }
    record = {
      consentId: pending.consentId,
      version: config.version,
      choices: { ...choices },
      expires: Date.now() + 180 * 86400000,
      pending
    }
    if (preview) { pending = null; record.pending = null }
    persist()
    visible = false
    expanded = false
    status = preview ? words.demo : words.saved
    emit()
    activate()
    render()
    previousFocus?.focus()
    if (!preview) await send()
    // Reload stops already running scripts. Publishers must also implement vendor-specific cleanup.
    if (revoked && !preview) {
      if (storageAvailable) location.reload()
      else {
        // Reload without persisted refusal could re-enable old state. Keep the page and emit withdrawal instead.
        status = words.memory
        render()
      }
    }
  }
  function open () {
    previousFocus = document.activeElement
    choices = record ? { ...record.choices } : empty()
    visible = true
    expanded = true
    render(true)
  }
  window.PureConsent = {
    open,
    getConsent: () => (record ? { ...record.choices } : empty()),
    withdraw: () => (config ? choose('withdraw', empty()) : undefined)
  }
  async function start () {
    if (preview) {
      const query = new URLSearchParams(location.search)
      config = {
        name: query.get('name') || 'Your website',
        privacyUrl: '/privacy',
        version: 1,
        language: query.get('language') || 'en',
        accent: query.get('accent') || '#4F46E5',
        analytics:
          query.get('analytics') ||
          'Understand visits and improve this website.',
        marketing:
          query.get('marketing') ||
          'Show relevant advertising and measure campaigns.'
      }
      if (!/^#[0-9a-fA-F]{6}$/.test(config.accent)) config.accent = '#4F46E5'
    } else {
      const response = await fetch(`${api}/api/public/${siteId}/config`, {
        credentials: 'omit',
        signal: AbortSignal.timeout(8000)
      })
      if (!response.ok) throw new Error('Configuration unavailable')
      config = await response.json()
    }
    language =
      config.language === 'auto'
        ? navigator.language.toLowerCase().startsWith('de')
          ? 'de'
          : 'en'
        : config.language
    if (!t[language]) language = 'en'
    words = t[language]
    const saved = preview ? null : read()
    if (valid(saved)) {
      record = saved
      choices = { ...saved.choices }
      visible = false
      pending = saved.pending
    }
    host = document.createElement('div')
    host.id = 'pureconsent-widget'
    root = host.attachShadow({ mode: 'open' })
    document.body.append(host)
    emit()
    render()
    activate()
    new MutationObserver(() => activate()).observe(document.documentElement, {
      childList: true,
      subtree: true
    })
    if (pending) await send()
  }
  const begin = () =>
    start().catch(() => {
      // Fail closed: text/plain scripts remain inert even if the service is unavailable.
      console.warn(
        'PureConsent could not load. Optional tagged scripts remain disabled.'
      )
      window.dispatchEvent(new CustomEvent('pureconsent:error'))
    })
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', begin, { once: true })
  else begin()
})()
