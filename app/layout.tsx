import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { getLocale } from '@/lib/i18n/server'
import { localeOrigins } from '@/lib/i18n/shared'
import { LocaleProvider } from '@/components/locale-provider'
import './globals.css'
import './secure-shield.css'
import './languages.css'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale(),
    path = (await headers()).get('x-pc-pathname') || '/'
  return {
    title:
      locale === 'de'
        ? 'PureConsent — Mehr Raum für Vertrauen.'
        : 'PureConsent — Make room for trust.',
    description:
      locale === 'de'
        ? 'Klare Datenschutzentscheidungen, schlanke Integration und verschlüsselte Einwilligungsnachweise für deine Websites.'
        : 'Clear privacy choices, lightweight integration and encrypted consent records for your websites.',
    alternates: {
      canonical: localeOrigins[locale] + path,
      languages: {
        de: localeOrigins.de + path,
        en: localeOrigins.en + path,
        'x-default': localeOrigins.de + path
      }
    },
    openGraph: {
      type: 'website',
      siteName: 'PureConsent',
      url: localeOrigins[locale] + path,
      locale: locale === 'de' ? 'de_DE' : 'en_US',
      alternateLocale: locale === 'de' ? 'en_US' : 'de_DE',
      images: [{
        url: localeOrigins[locale] + '/brand/pureconsent-social.png',
        width: 1731,
        height: 909,
        type: 'image/png',
        alt: 'PureConsent — Clear choices. Lighter websites.'
      }]
    },
    twitter: {
      card: 'summary_large_image',
      images: [{
        url: localeOrigins[locale] + '/brand/pureconsent-social.png',
        alt: 'PureConsent — Clear choices. Lighter websites.'
      }]
    },
    icons: {
      icon: [
        { url: '/brand/icons/favicon-w-32x32.png', sizes: '32x32', type: 'image/png' },
        { url: '/brand/icons/favicon-w-16x16.png', sizes: '16x16', type: 'image/png' }
      ]
    },
    robots:
      path.startsWith('/dashboard') || path.startsWith('/auth')
        ? { index: false, follow: false }
        : undefined
  }
}
export default async function RootLayout ({
  children
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  return (
    <html lang={locale}>
      <body suppressHydrationWarning>
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  )
}
