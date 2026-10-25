'use client'
import { createContext, useContext, type ReactNode } from 'react'
import { translator, type Locale } from '@/lib/i18n/shared'
const LocaleContext = createContext<Locale>('de')


export function LocaleProvider ({
  locale,
  children
}: {
  locale: Locale
  children: ReactNode
}) {
  return (
    <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
  )
}
export function useLocale () {
  return useContext(LocaleContext)
}
export function useTranslation () {
  return translator(useLocale())
}
