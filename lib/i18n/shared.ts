import german from './de.json'
export type Locale = 'de' | 'en'
export const localeOrigins = {
  de: 'https://pureconsent.de',
  en: 'https://com.pureconsent.de'
} as const
export function localeForHost (host: string | null): Locale {
  return host?.toLowerCase().split(':')[0] === 'com.pureconsent.de'
    ? 'en'
    : 'de'
}
export function translator (locale: Locale) {
  return (text: string): string => {
    if (locale === 'en') return text
    const key = text.replace(/\s+/g, ' ').trim()
    const translated = (german as Record<string, string>)[key]
    return translated ? text.replace(/\S[\s\S]*\S|\S/, translated) : text
  }
}
