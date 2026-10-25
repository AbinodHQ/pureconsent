import Link from 'next/link'
import { ArrowUpRight, ArrowUp, ShieldCheck, Code2 } from 'lucide-react'
import { Brand } from './brand'

const groups = [
  { title: 'Product', links: [['How it works', '/#how'], ['Plans & pricing', '/#pricing'], ['Try the banner', '/demo.html'], ['Your dashboard', '/dashboard']] },
  { title: 'Build with PureConsent', links: [['Getting started', '/docs#setup'], ['Install the widget', '/docs#installation'], ['Next.js & Webflow', '/docs#frameworks'], ['Agency client seats', '/docs#agency']] },
  { title: 'Help & resources', links: [['Integration guide', '/docs'], ['Verify your domain', '/docs#domains'], ['Contact support', 'mailto:abinod@online.de'], ['Recover your account', '/auth/forgot']] },
  { title: 'Trust & privacy', links: [['Privacy & storage', '/privacy'], ['Terms of service', '/terms'], ['Script controls', '/docs#script-controls'], ['Test your installation', '/docs#testing']] },
]

export function SiteFooter () {
  return (
    <footer className='site-footer' aria-label='PureConsent footer'>
      <div className='footer-inner'>
        <div className='footer-intro'>
          <div>
            <Brand />
            <p>Clear choices. Lighter websites.<br />A better foundation for trust.</p>
          </div>
          <div className='footer-start'>
            <span>YOUR NEXT STEP TOWARD BETTER PRIVACY</span>
            <Link href='/auth/signup' className='button dark'>Start with a free workspace <ArrowUpRight size={18} aria-hidden='true' /></Link>
            <small>1 website · 1,000 monthly page views · No card required</small>
          </div>
        </div>
        <nav className='footer-links' aria-label='Footer navigation'>
          {groups.map(group => <div key={group.title}>
            <h2>{group.title}</h2>
            <ul>{group.links.map(([label, href]) => <li key={label}><Link href={href}>{label}</Link></li>)}</ul>
          </div>)}
        </nav>
        <div className='footer-principles'>
          <span><ShieldCheck size={18} aria-hidden='true' /> Visitor choice comes first</span>
          <span><Code2 size={18} aria-hidden='true' /> Built for the modern web</span>
          <span className='footer-languages'>Banner languages <strong>DE / EN / FR</strong><small>Business Pro & Agency</small></span>
        </div>
        <div className='footer-bottom'>
          <p>© {new Date().getFullYear()} PureConsent. A product by Abinod.</p>
          <div><Link href='/privacy'>Privacy</Link><Link href='/terms'>Terms</Link><a href='#top'>Back to top <ArrowUp size={15} aria-hidden='true' /></a></div>
        </div>
      </div>
    </footer>
  )
}
