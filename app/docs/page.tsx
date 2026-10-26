import { LanguageSwitcher } from '@/components/language-switcher'
import { getTranslator } from '@/lib/i18n/server'
import Link from 'next/link'
import { Brand } from '@/components/brand'

export default async function Docs () {
  const t = await getTranslator()
  return (
    <main className='document-page'>
      <nav>
        <Brand />
        <LanguageSwitcher />
        <Link className='button outline compact' href='/dashboard'>
          {t(' Back to workspace ↗ ')}
        </Link>
      </nav>
      <article>
        <span className='eyebrow'>{t('THE INTEGRATION GUIDE')}</span>
        <h1>
          {t(' Good privacy starts ')}
          <br />
          {t(' with good setup. ')}
        </h1>
        <p className='lead'>
          {t(
            ' PureConsent controls scripts you explicitly mark as optional. Complete these steps on each website before inviting real visitors. '
          )}
        </p>
        <section id='integrations'>
          <h2>{t('Integrations and case studies')}</h2>
          <p>{t('See how explicit script gating works on a production website, including verification evidence and limitations.')}</p>
          <p><Link href='/docs/integrations/case-studies/abinod-consent-gated-reviews'>{t('Consent-Gated Customer Reviews on Abinod.de')} ↗</Link></p>
          <p><Link href='/docs/integrations/case-studies'>{t('All integration case studies')}</Link></p>
        </section>
        <h2 id='setup'>{t('01 · Create your workspace')}</h2>
        <p>
          {t(
            'Create a free account, verify your email, and sign in. Choose a paid plan from Billing when you need more websites or longer retention.'
          )}
        </p>
        <h2>{t('02 · Add your website')}</h2>
        <p>
          {t(
            ' Open the workspace and choose “Add website”. Enter its exact HTTPS origin, privacy notice link, and descriptions of your actual providers. Subdomains and ports are distinct origins. Language detection changes the interface language only; it does not infer jurisdiction. Custom provider descriptions need your own translation. '
          )}
        </p>
        <h2 id='domains'>{t('Verify your domain')}</h2>
        <p>
          {t(
            'In Banner studio, copy the DNS TXT record for your domain. Add it with your DNS provider, then choose “Check DNS record”. Public banners are available only after ownership is verified. Localhost domains are automatically verified in development.'
          )}
        </p>
        <h2 id='installation'>{t('03 · Install the widget')}</h2>
        <p>
          {t(
            ' Copy the snippet from Banner studio into the page head. Your PureConsent server must be publicly reachable over HTTPS for a live website. '
          )}
        </p>
        <pre>{`<script src="https://YOUR-PURECONSENT-HOST/consent.js"\n  data-site="YOUR-SITE-ID" defer></script>`}</pre>
        <h2 id='script-controls'>{t('04 · Keep optional services inert')}</h2>
        <p>
          {t(' Replace optional script tags with ')}
          <code>type="text/plain"</code>
          {t(' and an explicit category. Use ')}
          <code>data-src</code>
          {t(
            ' for external script URLs. Remove the original active tags and any duplicate installation through tag managers. '
          )}
        </p>
        <pre>{`<!-- No request to this provider before analytics consent -->\n<script type="text/plain" data-consent="analytics"\n  data-src="https://YOUR-ANALYTICS-PROVIDER/script.js"></script>\n\n<script type="text/plain" data-consent="marketing">\n  // Initialize your advertising provider here.\n</script>`}</pre>
        <p>
          {t(' Only ')}
          <code>analytics</code>
          {t(' and ')}
          <code>marketing</code>
          {t(
            ' are supported. The widget does not intercept ordinary scripts, images, iframes, tag managers, or server-side tracking. Gate those integrations separately. Keep dependent scripts in document order. '
          )}
        </p>
        <h2>{t('05 · Handle withdrawal')}</h2>
        <p>
          {t(
            ' The privacy button reopens preferences on every page. On withdrawal, the widget saves the refusal and reloads the page when storage is available, preventing tagged scripts from restarting. Implement provider-specific cleanup to remove cookies, clear identifiers, stop SDKs, and notify vendors as needed. A reload cannot erase third-party data already sent. '
          )}
        </p>
        <pre>{`window.addEventListener("pureconsent:change", (event) => {\n  const { analytics, marketing } = event.detail;\n  // Tell your providers about these choices.\n  // If false, stop tracking and remove provider storage.\n});\n\n// Link this to your own privacy settings button:\nwindow.PureConsent.open();\n// Or withdraw all optional consent:\nwindow.PureConsent.withdraw();`}</pre>
        <h2 id='testing'>{t('06 · Verify on your actual website')}</h2>
        <ul>
          <li>
            {t(
              ' Use a clean browser profile and inspect network and storage before choosing. '
            )}
          </li>
          <li>
            {t(
              ' Reject optional services: no optional provider requests should be made. '
            )}
          </li>
          <li>
            {t('Allow one category: only that category’s scripts should run.')}
          </li>
          <li>
            {t(
              ' Reload and confirm preferences persist. Change the notice version and confirm the banner returns. '
            )}
          </li>
          <li>
            {t(
              ' Withdraw and confirm provider cleanup, reload behavior, and a new consent record. '
            )}
          </li>
          <li>
            {t(
              ' Test keyboard access, mobile layouts, unavailable storage, and service outages. '
            )}
          </li>
        </ul>
        <p>
          {t(
            ' A service outage leaves correctly tagged optional scripts disabled. If recording a choice fails, the widget reports that failure and keeps a retryable record on the device. Already running scripts cannot be undone by this widget alone. '
          )}
        </p>
        <h2 id='frameworks'>{t('Page views and single-page apps')}</h2>
        <p>
          {t(
            'Each successful widget initialization records one page view, regardless of the visitor’s choice. We send a random page-view ID, with no page URL, IP address, or persistent visitor identifier in the usage record. Retried requests reuse the ID. Counts are approximate if requests are blocked or offline. Previews are excluded.'
          )}
        </p>
        <p>
          {t('For Next.js, call ')}
          <code>window.PureConsent?.trackPageView()</code>
          {t(
            ' in a client-side effect after the pathname or search parameters change. Do not remount the widget on every route. Duplicate calls for the same current path are ignored.'
          )}
        </p>
        <pre>{`// Next.js client component, after usePathname()/useSearchParams() change
useEffect(() => {
  window.PureConsent?.trackPageView();
}, [pathname, searchParams]);`}</pre>
        <p>
          {t(
            'In Webflow, add the snippet to the site’s head custom code and publish. In other SPA routers, call the same method after navigation. Do not pass customer data or URLs to this method.'
          )}
        </p>
        <h2>{t('Translations and styling')}</h2>
        <p>
          {t(
            'Starter and above can set colors, use an already-loaded brand font, and hide widget branding. Business Pro and Agency automatically select the DE, EN, or FR interface. Provider descriptions can be translated with DeepL and reviewed in Banner studio before saving, or entered manually. Custom descriptions are never translated on a visitor’s browser request.'
          )}
        </p>
        <h2 id='agency'>{t('Agency client seats')}</h2>
        <p>
          {t(
            'The Agency owner can invite five verified client accounts and assign specific domains. Clients can edit and export only those domains. Revocation takes effect on the next API request. Downgrading suspends client access, while visitor consent controls remain available.'
          )}
        </p>
        <h2>{t('Content Security Policy')}</h2>
        <p>
          {t(' Allow your PureConsent host in ')}
          <code>script-src</code>
          {t(' and')} <code>connect-src</code>
          {t(
            '. The banner inserts an isolated shadow-root stylesheet; your policy must permit that styling. If you require script nonces, place the nonce on optional script templates; it is copied to the activated script. Test your exact CSP before launch. '
          )}
        </p>
        <h2>{t('What PureConsent includes')}</h2>
        <p>
          {t(
            ' Customer accounts, verified domains, plan limits, subscriptions, DE/EN/FR controls by plan, explicit script gating, versioned records, retention, and exports of the latest 1,000 events. Automatic cookie scanning, vendor-specific cleanup, and AI-generated legal notices are not included. '
          )}
        </p>
        <h2>{t('Design references')}</h2>
        <p>
          {t(' The interface follows the principles discussed in the')}{' '}
          <a href='https://www.edpb.europa.eu/our-work-tools/our-documents/other/report-work-undertaken-cookie-banner-taskforce_en'>
            {t(' EDPB Cookie Banner Taskforce report ')}
          </a>
          {t(' . Storage and access to information on devices can fall under')}{' '}
          <a href='https://www.gesetze-im-internet.de/ttdsg/__25.html'>
            §25 TDDDG
          </a>
          {t(
            ' , including technologies other than cookies. Installation and site-specific legal review remain necessary; PureConsent does not certify compliance. '
          )}
        </p>
      </article>
    </main>
  )
}
