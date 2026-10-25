import Link from 'next/link'
import { Brand } from '@/components/brand'
export default function Docs () {
  return (
    <main className='document-page'>
      <nav>
        <Brand />
        <Link className='button outline compact' href='/dashboard'>
          Back to workspace ↗
        </Link>
      </nav>
      <article>
        <span className='eyebrow'>THE INTEGRATION GUIDE</span>
        <h1>
          Good privacy starts
          <br />
          with good setup.
        </h1>
        <p className='lead'>
          PureConsent controls scripts you explicitly mark as optional. Complete
          these steps on each website before inviting real visitors.
        </p>
        <h2 id="setup">01 · Create your workspace</h2><p>Create a free account, verify your email, and sign in. Choose a paid plan from Billing when you need more websites or longer retention.</p><h2>02 · Add your website</h2>
        <p>
          Open the workspace and choose “Add website”. Enter its exact HTTPS
          origin, privacy notice link, and descriptions of your actual
          providers. Subdomains and ports are distinct origins. Language
          detection changes the interface language only; it does not infer
          jurisdiction. Custom provider descriptions need your own translation.
        </p>
        <h2 id="domains">Verify your domain</h2><p>In Banner studio, copy the DNS TXT record for your domain. Add it with your DNS provider, then choose “Check DNS record”. Public banners are available only after ownership is verified. Localhost domains are automatically verified in development.</p><h2 id="installation">03 · Install the widget</h2>
        <p>
          Copy the snippet from Banner studio into the page head. Your
          PureConsent server must be publicly reachable over HTTPS for a live
          website.
        </p>
        <pre>{`<script src="https://YOUR-PURECONSENT-HOST/consent.js"\n  data-site="YOUR-SITE-ID" defer></script>`}</pre>
        <h2 id="script-controls">04 · Keep optional services inert</h2>
        <p>
          Replace optional script tags with <code>type="text/plain"</code> and
          an explicit category. Use <code>data-src</code> for external script
          URLs. Remove the original active tags and any duplicate installation
          through tag managers.
        </p>
        <pre>{`<!-- No request to this provider before analytics consent -->\n<script type="text/plain" data-consent="analytics"\n  data-src="https://YOUR-ANALYTICS-PROVIDER/script.js"></script>\n\n<script type="text/plain" data-consent="marketing">\n  // Initialize your advertising provider here.\n</script>`}</pre>
        <p>
          Only <code>analytics</code> and <code>marketing</code> are supported.
          The widget does not intercept ordinary scripts, images, iframes, tag
          managers, or server-side tracking. Gate those integrations separately.
          Keep dependent scripts in document order.
        </p>
        <h2>05 · Handle withdrawal</h2>
        <p>
          The privacy button reopens preferences on every page. On withdrawal,
          the widget saves the refusal and reloads the page when storage is
          available, preventing tagged scripts from restarting. Implement
          provider-specific cleanup to remove cookies, clear identifiers, stop
          SDKs, and notify vendors as needed. A reload cannot erase third-party
          data already sent.
        </p>
        <pre>{`window.addEventListener("pureconsent:change", (event) => {\n  const { analytics, marketing } = event.detail;\n  // Tell your providers about these choices.\n  // If false, stop tracking and remove provider storage.\n});\n\n// Link this to your own privacy settings button:\nwindow.PureConsent.open();\n// Or withdraw all optional consent:\nwindow.PureConsent.withdraw();`}</pre>
        <h2 id="testing">06 · Verify on your actual website</h2>
        <ul>
          <li>
            Use a clean browser profile and inspect network and storage before
            choosing.
          </li>
          <li>
            Reject optional services: no optional provider requests should be
            made.
          </li>
          <li>Allow one category: only that category’s scripts should run.</li>
          <li>
            Reload and confirm preferences persist. Change the notice version
            and confirm the banner returns.
          </li>
          <li>
            Withdraw and confirm provider cleanup, reload behavior, and a new
            consent record.
          </li>
          <li>
            Test keyboard access, mobile layouts, unavailable storage, and
            service outages.
          </li>
        </ul>
        <p>
          A service outage leaves correctly tagged optional scripts disabled. If
          recording a choice fails, the widget reports that failure and keeps a
          retryable record on the device. Already running scripts cannot be
          undone by this widget alone.
        </p>
        <h2 id="frameworks">Page views and single-page apps</h2><p>Each successful widget initialization records one page view, regardless of the visitor’s choice. We send a random page-view ID, with no page URL, IP address, or persistent visitor identifier in the usage record. Retried requests reuse the ID. Counts are approximate if requests are blocked or offline. Previews are excluded.</p><p>For Next.js, call <code>window.PureConsent?.trackPageView()</code> in a client-side effect after the pathname or search parameters change. Do not remount the widget on every route. Duplicate calls for the same current path are ignored.</p><pre>{`// Next.js client component, after usePathname()/useSearchParams() change
useEffect(() => {
  window.PureConsent?.trackPageView();
}, [pathname, searchParams]);`}</pre><p>In Webflow, add the snippet to the site’s head custom code and publish. In other SPA routers, call the same method after navigation. Do not pass customer data or URLs to this method.</p><h2>Translations and styling</h2><p>Starter and above can set colors, use an already-loaded brand font, and hide widget branding. Business Pro and Agency automatically select the DE, EN, or FR interface. Provider descriptions can be translated with DeepL and reviewed in Banner studio before saving, or entered manually. Custom descriptions are never translated on a visitor’s browser request.</p><h2 id="agency">Agency client seats</h2><p>The Agency owner can invite five verified client accounts and assign specific domains. Clients can edit and export only those domains. Revocation takes effect on the next API request. Downgrading suspends client access, while visitor consent controls remain available.</p><h2>Content Security Policy</h2>
        <p>
          Allow your PureConsent host in <code>script-src</code> and{' '}
          <code>connect-src</code>. The banner inserts an isolated shadow-root
          stylesheet; your policy must permit that styling. If you require
          script nonces, place the nonce on optional script templates; it is
          copied to the activated script. Test your exact CSP before launch.
        </p>
        <h2>What PureConsent includes</h2>
        <p>
          Customer accounts, verified domains, plan limits, subscriptions, DE/EN/FR controls by plan, explicit script gating, versioned records, retention, and exports of the latest 1,000 events. Automatic cookie scanning, vendor-specific cleanup, and AI-generated legal notices are not included.
        </p>
        <h2>Design references</h2>
        <p>
          The interface follows the principles discussed in the{' '}
          <a href='https://www.edpb.europa.eu/our-work-tools/our-documents/other/report-work-undertaken-cookie-banner-taskforce_en'>
            EDPB Cookie Banner Taskforce report
          </a>
          . Storage and access to information on devices can fall under{' '}
          <a href='https://www.gesetze-im-internet.de/ttdsg/__25.html'>
            §25 TDDDG
          </a>
          , including technologies other than cookies. Installation and
          site-specific legal review remain necessary; PureConsent does not
          certify compliance.
        </p>
      </article>
    </main>
  )
}
