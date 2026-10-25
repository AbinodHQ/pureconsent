'use client'
import { Globe2 } from 'lucide-react'
import { useLocale } from './locale-provider'
import { localeOrigins, type Locale } from '@/lib/i18n/shared'

export function LanguageSwitcher () {
  const locale = useLocale()
  function change (next: Locale) {
    if (next === locale) return
    const target = new URL(location.href)
    if (['localhost', '127.0.0.1'].includes(target.hostname)) {
      document.cookie = `pc_locale=${next}; Path=/; SameSite=Lax; Max-Age=31536000`
    } else {
      target.host = new URL(localeOrigins[next]).host
      target.protocol = 'https:'
    }
    location.assign(target.href)
  }
  return (
    <label className='language-switcher'>
      <Globe2 size={17} aria-hidden='true' />
      <span className='sr-only'>
        {locale === 'de' ? 'Sprache' : 'Language'}
      </span>
      <select
        aria-label={locale === 'de' ? 'Sprache wechseln' : 'Change language'}
        value={locale}
        onChange={e => change(e.target.value as Locale)}
      >
        <option value='de'>Deutsch</option>
        <option value='en'>English</option>
      </select>
    </label>
  )
}
