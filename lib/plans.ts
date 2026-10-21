export const PLANS = {
  free: { name: 'Free / Sandbox', price: 0, annual: 0, sites: 1, views: 1000, retention: 30, seats: 0, styling: false, languages: false, audit: false, description: 'For portfolios, staging, and a confident first step.' },
  starter: { name: 'Starter', price: 12, annual: 99, sites: 1, views: 25000, retention: 180, seats: 0, styling: true, languages: false, audit: false, description: 'A tailored privacy experience for your website.' },
  business: { name: 'Business Pro', price: 29, annual: 249, sites: 3, views: 100000, retention: 365, seats: 0, styling: true, languages: true, audit: true, description: 'Multilingual consent and encrypted audit exports.' },
  agency: { name: 'Agency / Studio', price: 69, annual: 599, sites: 15, views: 500000, retention: 365, seats: 5, styling: true, languages: true, audit: true, description: 'One workspace for your studio and its clients.' }
} as const;
export type Plan = keyof typeof PLANS;
export type Interval = 'month' | 'year';
export function effectivePlan(account: { plan: string; subscriptionStatus?: string; paidThrough?: number }): Plan {
  // Legacy USD Pro accounts require explicit migration; never silently charge a new price.
  const plan = account.plan === 'pro' ? 'starter' : account.plan;
  return plan in PLANS && ['active','trialing'].includes(account.subscriptionStatus || '') && (account.paidThrough || 0) > Date.now() ? plan as Plan : 'free';
}
export function priceId(plan: Plan, interval: Interval = 'month') { return plan === 'free' ? undefined : process.env[`STRIPE_PRICE_${plan.toUpperCase()}_${interval.toUpperCase()}`]; }
export function offerForPrice(id: string): { plan: Plan; interval: Interval } | null {
  for (const plan of ['starter','business','agency'] as const) for (const interval of ['month','year'] as const) if (id && id === priceId(plan, interval)) return {plan,interval};
  return null;
}
export function planForPrice(id: string) { return offerForPrice(id)?.plan || null; }
export function features(plan: Plan) { const p=PLANS[plan];return [`${p.views.toLocaleString('en-US')} monthly page views`,`${p.sites} ${p.sites===1?'domain':'domains'} · unlimited subpages`,p.styling?'Custom colors & brand fonts':'Standard banner layout',p.styling?'Remove widget branding':'PureConsent widget branding',...(p.languages?['Automatic DE / EN / FR interface','Provider-text translation drafts']:[]),...(p.audit?['Encrypted consent audit export']:[]),...(p.seats?[`${p.seats} client seats with assigned domains`]:[])]; }
