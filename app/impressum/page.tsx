import type { Metadata } from 'next'
import Link from 'next/link'
import { Brand } from '@/components/brand'
import { LanguageSwitcher } from '@/components/language-switcher'
import { getTranslator, getLocale } from '@/lib/i18n/server'
import { localeOrigins } from '@/lib/i18n/shared'


const VAT_ID = 'DE368457970'



export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator()
  const locale = await getLocale()
  const url = localeOrigins[locale] + '/impressum'
  return {
    title: t('Impressum') + ' | PureConsent',
    description: t('Legal provider information and contact details for PureConsent, a product operated by Abinod.'),
    alternates: { canonical: url, languages: { de: localeOrigins.de + '/impressum', en: localeOrigins.en + '/impressum' } },
    openGraph: { title: t('Impressum') + ' | PureConsent', description: t('Legal provider information and contact details for PureConsent, a product operated by Abinod.'), url, locale: locale === 'de' ? 'de_DE' : 'en_US' },
    twitter: { title: t('Impressum') + ' | PureConsent', description: t('Legal provider information and contact details for PureConsent, a product operated by Abinod.') }
  }
}

export default async function Impressum() {
	const t = await getTranslator()

	return (
		<main className='document-page'>
			<nav aria-label={t('Page navigation')}>
				<Brand />
				<LanguageSwitcher />

				<Link href='/privacy'>
					{t('Privacy Policy')}
				</Link>

				<Link href='/dashboard'>
					{t('Workspace ↗')}
				</Link>
			</nav>

			<article>
				<span className='eyebrow'>
					{t('LEGAL & PROVIDER INFORMATION')}
				</span>

				<h1>{t('Impressum')}</h1>

				<p className='lead'>
					{t(
						'Provider information for PureConsent in accordance with Section 5 of the German Digital Services Act (DDG).'
					)}
				</p>


				<h2>{t('Service provider')}</h2>

				<address style={{ fontStyle: 'normal' }}>
					<strong>Emmanuel Abiodun Nodolomwanyi</strong>
					<br />
					{t('Trading as Abinod')}
					<br />
					{t('Sole proprietorship (Einzelunternehmen)')}
					<br />
					Theodor-Otte-Straße 135
					<br />
					45897 Gelsenkirchen
					<br />
					{t('Germany')}
				</address>

				<h2>{t('Contact')}</h2>

				<p>
					{t('Email')}:{' '}
					<a href='mailto:contact@abinod.com'>
						contact@abinod.com
					</a>

					<br />

					{t('Online contact')}:{' '}
					<a href='https://www.abinod.com/contact/'>
						{t('Contact Abinod')}
					</a>
				</p>

				<p>
					{t(
						'For PureConsent account or privacy requests, you may also write to the address listed in the Privacy Policy.'
					)}
				</p>

				<h2>{t('VAT identification number')}</h2>

				<p>
					{t('VAT identification number pursuant to Section 27a of the German VAT Act (UStG)')}
					<br />
					<strong>{VAT_ID}</strong>
				</p>

				<h2>{t('About the service')}</h2>

				<p>
					{t(
						'PureConsent is a software product operated by Abinod. Abinod is the business name of the sole proprietor identified above; PureConsent is not a separate legal entity.'
					)}
				</p>

				<h2>
					{t('Privacy and data protection')}
				</h2>

				<p>
					{t(
						'Information about how PureConsent handles personal data is available in our'
					)}{' '}
					<Link href='/privacy'>
						{t('Privacy Policy')}
					</Link>.
				</p>

				<Link className='button dark' href='/docs'>
					{t('Read the integration guide ↗')}
				</Link>
			</article>
		</main>
	)
}
