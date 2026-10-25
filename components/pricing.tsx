'use client'
import { useTranslation, useLocale } from '@/components/locale-provider'

import Link from 'next/link'
import { useState } from 'react'
import { PLANS, features, type Plan, type Interval } from '@/lib/plans'

export function Pricing () {
  const t = useTranslation()
  const locale = useLocale()
  const [interval, setInterval] = useState<Interval>('month')
  return (
    <section id='pricing' className='pricing-section'>
      <div className='section-intro'>
        <span className='eyebrow'>{t('YOUR TRAFFIC. YOUR PLAN.')}</span>
        <h2>
          {t('Every page welcome.')}
          <br />
          {t('Pay for the views.')}
        </h2>
        <p>
          {t(
            'Unlimited subpages on every plan. One monthly page-view allowance shared across your domains. Prices in EUR, excluding applicable VAT.'
          )}
        </p>
      </div>
      <div
        className='segmented billing-toggle'
        aria-label={t('Billing interval')}
      >
        <button
          aria-pressed={interval === 'month'}
          className={interval === 'month' ? 'selected' : ''}
          onClick={() => setInterval('month')}
        >
          {t('Monthly')}
        </button>
        <button
          aria-pressed={interval === 'year'}
          className={interval === 'year' ? 'selected' : ''}
          onClick={() => setInterval('year')}
        >
          {t('Yearly · save up to 31%')}
        </button>
      </div>
      <div className='pricing-grid'>
        {Object.entries(PLANS).map(([key, p]) => (
          <article
            className={`panel pricing-card ${
              key === 'starter' ? 'featured' : ''
            }`}
            key={key}
          >
            <span className='eyebrow'>
              {key === 'starter'
                ? t('FOR GROWING WEBSITES')
                : key === 'agency'
                ? t('FOR YOUR CLIENTS')
                : t('BUILT FOR TRUST')}
            </span>
            <h3>{t(String(p.name))}</h3>
            <p>{t(String(p.description))}</p>
            <div className='price'>
              €{interval === 'year' ? p.annual : p.price}
              <small>
                /{' '}
                {interval === 'year' && key !== 'free' ? t('year') : t('month')}
              </small>
            </div>
            {interval === 'year' && key !== 'free' && (
              <small>
                €
                {(p.annual / 12).toLocaleString(locale, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
                {t(' / month equivalent, billed yearly')}
              </small>
            )}
            <ul>
              {features(key as Plan).map(item => (
                <li key={t(String(item))}>{t(String(item))}</li>
              ))}
            </ul>
            <Link
              className={`button ${
                key === 'starter' ? 'dark' : 'outline'
              } full`}
              href='/auth/signup'
            >
              {key === 'free' ? t('Start free') : `${t('Choose')} ${t(p.name)}`}
            </Link>
          </article>
        ))}
      </div>
      <p className='muted'>
        {t(
          'A page view is recorded when the installed widget initializes, whether or not the visitor accepts optional services. Single-page apps call our route-change hook. Previews are excluded. Allowances reset monthly in UTC, including on annual plans. Above your allowance, we ask you to upgrade; consent controls keep working and no overage fees are charged.'
        )}
      </p>
    </section>
  )
}
