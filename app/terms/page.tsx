import { LanguageSwitcher } from '@/components/language-switcher'
import { getTranslator } from '@/lib/i18n/server'
import Link from 'next/link'
import { Brand } from '@/components/brand'

export default async function Terms () {
  const t = await getTranslator()
  return (
    <main className='document-page'>
      <nav>
        <Brand />
        <LanguageSwitcher />
        <Link href='/'>{t('Home')}</Link>
      </nav>
      <article>
        <span className='eyebrow'>{t('SERVICE TERMS')}</span>
        <h1>{t('Clear expectations.')}</h1>
        <p className='lead'>
          {t(
            'PureConsent is a consent management service built by Abinod for website owners.'
          )}
        </p>
        <h2>{t('Your account and websites')}</h2>
        <p>
          {t(
            'Provide accurate account details, keep your credentials secure, and register only websites you are authorized to manage. You are responsible for your website’s notices, provider descriptions, lawful processing, and correct installation of optional scripts.'
          )}
        </p>
        <h2>{t('Subscriptions')}</h2>
        <p>
          {t(
            'The Free plan has no subscription fee. Paid plans renew monthly or yearly according to the interval selected at checkout, plus applicable taxes. Manage payment details and cancellation in the billing portal. Cancellation takes effect at the end of the current billing period unless checkout or mandatory law provides otherwise. No automatic overage fees are charged.'
          )}
        </p>
        <h2>{t('Plan changes')}</h2>
        <p>
          {t(
            'Monthly page-view allowances, domain limits, client seats, and retention depend on your plan. All plans allow unlimited subpages. Page-view allowances reset each calendar month in UTC, including annual subscriptions. Downgrading does not disable visitor choices on existing websites. New receipts follow the retention available on your current plan. Previously collected receipts retain their original expiry. Export records you need before they expire.'
          )}
        </p>
        <h2>{t('Responsible use')}</h2>
        <p>
          {t(
            'Do not misuse the service, bypass access controls, submit unlawful content, or disrupt other customers. PureConsent controls explicitly tagged optional scripts; it cannot identify every third-party service or guarantee a website’s legal compliance.'
          )}
        </p>
        <h2>{t('Availability and data')}</h2>
        <p>
          {t(
            'Keep backups of records needed for your business and test your installation regularly. Outages may delay consent receipts. The widget keeps tagged optional scripts inactive when configuration cannot load. The privacy notice explains account and consent data processing.'
          )}
        </p>
        <h2>{t('Questions and requests')}</h2>
        <p>
          {t('Contact the service operator at ')}
          <a href='mailto:abinod@online.de'>abinod@online.de</a>
          {t(
            ' for billing, account deletion, or data requests. Applicable mandatory consumer and data protection rights remain unaffected.'
          )}
        </p>
      </article>
    </main>
  )
}
