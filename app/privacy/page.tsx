import type { Metadata } from 'next'
import { LanguageSwitcher } from '@/components/language-switcher'
import { getTranslator, getLocale } from '@/lib/i18n/server'
import { localeOrigins } from '@/lib/i18n/shared'
import Link from 'next/link'
import { Brand } from '@/components/brand'


export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator()
  const locale = await getLocale()
  const url = localeOrigins[locale] + '/privacy'
  return {
    title: t('Privacy Policy') + ' | PureConsent',
    description: t('How PureConsent processes account information, consent records and technical data.'),
    alternates: { canonical: url, languages: { de: localeOrigins.de + '/privacy', en: localeOrigins.en + '/privacy' } },
    openGraph: { title: t('Privacy Policy') + ' | PureConsent', description: t('How PureConsent processes account information, consent records and technical data.'), url, locale: locale === 'de' ? 'de_DE' : 'en_US' },
    twitter: { title: t('Privacy Policy') + ' | PureConsent', description: t('How PureConsent processes account information, consent records and technical data.') }
  }
}

export default async function Privacy() {
  const t = await getTranslator()

  return (
    <main className='document-page'>
      <nav aria-label={t('Site navigation')}>
        <Brand />
        <LanguageSwitcher />
        <Link href='/impressum'>{t('Impressum')}</Link>
        <Link href='/dashboard'>{t('Workspace ↗')} </Link>
      </nav>

      <article>
        <span className='eyebrow'>{t('PRIVACY & DATA PROTECTION')}</span>
        <h1>
          {t('Remember the choice.')}
          <br />
          {t('Respect the person.')}
        </h1>
        <p className='lead'>
          {t('This Privacy Policy explains how PureConsent, operated by Abinod, processes personal data in its website, customer workspace and consent-management service. It also explains the distinction between our own processing and processing performed on behalf of customer websites.')}
        </p>
        <p>
          <strong>{t('Last updated:')}</strong> {t('October 30, 2026')}
        </p>

        <h2>{t('1. Operator and contact')}</h2>
        <p>
          <strong>{t('Abinod')}</strong><br />
          {t('Emmanuel Abiodun Nodolomwanyi, sole proprietor')}<br />
          {t('Theodor-Otte-Straße 135')}<br />
          {t('45897 Gelsenkirchen, Germany')}
        </p>
        <p>
          {t('For privacy enquiries concerning PureConsent accounts or Abinod’s own processing, contact ')}
          <a href='mailto:contact@abinod.com'>contact@abinod.com</a>.
          {' '}{t('Additional legal provider information is available in our ')}
          <Link href='/impressum'>{t('Impressum')}</Link>.
        </p>

        <h2>{t('2. Who determines the purposes of processing?')}</h2>
        <p>
          {t('For PureConsent accounts, subscriptions, customer communication and the operation of this website, Abinod generally acts as the data controller. For consent records submitted from a customer’s website, the website operator generally decides which technologies are used and for what purposes. In that context, PureConsent processes the records on behalf of the operator under the applicable service and data-processing arrangements.')}
        </p>
        <p>
          {t('If you encountered the PureConsent widget on another website, consult that website’s privacy notice and contact its operator about its tracking technologies or consent choices. The operator is responsible for the purposes of processing on its website.')}
        </p>

        <h2>{t('3. Customer accounts and workspace access')}</h2>
        <p>
          {t('When you register or use a workspace, we process your name, email address, workspace information, password hash, account status and subscription status. This is necessary to create and secure your account, provide the requested service, manage access and administer your contractual relationship (Article 6(1)(b) GDPR). Necessary technical security measures and abuse prevention may additionally rely on our legitimate interests (Article 6(1)(f) GDPR).')}
        </p>
        <p>
          {t('The essential HTTP-only session cookie lasts seven days. Verification links expire after 24 hours and password-recovery links after one hour. Password changes revoke existing sessions. Website data is scoped to the relevant account.')}
        </p>
        <p>
          {t('Account information required for registration and authentication must be provided to use a workspace; you can browse public information without creating an account. Other information is provided only where the corresponding feature is used.')}
        </p>

        <h2>{t('4. Consent preferences on a visitor’s device')}</h2>
        <p>
          {t('The PureConsent widget uses first-party local storage to remember category preferences, a site-specific random consent ID, the notice version and an expiry of 180 days. If a consent receipt could not be submitted, the failed submission is retained locally for retry. The widget does not create tracking cookies or fingerprint visitors as part of this consent-storage functionality.')}
        </p>
        <p>
          {t('Local storage is access to information on a visitor’s device and must be addressed by the deploying website operator under applicable law, including Section 25 TDDDG in Germany. The operator must assess which storage or access operations require consent or qualify for a statutory exception.')}
        </p>

        <h2>{t('5. Consent records stored for customer websites')}</h2>
        <p>
          {t('Consent payloads are encrypted using AES-256-GCM before database persistence. Metadata required for ownership, retrieval and expiry remains readable. Each record can contain a random event ID, site-specific consent ID, website ID, category choices, the action taken, interface language, notice version, notice snapshot and server receipt timestamp.')}
        </p>
        <p>
          {t('Consent IDs are pseudonymous, not anonymous. The application’s consent records do not include visitors’ IP addresses, user agents, visited URLs or geographic locations. This does not mean the underlying infrastructure never processes technical request information; hosting and security logs may process IP addresses or other request metadata separately.')}
        </p>
        <p>
          {t('The customer website determines the purposes and legal bases for its use of consent management and any optional third-party technologies. PureConsent does not determine the legal basis for the customer’s analytics, advertising or embedded services.')}
        </p>

        <h2>{t('6. Retention and deletion')}</h2>
        <p>
          {t('Website owners choose a retention period of 30 to 365 days for new consent records. Ambiten provides the runtime integration with MongoDB. A TTL index removes expired records asynchronously, and the application excludes expired records from queries. Changing the retention setting affects new records only. In local development, expired records are filtered on access and removed on a subsequent write.')}
        </p>
        <p>
          {t('Monthly usage processing stores random page-view IDs, domain and workspace IDs, and the UTC month for usage counting and retry deduplication. Usage IDs expire at the start of the second calendar month following their recorded month. These usage records do not store page URLs, IP addresses or persistent visitor identifiers.')}
        </p>
        <p>
          {t('Account and workspace information is retained while needed to provide the service and is removed through the account-deletion process described below, subject to applicable legal obligations. Financial records may be retained for statutory accounting and tax periods. The retention of infrastructure logs, backups and other operational records depends on the applicable providers and configuration.')}
        </p>

        <h2>{t('7. Payments, messages and service providers')}</h2>
        <p>
          {t('Stripe is used to process payments and manage billing when a paid subscription is purchased. PureConsent does not store payment-card details. Billing processing supports the contractual relationship (Article 6(1)(b) GDPR) and, where applicable, accounting and tax obligations (Article 6(1)(c) GDPR).')}
        </p>
        <p>
          {t('Resend delivers account emails where configured, including verification and recovery messages. These communications are necessary to operate and secure the requested account service. Infrastructure and database service providers support website delivery, application operation, persistence, diagnostics and security. Those providers may process technical request information in their own logs.')}
        </p>
        <p>
          {t('PureConsent uses Ambiten as its application runtime for MongoDB integration. Ambiten is software within our application stack, not a separate third-party recipient merely because the runtime is used.')}
        </p>

        <h2>{t('8. Client access and optional translation')}</h2>
        <p>
          {t('Agency invitations store a client email address, assigned domains and a hashed one-time invitation token. Invitations expire after seven days and workspace owners can revoke access. These functions support the customer’s requested workspace collaboration.')}
        </p>
        <p>
          {t('If a customer requests automatic translation, only their analytics and marketing category descriptions are sent to DeepL for that task. Visitor consent records are not submitted for translation. This optional processing is performed to provide the requested translation feature.')}
        </p>

        <h2>{t('9. Hosting, database infrastructure and international processing')}</h2>

        <h3>{t('Application hosting — Vercel')}</h3>
        <p>
          {t('The PureConsent website and Next.js application are deployed on Vercel. Vercel supplies the infrastructure used to deliver pages, handle application requests, execute server-side functions, and support service availability and security. In providing these services, Vercel and its subprocessors may process technical request information such as IP addresses, request times, browser or device details, and diagnostic or security data.')}
        </p>
        <p>
          {t('Vercel functions can run in different deployment regions, and Vercel may also process data internationally as part of its operations. Using Vercel does not establish that all technical processing takes place in Germany or within the European Economic Area.')}
        </p>

        <h3>{t('Database hosting — MongoDB Atlas')}</h3>
        <p>
          {t('PureConsent uses MongoDB Atlas as its managed database service. The application accesses MongoDB through Ambiten. Depending on the feature used, the database holds customer accounts, workspace and website settings, subscription-related information, and consent records. Consent payloads are encrypted as described above, while the metadata needed for ownership, retrieval and expiry remains readable.')}
        </p>
        <p>
          {t('PureConsent’s production MongoDB Atlas cluster is configured in the AWS Frankfurt region (eu-central-1), Germany. This identifies the primary database deployment region; it does not establish that backups, support access, logs or all associated service processing are limited to Germany. Any applicable cross-border processing depends on the configured Atlas services and the provider’s processing arrangements.')}
        </p>

        <h3>{t('Data processing arrangements and transfers')}</h3>
        <p>
          {t('Vercel and MongoDB provide data processing terms addressing their respective services. Depending on actual configurations and subprocessors, personal data may be processed outside the European Economic Area. Where applicable, such transfers must be supported by a valid legal mechanism, such as an adequacy decision or appropriate contractual safeguards. The relevant arrangements are assessed against the services and account plans actually used.')}
        </p>
        <p>
          {t('Provider information: ')}
          <a href='https://vercel.com/legal/dpa' target='_blank' rel='noopener noreferrer'>
            {t('Vercel Data Processing Addendum')}
          </a>
          {' · '}
          <a href='https://www.mongodb.com/legal/data-processing-agreement' target='_blank' rel='noopener noreferrer'>
            {t('MongoDB Data Processing Agreement')}
          </a>.
        </p>
        {/* BEFORE PUBLICATION: confirm actual Vercel function/deployment region; verify
            Atlas backup/service configuration, log and backup retention, DPA coverage
            on current plans, and international access/subprocessor transfers. */}

        <h2>{t('10. Your rights and choices')}</h2>
        <p>
          {t('Subject to the applicable legal requirements, you may request access, rectification, erasure, restriction of processing and data portability, and object to processing based on legitimate interests. Where processing is based on your consent, you may withdraw consent at any time without affecting processing that occurred lawfully beforehand.')}
        </p>
        <p>
          {t('You can export your profile and the most recent 1,000 retained consent receipts through your account, or export the consent ledger as CSV. You can request account deletion after an active paid subscription has ended. Deletion removes the account’s websites, sessions and consent receipts; external payment providers may retain records as required for their own legal obligations.')}
        </p>
        <p>
          {t('To exercise rights regarding an account or other processing controlled by Abinod, write to ')}
          <a href='mailto:abinod@online.de'>abinod@online.de</a>.
          {' '}{t('For a consent choice made on another website, contact that website’s operator first. You can also complain to a competent data protection supervisory authority; for Abinod in North Rhine-Westphalia, this is generally the ')}
          <a href='https://www.ldi.nrw.de/' target='_blank' rel='noopener noreferrer'>
            {t('Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen (LDI NRW)')}
          </a>.
        </p>

        <h2>{t('11. Changes to this policy')}</h2>
        <p>
          {t('We update this policy if our actual processing, service providers, features or applicable requirements change. The revision date appears at the top of this page.')}
        </p>

        <Link className='button dark' href='/docs'>
          {t('Read the integration guide ↗')}
        </Link>
      </article>
    </main>
  )
}



// import { LanguageSwitcher } from '@/components/language-switcher'
// import { getTranslator } from '@/lib/i18n/server'
// import Link from 'next/link'
// import { Brand } from '@/components/brand'


// export default async function Privacy () {
//   const t = await getTranslator()
//   return (
//     <main className='document-page'>
//       <nav>
//         <Brand />
//         <LanguageSwitcher />
//         <Link href='/dashboard'>{t('Workspace ↗')}</Link>
//       </nav>
//       <article>
//         <span className='eyebrow'>{t('PRIVACY & STORAGE')}</span>
//         <h1>
//           {t(' Remember the choice. ')}
//           <br />
//           {t(' Respect the person. ')}
//         </h1>
//         <p className='lead'>
//           {t(
//             ' This page describes the initial implementation. It is not a substitute for the deploying operator’s privacy notice. '
//           )}
//         </p>
//         <h2>{t('On a visitor’s device')}</h2>
//         <p>
//           {t(
//             ' The widget uses first-party local storage to remember category preferences, a site-specific random consent ID, the notice version, and an expiry of 180 days. A failed receipt submission is retained for retry. It creates no tracking cookies and does not fingerprint visitors. Local storage is still device storage and must be described in your privacy notice. '
//           )}
//         </p>
//         <h2>{t('In the database')}</h2>
//         <p>
//           {t(
//             ' New consent payloads are encrypted with AES-256-GCM before persistence. The metadata needed for ownership, retrieval, and expiry remains readable. Each choice stores a random event ID, site-specific consent ID, website ID, categories, action, interface language, notice version, notice snapshot, and the server receipt timestamp. The consent ID is pseudonymous, not anonymous. Application records do not include IP addresses, user agents, URLs visited, or geographic location. '
//           )}
//         </p>
//         <h2>{t('Retention')}</h2>
//         <p>
//           {t(
//             ' Website owners select 30–365 days for new records. Ambiten connects to MongoDB, where a TTL index removes expired records asynchronously. Expired records are excluded from application queries. Changing retention affects new events only. Local development filters expired records on access and removes them on the next write. '
//           )}
//         </p>
//         <h2>{t('Customer accounts')}</h2>
//         <p>
//           {t(
//             'We store your name, email, workspace, password hash, and subscription status. The essential HTTP-only session cookie lasts seven days. Verification links expire after 24 hours; recovery links after one hour. Password changes revoke existing sessions. Your website data is scoped to your account.'
//           )}
//         </p>
//         <h2>{t('Service providers')}</h2>
//         <p>
//           {t(
//             'Ambiten provides the database integration with MongoDB. Resend delivers account emails when configured. Stripe processes payments and billing; card details are not stored by PureConsent. Infrastructure providers may process request metadata in their access logs. Monthly usage records random page-view IDs, domain and workspace IDs, and the UTC month. No page URL, IP address, or persistent visitor identifier is stored with usage. IDs expire at the start of the second following calendar month, so retries can be deduplicated.'
//           )}
//         </p>
//         <h2>{t('Client access and translation')}</h2>
//         <p>
//           {t(
//             'Agency invitations store the client email, assigned domains, and a hashed one-time invitation token. Invitations expire after seven days. Owners can revoke access. If a customer requests automatic translation, only their analytics and marketing descriptions are sent to DeepL; visitor consent records are not sent for translation.'
//           )}
//         </p>
//         <h2>{t('Your controls')}</h2>
//         <p>
//           {t(
//             'Export your profile and the latest 1,000 retained receipts from Account, or export the consent ledger as CSV. You can delete your account after any paid subscription has ended. Account deletion removes its websites, sessions, and receipts; payment providers may retain financial records under their own policies.'
//           )}
//         </p>
//         <h2>{t('Contact and requests')}</h2>
//         <p>
//           {t(
//             'PureConsent is operated by Abinod. For account, privacy, or data requests, contact '
//           )}
//           <a href='mailto:abinod@online.de'>abinod@online.de</a>
//           {t(
//             '. For choices submitted on another website, contact that website’s owner first; they determine the purposes and providers used on their site. Hosting in Germany is not implied by using PureConsent or Ambiten.'
//           )}
//         </p>
//         <Link className='button dark' href='/docs'>
//           {t(' Read the integration guide ↗ ')}
//         </Link>
//       </article>
//     </main>
//   )
// }
