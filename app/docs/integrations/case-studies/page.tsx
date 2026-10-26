import Link from 'next/link'
import type { Metadata } from 'next'
import { Brand } from '@/components/brand'
import { LanguageSwitcher } from '@/components/language-switcher'
import { getLocale } from '@/lib/i18n/server'
export async function generateMetadata(): Promise<Metadata> {
 const de=(await getLocale())==='de';return {title:de?'Integrations-Fallstudien | PureConsent':'Integration Case Studies | PureConsent',description:de?'Technische Fallstudien mit Implementierung, Beobachtungen und Grenzen.':'Technical case studies with implementation details, observations and limitations.'}
}
export default async function CaseStudies(){const de=(await getLocale())==='de';return <main className='document-page'><nav><Brand/><LanguageSwitcher/><Link href='/docs'>{de?'Integrationsanleitung':'Integration guide'} ↗</Link></nav><article><p className='eyebrow'>{de?'INTEGRATIONEN':'INTEGRATIONS'}</p><h1>{de?'Fallstudien':'Case studies'}</h1><p className='lead'>{de?'Implementierungen im Produktivbetrieb: Was wurde eingebunden, was wurde beobachtet und wo liegen die Grenzen?':'Production implementations: what was integrated, what was observed, and where the limits are.'}</p><h2><Link href='/docs/integrations/case-studies/abinod-consent-gated-reviews'>{de?'Kundenbewertungen nach Einwilligung auf Abinod.de':'Consent-Gated Customer Reviews on Abinod.de'}</Link></h2><p>{de?'16 Seiten · PureConsent und VeriNodo · 26. Oktober 2026':'16 pages · PureConsent and VeriNodo · 26 October 2026'}</p><p>{de?'Eine Integration eigener Abinod-Produkte mit ausdrücklicher Skriptsteuerung, Widerruf, Browser-Speicher und Einwilligungsprotokoll.':'A first-party Abinod integration covering explicit script gating, withdrawal, browser storage and the consent ledger.'}</p></article></main>}
