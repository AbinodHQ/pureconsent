'use client'
import { LanguageSwitcher } from '@/components/language-switcher'
import { useTranslation, useLocale } from '@/components/locale-provider'
import { ClientsPanel } from '@/components/clients-panel'
import { useEffect, useState, type FormEvent } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Code2,
  Copy,
  Download,
  FileCheck2,
  Globe2,
  LayoutDashboard,
  Leaf,
  LogOut,
  Plus,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  X
} from 'lucide-react'
import Link from 'next/link'
import { Brand } from '@/components/brand'
import { AccountPanel, type Customer } from '@/components/account-panel'
import type { Receipt, Site, SiteInput } from '@/lib/domain'

type Overview = {
  workspace: {
    id: string
    name: string
    role: string
    plan: import('@/lib/plans').Plan
  }
  account: Customer
  usage: { count: number; month: string }
  sites: Site[]
  receipts: Receipt[]
  storage: string
  local: boolean
}
type Tab =
  | 'Overview'
  | 'Websites'
  | 'Banner studio'
  | 'Consent records'
  | 'Billing'
  | 'Account'
  | 'Clients'
const defaults: SiteInput = {
  name: '',
  origin: '',
  privacyUrl: '',
  language: 'auto',
  accent: '#4F46E5',
  retentionDays: 30,
  hideBranding: false,
  fontFamily: 'Arial, sans-serif',
  background: '#FFFFFF',
  textColor: '#0B0F19',
  translations: {},
  analytics:
    'We use analytics to understand visits and improve this website. See our privacy notice for providers and retention.',
  marketing:
    'We use marketing services to show relevant advertising. See our privacy notice for providers and retention.'
}


async function api (url: string, method = 'GET', body?: unknown) {
  const response = await fetch(`/api/${url}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(new URLSearchParams(location.search).get('workspace')
        ? {
            'x-pc-workspace': new URLSearchParams(location.search).get(
              'workspace'
            )!
          }
        : {})
    },
    body: body ? JSON.stringify(body) : undefined
  })
  const data = await response.json()
  if (!response.ok)
    throw Object.assign(new Error(data.error || 'Request failed.'), {
      status: response.status
    })
  return data
}


function snippet (site: Site, origin: string) {
  return `<script src="${origin}/consent.js"\n  data-site="${site.id}" defer></script>`
}

export default function Dashboard () {
  const t = useTranslation()
  const locale = useLocale()
  const [shared, setShared] = useState<{ id: string; name: string }[]>([])
  const [invite, setInvite] = useState('')
  const [tab, setTab] = useState<Tab>('Overview')
  const [data, setData] = useState<Overview | null>(null)
  const [selected, setSelected] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [locked, setLocked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<SiteInput>(defaults)
  const [editing, setEditing] = useState<string | null>(null)
  const [appOrigin, setAppOrigin] = useState('')
  const [filter, setFilter] = useState('all')
  const [previewLanguage, setPreviewLanguage] = useState<string>(locale)
  const [previewKey, setPreviewKey] = useState(0)
  const site = data?.sites.find(s => s.id === selected) || data?.sites[0]

  async function load () {
    try {
      const result: Overview = await api('overview')
      setData(result)
      setShared(await api('workspaces'))
      setLocked(false)
      setError('')
    } catch (e) {
      if ((e as { status?: number }).status === 401) {
        setData(null)
        setLocked(true)
      } else setError((e as Error).message)
    }
  }
  useEffect(() => {
    setAppOrigin(location.origin)
    setInvite(new URLSearchParams(location.search).get('invite') || '')
    if (new URLSearchParams(location.search).has('billing')) setTab('Billing')
    void load()
  }, [])
  useEffect(() => {
    if (!modal) return
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) setModal(false)
      if (event.key === 'Tab') {
        const items = [
          ...document.querySelectorAll<HTMLElement>(
            '.modal button:not(:disabled), .modal input, .modal select, .modal textarea'
          )
        ]
        if (event.shiftKey && document.activeElement === items[0]) {
          event.preventDefault()
          items.at(-1)?.focus()
        } else if (!event.shiftKey && document.activeElement === items.at(-1)) {
          event.preventDefault()
          items[0]?.focus()
        }
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [modal, busy])

  function add () {
    setEditing(null)
    setForm({
      ...defaults,
      analytics: t(defaults.analytics),
      marketing: t(defaults.marketing)
    })
    setError('')
    setModal(true)
  }

  function edit (target: Site) {
    setEditing(target.id)
    setForm({ ...defaults, ...target, translations: target.translations || {} })
    setError('')
    setModal(true)
  }

  async function save (event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const saved: Site = await api(
        editing ? `sites/${editing}` : 'sites',
        editing ? 'PATCH' : 'POST',
        form
      )
      await load()
      setSelected(saved.id)
      setModal(false)
      setTab('Banner studio')
      setNotice(
        editing
          ? 'Settings saved. Visitors will be asked again for this new notice version.'
          : 'Website added. Your installation snippet is ready.'
      )
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function copy (text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setNotice('Copied to clipboard.')
    } catch {
      setError(
        'Clipboard access is unavailable. Select and copy the code directly.'
      )
    }
  }

  const receipts = data?.receipts || []
  const rows = receipts.filter(r => filter === 'all' || r.siteId === filter)
  const accepted = receipts.filter(
    r => r.choices.analytics || r.choices.marketing
  ).length
  const preview = new URLSearchParams({
    font: site?.fontFamily || defaults.fontFamily,
    background: site?.background || defaults.background,
    textColor: site?.textColor || defaults.textColor,
    hideBranding: String(site?.hideBranding || false),
    name: site?.name || 'Your website',
    language: previewLanguage,
    accent: site?.accent || '#4F46E5',
    analytics:
      site?.translations?.[previewLanguage as 'en' | 'de' | 'fr']?.analytics ||
      site?.analytics ||
      defaults.analytics,
    marketing:
      site?.translations?.[previewLanguage as 'en' | 'de' | 'fr']?.marketing ||
      site?.marketing ||
      defaults.marketing
  })
  if (locked)
    return (
      <div className='login-page'>
        <Brand /><LanguageSwitcher />
        <section className='login-card'>
          <h1>{t('Your workspace awaits.')}</h1>
          <p>
            {t(
              'Sign in to manage your websites, consent records, and subscription.'
            )}
          </p>
          <Link
            className='button dark'
            href={`/auth/login?next=${encodeURIComponent(
              '/dashboard' + (invite ? '?invite=' + invite : '')
            )}`}
          >
            {t('Sign in')}
          </Link>
          <Link href='/auth/signup'>{t('Create a free account')}</Link>
        </section>
      </div>
    )
  return (
    <div className='app-shell'>
      <aside className='sidebar'>
        <Brand
          href={
            data?.workspace.role === 'client'
              ? `/dashboard?workspace=${data.workspace.id}`
              : '/dashboard'
          }
        />
        <div className='workspace-pill'>
          <span className='avatar'>
            {data?.workspace.name.charAt(0) || 'P'}
          </span>
          <div>
            {data?.workspace.name || t('Your workspace')}
            <small>PureConsent · {data?.workspace.plan || t('Free')}</small>
          </div>
          <ChevronDown size={14} />
        </div>
        {shared.length > 0 && (
          <label className='client-selector'>
            {t('Workspace')}
            <select
              value={data?.workspace.role === 'client' ? data.workspace.id : ''}
              onChange={e => {
                location.href = e.target.value
                  ? `/dashboard?workspace=${e.target.value}`
                  : '/dashboard'
              }}
            >
              <option value=''>{t('My workspace')}</option>
              {shared.map(w => (
                <option value={w.id} key={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <span className='nav-label'>{t('WORKSPACE')}</span>
        <nav>
          {(
            [
              ['Overview', LayoutDashboard],
              ['Websites', Globe2],
              ['Banner studio', SlidersHorizontal],
              ['Consent records', FileCheck2],
              ['Billing', ShieldCheck],
              ['Account', Settings2],
              ['Clients', Globe2]
            ] as const
          )
            .filter(
              ([label]) =>
                data?.workspace.role !== 'client' ||
                !['Billing', 'Account', 'Clients'].includes(label)
            )
            .map(([label, Icon]) => (
              <button
                key={t(String(label))}
                className={tab === label ? 'active' : ''}
                onClick={() => {
                  setTab(label)
                  setNotice('')
                }}
              >
                <Icon size={18} strokeWidth={1.6} />
                {t(String(label))}
                {label === 'Websites' && (
                  <span className='nav-count'>{data?.sites.length || 0}</span>
                )}
              </button>
            ))}
        </nav>
        <div className='sidebar-bottom'>
          <div className='care-card'>
            <Leaf size={24} strokeWidth={1.4} />
            <strong>
              {t('A little less tracking.')}
              <br />
              {t('A little more trust.')}
            </strong>
            <p>{t('Good privacy starts with a real choice.')}</p>
            <Link href='/docs'>
              {t('Read the integration guide ')}
              <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className='powered'>
            <span className='ambiten-mark'>a</span>
            <div>
              {t('Powered by ')}
              <strong>Ambiten</strong>
              <small>{t('An Abinod product')}</small>
            </div>
          </div>
        </div>
      </aside>
      <div className='main-shell'>
        <header className='app-header'>
          <LanguageSwitcher />
          <span>
            {t('Workspace ')}
            <span className='slash'>/</span> <strong>{t(String(tab))}</strong>
          </span>
          <div>
            <span className='environment'>
              <span className='live-dot' />
              {data?.storage === 'ambiten'
                ? t('Ambiten connected')
                : t('Local development')}
            </span>
            <Link href='/docs' className='header-guide'>
              {t('Help & docs ')}
              <ArrowUpRight size={13} />
            </Link>
            {data && !data.local && (
              <button
                aria-label={t('Sign out')}
                className='icon-button'
                onClick={async () => {
                  await api('auth/logout', 'POST')
                  setLocked(true)
                }}
              >
                <LogOut size={17} />
              </button>
            )}
            <span className='avatar small-avatar'>
              {data?.account.name.charAt(0) || 'P'}
            </span>
          </div>
        </header>
        <div className='workspace-content'>
          <div className='page-heading'>
            <div>
              <span className='eyebrow'>{t('PRIVACY, WITH PURPOSE')}</span>
              <h1>
                {tab === 'Clients'
                  ? t('A workspace for every client.')
                  : tab === 'Billing'
                  ? t('A plan for your next chapter.')
                  : tab === 'Account'
                  ? t('Your workspace, your settings.')
                  : tab === 'Overview'
                  ? t('A clearer view of consent.')
                  : tab === 'Websites'
                  ? t('Your corner of the web.')
                  : tab === 'Banner studio'
                  ? t('Make it feel like you.')
                  : t('Every choice, accounted for.')}
              </h1>
              <p>
                {tab === 'Clients'
                  ? t('Invite clients to the domains they manage.')
                  : tab === 'Billing'
                  ? t(
                      'Manage your subscription, usage, payment details, and invoices.'
                    )
                  : tab === 'Account'
                  ? t('Keep your profile and account security up to date.')
                  : tab === 'Overview'
                  ? t(
                      'Your websites, visitor choices, and next steps. All in one quiet place.'
                    )
                  : tab === 'Websites'
                  ? t('Manage each website’s notice and installation.')
                  : tab === 'Banner studio'
                  ? t(
                      'A considered first impression. Preview your banner before installing.'
                    )
                  : t(
                      'Review and export the latest 1,000 retained consent events.'
                    )}
              </p>
            </div>
            {data?.workspace.role !== 'client' && (
              <button className='button dark' onClick={add}>
                <Plus size={16} />
                {t('Add website')}
              </button>
            )}
          </div>
          {!modal && error && (
            <div className='alert error' role='alert'>
              {t(String(error))}
              <button onClick={load}>{t('Retry')}</button>
            </div>
          )}
          {notice && (
            <div className='alert success' role='status'>
              <Check size={16} />
              {t(String(notice))}
              <button
                aria-label={t('Dismiss message')}
                onClick={() => setNotice('')}
              >
                <X size={14} />
              </button>
            </div>
          )}
          {!data && !error && (
            <div className='panel loading'>{t('Opening your workspace…')}</div>
          )}
          {data && (
            <>
              {invite && (
                <section className='panel client-panel'>
                  <h2>{t('Join your client workspace')}</h2>
                  <p>
                    {t(
                      'Accept with the email address that received this invitation.'
                    )}
                  </p>
                  <button
                    className='button dark'
                    onClick={async () => {
                      try {
                        const result = await api('invitations/accept', 'POST', {
                          token: invite
                        })
                        location.href = `/dashboard?workspace=${result.workspaceId}`
                      } catch (e) {
                        setError((e as Error).message)
                      }
                    }}
                  >
                    {t('Accept invitation')}
                  </button>
                </section>
              )}
              {tab === 'Clients' && data.workspace.role !== 'client' && (
                <ClientsPanel
                  sites={data.sites}
                  agency={data.workspace.plan === 'agency'}
                />
              )}
              {data.workspace.role !== 'client' &&
                (tab === 'Billing' || tab === 'Account') && (
                  <AccountPanel
                    account={data.account}
                    usage={data.usage}
                    reload={load}
                    kind={tab}
                  />
                )}
              {tab === 'Overview' && (
                <>
                  <div className='welcome-banner'>
                    <div className='welcome-icon'>
                      <Leaf size={32} strokeWidth={1.2} />
                    </div>
                    <div>
                      <span className='eyebrow'>
                        {t('WELCOME TO PURECONSENT')}
                      </span>
                      <h2>{t('Small banner. Better beginnings.')}</h2>
                      <p>
                        {data.sites.length
                          ? t(
                              'Your workspace is ready. Check your installation before bringing visitors on board.'
                            )
                          : t(
                              'Let’s give your first website a privacy experience worth trusting.'
                            )}
                      </p>
                    </div>
                    <button
                      className='button light'
                      onClick={
                        data.sites.length ? () => setTab('Banner studio') : add
                      }
                    >
                      {data.sites.length
                        ? t('Open banner studio')
                        : t('Set up your website')}
                      <ArrowRight size={16} />
                    </button>
                    <div className='banner-leaf'>◒</div>
                  </div>
                  <div className='stats'>
                    <Stat
                      label={t('Websites configured')}
                      value={String(data.sites.length).padStart(2, '0')}
                      note={t('Ready for your installation')}
                      icon={<Globe2 size={19} />}
                    />
                    <Stat
                      label={t('Consent records')}
                      value={String(receipts.length).padStart(2, '0')}
                      note={t('Latest retained events · up to 1,000')}
                      icon={<FileCheck2 size={19} />}
                    />
                    <Stat
                      label={t('Optional services allowed')}
                      value={
                        receipts.length
                          ? `${Math.round((accepted / receipts.length) * 100)}%`
                          : '—'
                      }
                      note={t('Share of recorded events')}
                      icon={<ShieldCheck size={19} />}
                    />
                  </div>
                  <div className='overview-grid'>
                    <section className='panel'>
                      <div className='panel-heading'>
                        <div>
                          <h2>{t('Your websites')}</h2>
                          <p>{t('A home for every privacy notice.')}</p>
                        </div>
                        <button
                          className='text-link'
                          onClick={() => setTab('Websites')}
                        >
                          {t('View all ')}
                          <ArrowRight size={15} />
                        </button>
                      </div>
                      {data.sites.length ? (
                        data.sites.slice(0, 4).map(s => (
                          <button
                            className='site-row'
                            key={s.id}
                            onClick={() => {
                              setSelected(s.id)
                              setTab('Banner studio')
                            }}
                          >
                            <span className='site-icon'>
                              <Globe2 size={21} />
                            </span>
                            <span>
                              <strong>{s.name}</strong>
                              <small>{s.origin}</small>
                            </span>
                            <span className='badge'>
                              {t('Configured · v')}
                              {s.version}
                            </span>
                            <ArrowUpRight size={16} />
                          </button>
                        ))
                      ) : (
                        <div className='empty'>
                          <div className='empty-art'>
                            <Globe2 size={32} strokeWidth={1} />
                            <span>+</span>
                          </div>
                          <h3>{t('Your first website belongs here.')}</h3>
                          <p>
                            {t('Add a domain to create your banner')}
                            <br />
                            {t('and get your installation snippet.')}
                          </p>
                          <button className='button outline' onClick={add}>
                            <Plus size={15} />
                            {t('Add your first website')}
                          </button>
                        </div>
                      )}
                    </section>
                    <section className='panel checklist'>
                      <span className='eyebrow'>{t('YOUR QUICK START')}</span>
                      <h2>{t('From setup to a real choice.')}</h2>
                      {[
                        [
                          'Add your website',
                          'Set your origin and privacy notice.',
                          data.sites.length > 0
                        ],
                        [
                          'Make the banner yours',
                          'Choose a language and category details.',
                          data.sites.length > 0
                        ],
                        [
                          'Install & verify',
                          'Tag optional scripts and test each choice.',
                          receipts.length > 0
                        ]
                      ].map(([title, subtitle, done], index) => (
                        <div className='check-step' key={String(title)}>
                          <span className={done ? 'done' : ''}>
                            {done ? <Check size={13} /> : index + 1}
                          </span>
                          <div>
                            <strong>{t(String(title))}</strong>
                            <p>{t(String(subtitle))}</p>
                          </div>
                        </div>
                      ))}
                      <Link href='/docs' className='text-link'>
                        {t('Follow the installation guide ')}
                        <ArrowUpRight size={15} />
                      </Link>
                      <small className='muted'>
                        {t(
                          'Checklist reflects setup activity, not a compliance certification.'
                        )}
                      </small>
                    </section>
                  </div>
                  <div className='privacy-strip'>
                    <ShieldCheck size={21} />
                    <div>
                      <strong>
                        {t('Collect the choice. Respect the person.')}
                      </strong>
                      <span>
                        {t(
                          'Consent records contain no IP addresses, user agents, or browsing histories.'
                        )}
                      </span>
                    </div>
                    <Link href='/privacy'>
                      {t('Our approach ')}
                      <ArrowUpRight size={14} />
                    </Link>
                  </div>
                </>
              )}
              {tab === 'Websites' && (
                <section className='panel'>
                  <div className='panel-heading'>
                    <div>
                      <h2>{t('Website directory')}</h2>
                      <p>
                        {t(
                          'Origins are matched exactly, including subdomains and ports.'
                        )}
                      </p>
                    </div>
                    <span className='badge'>
                      {data.sites.length}
                      {t(' websites')}
                    </span>
                  </div>
                  {!data.sites.length ? (
                    <div className='empty'>
                      <Globe2 size={32} />
                      <h3>{t('Start with one website.')}</h3>
                      <p>{t('Your settings and records will appear here.')}</p>
                      <button className='button dark' onClick={add}>
                        {t('Add website ')}
                        <Plus size={16} />
                      </button>
                    </div>
                  ) : (
                    data.sites.map(s => (
                      <div className='site-row' key={s.id}>
                        <span className='site-icon'>
                          <Globe2 size={22} />
                        </span>
                        <span>
                          <strong>{s.name}</strong>
                          <small>{s.origin}</small>
                        </span>
                        <span className='badge'>
                          {s.verified
                            ? t('Verified')
                            : t('Verification pending')}{' '}
                          · v{s.version}
                        </span>
                        <button
                          className='button outline compact'
                          onClick={() => {
                            setSelected(s.id)
                            setTab('Banner studio')
                          }}
                        >
                          {t('Install')}
                        </button>
                        <button
                          className='button outline compact'
                          disabled={data.workspace.role === 'client'}
                          onClick={async () => {
                            if (
                              !confirm(
                                `${t('Remove')} ${s.name}? ${t(
                                  'Its widget will stop serving. Existing records remain until expiry.'
                                )}`
                              )
                            )
                              return
                            try {
                              await api(`sites/${s.id}`, 'DELETE', {})
                              await load()
                            } catch (e) {
                              setError((e as Error).message)
                            }
                          }}
                        >
                          {t('Remove')}
                        </button>
                        <button
                          className='icon-button'
                          aria-label={`${t('Edit settings')} ${s.name}`}
                          onClick={() => edit(s)}
                        >
                          <Settings2 size={17} />
                        </button>
                      </div>
                    ))
                  )}
                </section>
              )}
              {tab === 'Banner studio' && (
                <>
                  <div className='studio-toolbar'>
                    <label>
                      {t('Website')}
                      <select
                        value={site?.id || ''}
                        onChange={e => setSelected(e.target.value)}
                      >
                        {!site && (
                          <option value=''>{t('Example preview')}</option>
                        )}
                        {data.sites.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className='segmented'>
                      <button
                        className={previewLanguage === 'en' ? 'selected' : ''}
                        onClick={() => setPreviewLanguage('en')}
                      >
                        {t('English')}
                      </button>
                      <button
                        className={previewLanguage === 'de' ? 'selected' : ''}
                        onClick={() => setPreviewLanguage('de')}
                      >
                        Deutsch
                      </button>
                      <button
                        className={previewLanguage === 'fr' ? 'selected' : ''}
                        onClick={() => setPreviewLanguage('fr')}
                      >
                        Français
                      </button>
                    </div>
                    <button
                      className='button outline compact'
                      onClick={() => setPreviewKey(v => v + 1)}
                    >
                      {t('Reset preview')}
                    </button>
                    {site && (
                      <button
                        className='button outline compact'
                        onClick={() => edit(site)}
                      >
                        <Settings2 size={15} />
                        {t('Edit settings')}
                      </button>
                    )}
                  </div>
                  {site && !site.verified && (
                    <section className='panel verification-panel'>
                      <h2>{t('Verify domain ownership')}</h2>
                      <p>
                        {t(
                          'Add this DNS TXT record before activating the widget.'
                        )}
                      </p>
                      <label>
                        {t('Record name')}
                        <code>
                          _pureconsent.{new URL(site.origin).hostname}
                        </code>
                      </label>
                      <label>
                        {t('Record value')}
                        <code>pureconsent={site.verificationToken}</code>
                      </label>
                      <button
                        className='button dark'
                        disabled={busy}
                        onClick={async () => {
                          setBusy(true)
                          setError('')
                          try {
                            await api(`sites/${site.id}/verify`, 'POST', {})
                            await load()
                            setNotice('Domain verified.')
                          } catch (e) {
                            setError((e as Error).message)
                          } finally {
                            setBusy(false)
                          }
                        }}
                      >
                        {t('Check DNS record')}
                      </button>
                    </section>
                  )}
                  <div className='studio-grid'>
                    <section className='studio-preview'>
                      <div className='browser-top'>
                        <span />
                        <span />
                        <span />
                        <small>{site?.origin || t('YOUR WEBSITE')}</small>
                      </div>
                      <iframe
                        key={`${previewKey}-${preview.toString()}`}
                        title={t('Interactive banner preview')}
                        src={`/demo.html?${preview}`}
                      />
                      <div className='preview-caption'>
                        {t('Interactive preview · no consent records are sent')}
                      </div>
                    </section>
                    <div className='studio-details'>
                      <section className='panel'>
                        <span className='eyebrow'>{t('THE DETAILS')}</span>
                        <h2>{t('Thoughtful by default.')}</h2>
                        <dl>
                          <dt>{t('Appearance')}</dt>
                          <dd>
                            <i
                              style={{ background: site?.accent || '#4F46E5' }}
                            />
                            {site?.accent || '#4F46E5'}
                          </dd>
                          <dt>{t('Visitor language')}</dt>
                          <dd>
                            {site?.language === 'auto'
                              ? t('Automatic · plan languages')
                              : site?.language?.toUpperCase() || t('English')}
                          </dd>
                          <dt>{t('Optional services')}</dt>
                          <dd>{t('Off until consent')}</dd>
                          <dt>{t('Record retention')}</dt>
                          <dd>
                            {site?.retentionDays || 30}
                            {t(' days')}
                          </dd>
                          <dt>{t('Notice version')}</dt>
                          <dd>{site ? `v${site.version}` : t('Preview')}</dd>
                        </dl>
                      </section>
                      <section className='panel install-panel'>
                        <Code2 size={23} />
                        <h2>{t('Your one-line introduction.')}</h2>
                        <p>
                          {t(
                            'Place this in the page head, then tag your optional scripts using the integration guide.'
                          )}
                        </p>
                        {site ? (
                          <>
                            <pre>
                              <code>{snippet(site, appOrigin)}</code>
                            </pre>
                            <button
                              className='button dark full'
                              onClick={() => copy(snippet(site, appOrigin))}
                            >
                              <Copy size={15} />
                              {t('Copy installation snippet')}
                            </button>
                          </>
                        ) : (
                          <button className='button dark full' onClick={add}>
                            {t('Add a website to get your code')}
                          </button>
                        )}
                        <Link href='/docs'>
                          {t('See script blocking & withdrawal ')}
                          <ArrowUpRight size={14} />
                        </Link>
                      </section>
                    </div>
                  </div>
                </>
              )}
              {tab === 'Consent records' && (
                <section className='panel'>
                  <div className='panel-heading'>
                    <div>
                      <h2>{t('Consent ledger')}</h2>
                      <p>
                        {t(
                          'Append-only events with the notice version presented.'
                        )}
                      </p>
                    </div>
                    <div className='record-tools'>
                      <select
                        aria-label={t('Filter records by website')}
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                      >
                        <option value='all'>{t('All websites')}</option>
                        {data.sites.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                      <button className='button outline compact' onClick={load}>
                        {t('Refresh')}
                      </button>
                      <a
                        className='button dark compact'
                        href={`/api/receipts?format=csv&workspace=${
                          data.workspace.id
                        }${filter === 'all' ? '' : `&siteId=${filter}`}`}
                      >
                        <Download size={14} />
                        {t('Export CSV')}
                      </a>
                      {['business', 'agency'].includes(data.workspace.plan) && (
                        <a
                          className='button outline compact'
                          href={`/api/receipts?format=audit&workspace=${
                            data.workspace.id
                          }${filter === 'all' ? '' : `&siteId=${filter}`}`}
                        >
                          {t('Export audit JSON')}
                        </a>
                      )}
                    </div>
                  </div>
                  {rows.length ? (
                    <div className='table-scroll'>
                      <table>
                        <thead>
                          <tr>
                            <th>{t('Website / event')}</th>
                            <th>{t('Choice')}</th>
                            <th>{t('Analytics')}</th>
                            <th>{t('Marketing')}</th>
                            <th>{t('Notice')}</th>
                            <th>{t('Received')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map(r => (
                            <tr key={r.id}>
                              <td>
                                <strong>
                                  {data.sites.find(s => s.id === r.siteId)
                                    ?.name || r.siteId}
                                </strong>
                                <small>{r.id.slice(0, 8)}</small>
                              </td>
                              <td>
                                <span className='badge'>
                                  {t(String(r.action))}
                                </span>
                              </td>
                              <td>
                                {r.choices.analytics ? t('Allowed') : t('Off')}
                              </td>
                              <td>
                                {r.choices.marketing ? t('Allowed') : t('Off')}
                              </td>
                              <td>
                                v{r.version} · {r.language.toUpperCase()}
                              </td>
                              <td>
                                {new Date(r.createdAt).toLocaleString(locale)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className='empty'>
                      <FileCheck2 size={34} strokeWidth={1.2} />
                      <h3>{t('A clean slate.')}</h3>
                      <p>
                        {t(
                          'Real visitor choices will appear after installation.'
                        )}
                        <br />
                        {t('Preview interactions don’t create records.')}
                      </p>
                      <Link href='/docs' className='button outline'>
                        {t('View installation guide ')}
                        <ArrowUpRight size={15} />
                      </Link>
                    </div>
                  )}
                  <div className='table-note'>
                    {t(
                      'These are browser-submitted events, not independently verified identities. Retention is set per website.'
                    )}
                  </div>
                </section>
              )}
            </>
          )}
          <div className='workspace-footer'>
            <span>
              PureConsent <span className='brand-dot'>/</span>
              {t(' Built with intention by Abinod')}
            </span>
            <Link href='/privacy'>
              {t('Privacy & storage ')}
              <ArrowUpRight size={12} />
            </Link>
          </div>
        </div>
      </div>
      {modal && (
        <div
          className='modal-backdrop'
          onClick={e => {
            if (e.target === e.currentTarget && !busy) setModal(false)
          }}
        >
          <section
            className='modal'
            role='dialog'
            aria-modal='true'
            aria-labelledby='form-title'
          >
            <div className='modal-heading'>
              <div>
                <span className='eyebrow'>{t('A GOOD PLACE TO START')}</span>
                <h2 id='form-title'>
                  {editing
                    ? t('Refine your website.')
                    : t('Meet your next website.')}
                </h2>
              </div>
              <button
                disabled={busy}
                aria-label={t('Close')}
                className='icon-button'
                onClick={() => setModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={save}>
              <div className='form-grid'>
                <label className='wide'>
                  {t('Website name')}
                  <input
                    autoFocus
                    required
                    minLength={2}
                    maxLength={80}
                    placeholder={t('Your company')}
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                </label>
                <label className='wide'>
                  {t('Website origin')}
                  <input
                    required
                    type='url'
                    placeholder='https://example.com'
                    value={form.origin}
                    onChange={e => setForm({ ...form, origin: e.target.value })}
                  />
                  <small>
                    {t('Exact origin. HTTPS required except localhost.')}
                  </small>
                </label>
                <label className='wide'>
                  {t('Privacy notice URL')}
                  <input
                    required
                    type='url'
                    placeholder='https://example.com/privacy'
                    value={form.privacyUrl}
                    onChange={e =>
                      setForm({ ...form, privacyUrl: e.target.value })
                    }
                  />
                </label>
                <label>
                  {t('Banner language')}
                  <select
                    value={form.language}
                    onChange={e =>
                      setForm({
                        ...form,
                        language: e.target.value as SiteInput['language']
                      })
                    }
                  >
                    <option value='auto'>
                      {t('Browser language (plan languages)')}
                    </option>
                    <option value='en'>{t('English')}</option>
                    <option value='de'>Deutsch</option>
                    <option value='fr'>{t('Français (Business Pro+)')}</option>
                  </select>
                </label>
                <label>
                  {t('Record retention')}
                  <select
                    value={form.retentionDays}
                    onChange={e =>
                      setForm({
                        ...form,
                        retentionDays: Number(e.target.value)
                      })
                    }
                  >
                    <option value={30}>{t('30 days')}</option>
                    <option value={90}>{t('90 days')}</option>
                    <option value={180}>{t('180 days')}</option>
                    <option value={365}>{t('365 days')}</option>
                  </select>
                </label>
                <label className='wide'>
                  {t('Brand font family (Starter+)')}
                  <input
                    value={form.fontFamily}
                    onChange={e =>
                      setForm({ ...form, fontFamily: e.target.value })
                    }
                    placeholder='Inter, Arial, sans-serif'
                  />
                  <small>
                    {t(
                      'Use a font already loaded on your website; the widget makes no font requests.'
                    )}
                  </small>
                </label>
                <label>
                  {t('Background (Starter+)')}
                  <input
                    type='color'
                    value={form.background}
                    onChange={e =>
                      setForm({ ...form, background: e.target.value })
                    }
                  />
                </label>
                <label>
                  {t('Text color (Starter+)')}
                  <input
                    type='color'
                    value={form.textColor}
                    onChange={e =>
                      setForm({ ...form, textColor: e.target.value })
                    }
                  />
                </label>
                <label className='wide terms-check'>
                  <input
                    type='checkbox'
                    checked={form.hideBranding}
                    onChange={e =>
                      setForm({ ...form, hideBranding: e.target.checked })
                    }
                  />
                  {t('Remove widget branding (Starter+)')}
                </label>
                <label className='wide color-label'>
                  {t('Brand accent')}
                  <input
                    type='color'
                    value={form.accent}
                    onChange={e => setForm({ ...form, accent: e.target.value })}
                  />
                  <span>{form.accent}</span>
                </label>
                <label className='wide'>
                  {t('Analytics purpose & providers')}
                  <textarea
                    required
                    minLength={5}
                    maxLength={500}
                    rows={2}
                    value={form.analytics}
                    onChange={e =>
                      setForm({ ...form, analytics: e.target.value })
                    }
                  />
                </label>
                <label className='wide'>
                  {t('Marketing purpose & providers')}
                  <textarea
                    required
                    minLength={5}
                    maxLength={500}
                    rows={2}
                    value={form.marketing}
                    onChange={e =>
                      setForm({ ...form, marketing: e.target.value })
                    }
                  />
                  <small>
                    {t(
                      'Describe your actual providers. Business Pro and Agency can translate these descriptions below.'
                    )}
                  </small>
                </label>
                {['business', 'agency'].includes(
                  data?.workspace.plan || ''
                ) && (
                  <div className='wide translation-editor'>
                    <h3>{t('DE / EN / FR provider descriptions')}</h3>
                    <p>
                      {t(
                        'Review translations before saving. Automatic translation sends only these two descriptions to DeepL.'
                      )}
                    </p>
                    {editing && (
                      <button
                        type='button'
                        className='button outline'
                        disabled={busy}
                        onClick={async () => {
                          setBusy(true)
                          try {
                            const translations = await api(
                              `sites/${editing}/translate`,
                              'POST',
                              {
                                analytics: form.analytics,
                                marketing: form.marketing
                              }
                            )
                            setForm({ ...form, translations })
                          } catch (e) {
                            setError((e as Error).message)
                          } finally {
                            setBusy(false)
                          }
                        }}
                      >
                        {t('Generate translation drafts')}
                      </button>
                    )}
                    {(['en', 'de', 'fr'] as const).map(lang => (
                      <div key={lang}>
                        <h4>{lang.toUpperCase()}</h4>
                        {(['analytics', 'marketing'] as const).map(category => (
                          <label key={t(String(category))}>
                            {t(String(category))}
                            <textarea
                              value={form.translations[lang]?.[category] || ''}
                              onChange={e =>
                                setForm({
                                  ...form,
                                  translations: {
                                    ...form.translations,
                                    [lang]: {
                                      analytics:
                                        form.translations[lang]?.analytics ||
                                        '',
                                      marketing:
                                        form.translations[lang]?.marketing ||
                                        '',
                                      [category]: e.target.value
                                    }
                                  }
                                })
                              }
                            />
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {editing && (
                <p className='form-hint'>
                  {t(
                    'Saving creates a new notice version and asks visitors to choose again on their next page load. Existing records keep their original retention period.'
                  )}
                </p>
              )}
              {error && (
                <div role='alert' className='alert error'>
                  {t(String(error))}
                </div>
              )}
              <div className='form-actions'>
                <button
                  type='button'
                  disabled={busy}
                  className='button outline'
                  onClick={() => setModal(false)}
                >
                  {t('Cancel')}
                </button>
                <button disabled={busy} className='button dark'>
                  {busy
                    ? t('Saving…')
                    : editing
                    ? t('Save new version')
                    : t('Create website')}
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}
function Stat ({
  label,
  value,
  note,
  icon
}: {
  label: string
  value: string
  note: string
  icon: React.ReactNode
}) {
  const t = useTranslation()
  return (
    <section className='stat'>
      <div>
        <span>{t(String(label))}</span>
        {icon}
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </section>
  )
}
