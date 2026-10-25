import { headers, cookies } from 'next/headers'
import { localeForHost, translator, type Locale } from './shared'
export async function getLocale (): Promise<Locale> {
  const h = await headers()
  const host = h.get('host') || ''
  if (
    process.env.NODE_ENV !== 'production' &&
    /^(localhost|127\.0\.0\.1)(:|$)/.test(host)
  ) {
    return (await cookies()).get('pc_locale')?.value === 'en' ? 'en' : 'de'
  }
  return localeForHost(host)
}
export async function getTranslator () {
  return translator(await getLocale())
}
