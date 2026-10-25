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
    icons: {
      icon: [
        { url: '/brand/favicon-32.png', sizes: '32x32', type: 'image/png' },
        { url: '/brand/favicon-16.png', sizes: '16x16', type: 'image/png' }
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
