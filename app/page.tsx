import { LanguageSwitcher } from '@/components/language-switcher'
import { getLocale, getTranslator } from '@/lib/i18n/server'
import { SiteFooter } from '@/components/site-footer'
import './footer.css'
import { Pricing } from "@/components/pricing";
import Link from 'next/link'
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  Code2,
  Fingerprint,
  Leaf,
  ShieldCheck
} from 'lucide-react'
import { Brand } from '@/components/brand'
import { cookies } from 'next/headers'
import { cookieName, legacyCookieName, hashToken } from '@/lib/auth'
import { sessionAccount } from '@/lib/store'


export default async function Home () {
 const t=await getTranslator(); const locale=await getLocale();
  const session = (await cookies()).get(cookieName)?.value || (await cookies()).get(legacyCookieName)?.value
  const account = session ? await sessionAccount(hashToken(session)) : null
  return (
    <>
    <main className='landing' id='top'>
      <nav className='landing-nav'>
        <Brand />
        <div><LanguageSwitcher /><a href='#how'>{t("How it works")}</a><a href='#pricing'>{t("Pricing")}</a>
          <Link href='/docs'>{t("Documentation")}</Link>
          <Link className='button dark compact' href={account ? '/dashboard' : '/auth/login'}>
            {account ? t('Dashboard') : t('Sign in')} <ArrowUpRight size={15} />
          </Link>
        </div>
      </nav>
      <section className='hero'>
        <div className='hero-copy'>
          <div className='eyebrow'>
            <span className='live-dot' />{t(" Lightweight consent management for modern websites. ")}</div>
          <h1>{t(" Make room ")}<br />{t(" for ")}<em>{t("trust.")}</em>
          </h1>
          <p>{t(" Give visitors clear privacy choices, control optional scripts, and manage consent records without unnecessary complexity. ")}</p>
          <div className='hero-actions'>
            <Link href='/auth/signup' className='button dark'>{t(" Build your first banner ")}<ArrowRight size={17} />
            </Link>
            <Link href='/docs' className='text-link'>{t(" Explore the integration ")}<ArrowUpRight size={15} />
            </Link>
          </div>
          <div className='hero-notes'>
            <span>
              <Check size={14} />{t(" No tracking cookies from our widget ")}</span>
            <span>
              <Check size={14} />{t(" DE / EN / FR on Business Pro ")}</span>
          </div>
        </div>
        <div className='hero-preview'>
          <div className='browser-top'>
            <span />
            <span />
            <span />
            <small>{t("YOUR WEBSITE, WITH A LITTLE MORE TRUST")}</small>
          </div>
          <iframe title={t('Try the PureConsent banner')} src={`/demo.html?language=${locale}`} />
          <div className='preview-caption'>
            <span className='live-dot' />{t(" A real, interactive preview. Go ahead, make a choice. ")}</div>
        </div>
      </section>
      <div className='ecosystem'>
        <span>{t("AN ABINOD PRODUCT")}</span>
        <div>{t(" Built with care. ")}<span>{t(" Powered by ")}<strong>Ambiten ↗</strong>
          </span>
        </div>
        <Leaf size={22} strokeWidth={1.2} />
      </div>
      <section id='how' className='how'>
        <div className='section-intro'>
          <span className='eyebrow'>{t("LESS FRICTION. MORE CLARITY.")}</span>
          <h2>{t(" Small footprint. ")}<br />{t(" Meaningful choices. ")}</h2>
          <p>{t(" A focused toolkit for businesses that want to treat privacy as part of the experience. ")}</p>
        </div>
        <div className='feature-list'>
          <article>
            <Code2 />
            <div>
              <h3>{t("One small script. A considered experience.")}</h3>
              <p>{t(" Add the widget and tag optional scripts by category. They stay inactive until a visitor opts in. ")}</p>
            </div>
            <span>01</span>
          </article>
          <article>
            <Fingerprint />
            <div>
              <h3>{t("A choice that stays theirs.")}</h3>
              <p>{t(" Equal accept and reject options, category controls, and a persistent privacy button. No preselected optional services. ")}</p>
            </div>
            <span>02</span>
          </article>
          <article>
            <ShieldCheck />
            <div>
              <h3>{t("Keep a record, not a profile.")}</h3>
              <p>{t(" Store choices and the notice version through Ambiten. No IP addresses or browsing histories in consent records. ")}</p>
            </div>
            <span>03</span>
          </article>
        </div>
      </section>
      <section className="uvp-grid"><article><Code2/><h3>{t("Made for your stack.")}</h3><p>{t("Next.js, Webflow, and custom websites. One dependency-free widget, with an explicit route-change hook for single-page apps.")}</p></article><article><Leaf/><h3>{t("Keep your pages light.")}</h3><p>{t("Deferred loading, no runtime framework, and no third-party font requests. Designed to stay out of your page layout.")}</p></article><article><ShieldCheck/><h3>{t("Control your data location.")}</h3><p>{t("Deploy the app and Ambiten-backed database in Germany or another EU region. Your chosen hosting and service providers determine data residency.")}</p></article></section><Pricing/><section className="launch-note"><span className="eyebrow">{t("PRIVACY THAT FITS YOUR BUSINESS")}</span><h2>{t("A better first impression.")}<br/>{t("One website at a time.")}</h2><p>{t("Give visitors a clear choice. Keep your websites and consent records in one focused workspace.")}</p><Link href="/auth/signup" className="button dark">{t("Create your free workspace ")}<ArrowRight size={16}/></Link></section>
    </main>
    <SiteFooter />
    </>
  )
}
