import Link from 'next/link'
import { Brand } from '@/components/brand'
export default function Privacy () {
  return (
    <main className='document-page'>
      <nav>
        <Brand />
        <Link href='/dashboard'>Workspace ↗</Link>
      </nav>
      <article>
        <span className='eyebrow'>PRIVACY & STORAGE</span>
        <h1>
          Remember the choice.
          <br />
          Respect the person.
        </h1>
        <p className='lead'>
          This page describes the initial implementation. It is not a substitute
          for the deploying operator’s privacy notice.
        </p>
        <h2>On a visitor’s device</h2>
        <p>
          The widget uses first-party local storage to remember category
          preferences, a site-specific random consent ID, the notice version,
          and an expiry of 180 days. A failed receipt submission is retained for
          retry. It creates no tracking cookies and does not fingerprint
          visitors. Local storage is still device storage and must be described
          in your privacy notice.
        </p>
        <h2>In the database</h2>
        <p>
          Each choice stores a random event ID, site-specific consent ID,
          website ID, categories, action, interface language, notice version,
          notice snapshot, and the server receipt timestamp. The consent ID is
          pseudonymous, not anonymous. Application records do not include IP
          addresses, user agents, URLs visited, or geographic location.
        </p>
        <h2>Retention</h2>
        <p>
          Website owners select 30–365 days for new records. Ambiten connects to
          MongoDB, where a TTL index removes expired records asynchronously.
          Expired records are excluded from application queries. Changing
          retention affects new events only. Local development filters expired
          records on access and removes them on the next write.
        </p>
        <h2>Customer accounts</h2><p>We store your name, email, workspace, password hash, and subscription status. The essential HTTP-only session cookie lasts seven days. Verification links expire after 24 hours; recovery links after one hour. Password changes revoke existing sessions. Your website data is scoped to your account.</p><h2>Service providers</h2><p>Ambiten provides the database integration with MongoDB. Resend delivers account emails when configured. Stripe processes payments and billing; card details are not stored by PureConsent. Infrastructure providers may process request metadata in their access logs. Monthly usage counts configuration requests without building visitor profiles.</p><h2>Your controls</h2><p>Export your profile and the latest 1,000 retained receipts from Account, or export the consent ledger as CSV. You can delete your account after any paid subscription has ended. Account deletion removes its websites, sessions, and receipts; payment providers may retain financial records under their own policies.</p><h2>Contact and requests</h2><p>PureConsent is operated by Abinod. For account, privacy, or data requests, contact <a href="mailto:abinod@online.de">abinod@online.de</a>. For choices submitted on another website, contact that website’s owner first; they determine the purposes and providers used on their site. Hosting in Germany is not implied by using PureConsent or Ambiten.</p><Link className='button dark' href='/docs'>
          Read the integration guide ↗
        </Link>
      </article>
    </main>
  )
}
