import { LanguageSwitcher } from '@/components/language-switcher'
import { getTranslator } from '@/lib/i18n/server'
import Link from 'next/link'
import { ArrowUpRight, ArrowUp, ShieldCheck, Code2 } from 'lucide-react'
import { Brand } from './brand'

const groups = [
  {
    title: 'Product',
    links: [
      ['How it works', '/#how'],
      ['Plans & pricing', '/#pricing'],
      ['Try the banner', '/demo.html'],
      ['Your dashboard', '/dashboard']
    ]
  },
  {
    title: 'Build with PureConsent',
    links: [
      ['Getting started', '/docs#setup'],
      ['Install the widget', '/docs#installation'],
      ['Next.js & Webflow', '/docs#frameworks'],
      ['Agency client seats', '/docs#agency']
    ]
  },
  {
    title: 'Help & resources',
    links: [
      ['Integration guide', '/docs'],
      ['Verify your domain', '/docs#domains'],
      ['Contact support', 'mailto:abinod@online.de'],
      ['Recover your account', '/auth/forgot']
    ]
  },
  {
    title: 'Trust & privacy',
    links: [
      ['Privacy & storage', '/privacy'],
      ['Terms of service', '/terms'],
      ['Script controls', '/docs#script-controls'],
      ['Test your installation', '/docs#testing']
    ]
  }
]

export async function SiteFooter () {
  const t = await getTranslator()
  return (
    <footer className='site-footer' aria-label={t('PureConsent footer')}>
      <div className='footer-inner'>
        <div className='footer-intro'>
          <div>
            <Brand />
            <p>
              {t('Clear choices. Lighter websites.')}
              <br />
              {t('A better foundation for trust.')}
            </p>
          </div>
          <div className='footer-start'>
            <span>{t('YOUR NEXT STEP TOWARD BETTER PRIVACY')}</span>
            <Link href='/auth/signup' className='button dark'>
              {t('Start with a free workspace ')}
              <ArrowUpRight size={18} aria-hidden='true' />
            </Link>
            <small>
              {t('1 website · 1,000 monthly page views · No card required')}
            </small>
          </div>
        </div>
        <nav className='footer-links' aria-label={t('Footer navigation')}>
          {groups.map(group => (
            <div key={t(String(group.title))}>
              <h2>{t(String(group.title))}</h2>
              <ul>
                {group.links.map(([label, href]) => (
                  <li key={t(String(label))}>
                    <Link href={href}>{t(String(label))}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className='footer-principles'>
          <span>
            <ShieldCheck size={18} aria-hidden='true' />
            {t(' Visitor choice comes first')}
          </span>
          <span>
            <Code2 size={18} aria-hidden='true' />
            {t(' Built for the modern web')}
          </span>
          <span className='footer-languages'>
            {t('Banner languages ')}
            <strong>DE / EN / FR</strong>
            <small>{t('Business Pro & Agency')}</small>
          </span>
        </div>
        <LanguageSwitcher />
        <div className='footer-bottom'>
          <p>
            © {new Date().getFullYear()}
            {t(' PureConsent. A product by Abinod.')}
          </p>
          <div>
            <Link href='/privacy'>{t('Privacy')}</Link>
            <Link href='/terms'>{t('Terms')}</Link>
            <a href='#top'>
              {t('Back to top ')}
              <ArrowUp size={15} aria-hidden='true' />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
