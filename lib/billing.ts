import { localeForHost } from './i18n/shared'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { appOrigin } from './auth'
import {
  PLANS,
  priceId,
  planForPrice,
  type Plan,
  type Interval,
  offerForPrice
} from './plans'
import {
  accountById,
  accountByCustomer,
  updateAccount,
  eventProcessed,
  withLease,
  UserError,
  type Account
} from './store'


type Subscription = {
  id: string
  status: string
  cancel_at_period_end: boolean
  metadata?: Record<string, string>
  items: { data: { price: { id: string }; current_period_end?: number }[] }
  current_period_end?: number
}
export async function stripe<T> (
  path: string,
  body?: Record<string, string>,
  idempotency?: string
): Promise<T> {
  if (!process.env.STRIPE_SECRET_KEY)
    throw new UserError(
      'Billing is not available yet. Your free workspace remains available.',
      503
    )
  const r = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      ...(idempotency ? { 'Idempotency-Key': idempotency } : {})
    },
    body: body ? new URLSearchParams(body) : undefined,
    signal: AbortSignal.timeout(15000),
    cache: 'no-store'
  })
  if (!r.ok)
    throw new UserError(
      'Billing service could not complete the request. Please retry or contact support.',
      502
    )
  return r.json()
}
async function subscriptions (a: Account) {
  return a.stripeCustomerId
    ? (
        await stripe<{ data: Subscription[] }>(
          `subscriptions?customer=${encodeURIComponent(
            a.stripeCustomerId
          )}&status=all&limit=100`
        )
      ).data
    : []
}
export async function requireClosedBilling (a: Account) {
  if (
    (await subscriptions(a)).some(
      s => !['canceled', 'incomplete_expired'].includes(s.status)
    )
  )
    throw new UserError(
      'Cancel your subscription and wait until its billing period ends before deleting your account.',
      409
    )
  if (a.stripeCustomerId) {
    const sessions = await stripe<{ data: { id: string }[] }>(
      `checkout/sessions?customer=${encodeURIComponent(
        a.stripeCustomerId
      )}&status=open&limit=100`
    )
    for (const s of sessions.data)
      await stripe(`checkout/sessions/${encodeURIComponent(s.id)}/expire`, {})
  }
}
export async function syncBilling (id: string) {
  return withLease(`billing:${id}`, async () => {
    const a = await accountById(id)
    if (!a) throw new UserError('Account not found.', 404)
    const all = await subscriptions(a)
    const active = all
      .filter(
        s =>
          ['active', 'trialing'].includes(s.status) &&
          planForPrice(s.items.data[0]?.price.id)
      )
      .sort(
        (a, b) =>
          PLANS[planForPrice(b.items.data[0].price.id)!].price -
          PLANS[planForPrice(a.items.data[0].price.id)!].price
      )[0]
    const s =
      active ||
      all.find(s => !['canceled', 'incomplete_expired'].includes(s.status))
    return updateAccount(id, {
      plan: active ? planForPrice(active.items.data[0].price.id)! : 'free',
      billingInterval: active
        ? offerForPrice(active.items.data[0].price.id)?.interval
        : undefined,
      subscriptionId: s?.id || '',
      subscriptionStatus: s?.status || 'none',
      paidThrough: active
        ? (active.items.data[0].current_period_end ||
            active.current_period_end ||
            0) * 1000
        : 0,
      cancelAtPeriodEnd: s?.cancel_at_period_end || false,
      billingSyncedAt: Date.now()
    })
  })
}
export async function checkout (
  account: Account,
  plan: Plan,
  request: Request,
  interval: Interval = 'month'
) {
  if (plan === 'free' || !priceId(plan, interval))
    throw new UserError('This paid plan is not available yet.', 503)
  return withLease(`billing:${account.id}`, async () => {
    const a = (await accountById(account.id))!
    if (
      (await subscriptions(a)).some(
        s => !['canceled', 'incomplete_expired'].includes(s.status)
      )
    )
      throw new UserError(
        'Manage your existing subscription in the billing portal.',
        409
      )
    const price = await stripe<{
      active: boolean
      currency: string
      unit_amount: number
      recurring?: { interval: string; interval_count: number }
    }>(`prices/${encodeURIComponent(priceId(plan, interval)!)}`)
    if (
      !price.active ||
      price.currency !== 'eur' ||
      price.unit_amount !==
        (interval === 'year' ? PLANS[plan].annual : PLANS[plan].price) * 100 ||
      price.recurring?.interval !== interval ||
      price.recurring.interval_count !== 1
    )
      throw new UserError(
        'The billing price needs configuration. Please contact support.',
        503
      )
    let customer = a.stripeCustomerId
    if (!customer) {
      customer = (
        await stripe<{ id: string }>(
          'customers',
          {
            email: a.email,
            name: a.name,
            'metadata[pureconsent_account]': a.id
          },
          `pc-customer-${a.id}`
        )
      ).id
      await updateAccount(a.id, { stripeCustomerId: customer })
    }
    const sessions = await stripe<{
      data: {
        id: string
        status: string
        url: string
        metadata?: Record<string, string>
      }[]
    }>(
      `checkout/sessions?customer=${encodeURIComponent(
        customer
      )}&status=open&limit=100`
    )
    const pending = sessions.data.find(
      s => s.metadata?.pureconsent_account === a.id
    )
    if (pending && pending.metadata?.offer === `${plan}:${interval}`)
      return { url: pending.url }
    for (const s of sessions.data.filter(
      s => s.metadata?.pureconsent_account === a.id
    ))
      await stripe(`checkout/sessions/${encodeURIComponent(s.id)}/expire`, {})
    return stripe<{ url: string }>('checkout/sessions', {
      mode: 'subscription',
      locale: localeForHost(new URL(appOrigin(request)).host),
      // Use standard Stripe Billing regardless of the account's Managed Payments default.
      'managed_payments[enabled]': 'false',
      customer,
      'line_items[0][price]': priceId(plan, interval)!,
      'line_items[0][quantity]': '1',
      'metadata[pureconsent_account]': a.id,
      'metadata[offer]': `${plan}:${interval}`,
      'subscription_data[metadata][pureconsent_account]': a.id,
      success_url: `${appOrigin(request)}/dashboard?billing=success`,
      cancel_url: `${appOrigin(request)}/dashboard?billing=canceled`,
      billing_address_collection: 'required'
    })
  })
}
export async function portal (a: Account, request: Request) {
  if (!a.stripeCustomerId)
    throw new UserError('No billing account exists yet. Choose a plan first.')
  return stripe<{ url: string }>('billing_portal/sessions', {
    customer: a.stripeCustomerId,
    locale: localeForHost(new URL(appOrigin(request)).host),
    ...(process.env.STRIPE_PORTAL_CONFIGURATION_ID ? { configuration: process.env.STRIPE_PORTAL_CONFIGURATION_ID } : {}),
    return_url: `${appOrigin(request)}/dashboard`
  })
}
export function verifySignature (
  raw: string,
  header: string,
  secret: string,
  now = Date.now()
) {
  const parts = header.split(','),
    timestamp = parts.find(p => p.startsWith('t='))?.slice(2)
  if (
    !timestamp ||
    !/^\d+$/.test(timestamp) ||
    Math.abs(now / 1000 - Number(timestamp)) > 300
  )
    return false
  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.${raw}`)
    .digest()
  return parts
    .filter(p => p.startsWith('v1='))
    .some(
      p =>
        /^[a-f0-9]{64}$/.test(p.slice(3)) &&
        timingSafeEqual(expected, Buffer.from(p.slice(3), 'hex'))
    )
}
export async function webhook (raw: string, signature: string) {
  if (!process.env.STRIPE_WEBHOOK_SECRET)
    throw new UserError('Webhook not configured.', 503)
  if (!verifySignature(raw, signature, process.env.STRIPE_WEBHOOK_SECRET))
    throw new UserError('Invalid webhook signature.', 400)
  const event = JSON.parse(raw)
  if (typeof event.id !== 'string' || typeof event.type !== 'string')
    throw new UserError('Invalid event.')
  if (await eventProcessed(event.id)) return
  if (
    /^(customer\.subscription\.|checkout\.session\.completed|invoice\.(paid|payment_failed))/.test(
      event.type
    )
  ) {
    const customer = event.data?.object?.customer
    if (typeof customer === 'string') {
      const a = await accountByCustomer(customer)
      if (a) await syncBilling(a.id)
    }
  }
  await eventProcessed(event.id, true)
}
