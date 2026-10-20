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
        <h2>Operator access</h2>
        <p>
          The initial release has one operator workspace. Its sign-in uses an
          essential, HTTP-only session cookie lasting eight hours. Local
          development may run without authentication on loopback; production
          requires configuration. Infrastructure providers may process request
          metadata in their own access logs. Configure their logging, retention,
          region, and contracts separately.
        </p>
        <h2>Before a commercial launch</h2>
        <p>
          The operator must publish their controller identity, contact details,
          purposes and legal bases, provider list, retention policy,
          data-subject rights, and any international transfer information.
          Hosting in Germany is not implied by using PureConsent or Ambiten.
        </p>
        <Link className='button dark' href='/docs'>
          Read the integration guide ↗
        </Link>
      </article>
    </main>
  )
}
