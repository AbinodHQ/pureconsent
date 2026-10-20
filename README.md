# PureConsent

A customer-facing consent management SaaS built by Abinod, using Ambiten for persistence. Includes verified email accounts, isolated customer workspaces, DNS domain verification, website configuration, EN/DE banners, tagged-script consent controls, versioned receipts, CSV export, plan limits, usage, and Stripe subscription integration.

## Run locally

Use Node.js 22.15 or newer.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open http://localhost:3100. Create an account and open the development verification link shown in the form. Local mode is single-process development only and stores data in `.data/saas-v2.json`. There is no authentication bypass. Never publish the local adapter or development email links.

## Production configuration

- `PURECONSENT_STORAGE=ambiten`, `MONGODB_URI`, `MONGODB_DB`.
- `APP_ORIGIN=https://your-service-host` (exact public application origin).
- `RESEND_API_KEY`, `EMAIL_FROM` with a verified sender domain.
- Stripe settings below when ready. No payment credentials are needed for free accounts.
- HTTPS, a supported Node runtime, backups with restore testing, uptime monitoring, restricted database access, and infrastructure log retention appropriate to your deployment.

Ambiten 1.3.0 is the database client. It currently enables directConnection internally, so use a compatible MongoDB endpoint. A local MongoDB 8 server has been integration-tested; Atlas/SRV or multi-node failover needs validation or an Ambiten client update before deployment. The v2 collections deliberately do not assign legacy single-operator data to customer accounts.

## Stripe setup (ready for credentials)

1. Create monthly USD recurring prices: Pro **$14**, Business **$39**. Put their IDs in `STRIPE_PRICE_PRO` and `STRIPE_PRICE_BUSINESS`. Server-side price validation requires these amounts and recurrence. Change `lib/plans.ts` and the matching Stripe prices together if pricing changes.
2. Set `STRIPE_SECRET_KEY`. Keep all keys server-side; no publishable key is needed for hosted Checkout.
3. Create a webhook at `https://your-service-host/api/billing/webhook`. Subscribe to `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, and `invoice.payment_failed`. Set its `STRIPE_WEBHOOK_SECRET`.
4. Configure the Stripe customer portal for payment updates, invoices, cancellation at period end, and switching only between the two PureConsent prices. Set your tax settings, business identity, and refund policy before accepting payments.
5. Test Checkout, portal upgrades/downgrades, failed payments, renewals, cancellation, webhook retries, and expired sessions using Stripe test mode, then switch keys, prices, and webhook secret together for live mode.

Checkout returns do not grant paid access. Signed events trigger a fresh subscription lookup from Stripe under a per-account database lease. Active/trialing subscriptions with an allowlisted price and future period end grant access. Duplicate events are ignored only after successful handling. Billing can be refreshed from the dashboard. Past-due/canceled/expired plans fall back to Free. Existing banners keep working; new website slots and new receipt retention follow the current plan. Existing receipts retain their original expiry.

Included monthly usage measures successful banner configuration requests, not unique visitors. Exceeding the allowance displays an upgrade prompt; there is no hard cutoff or automatic overage charge. Website quotas are enforced with unique database slot indexes. The Free plan is one website, 5,000 monthly requests and 30-day retention; Pro has 5 sites/100,000/180 days; Business 25 sites/1,000,000/365 days.

## Accounts and data

Passwords use salted scrypt. Session and one-time action tokens are stored hashed. Sessions last seven days; verification links 24 hours; recovery links one hour. Password changes revoke existing sessions. Mutation endpoints require same-origin requests. Authentication throttles are stored centrally through Ambiten; configure additional ingress/IP limits against public abuse.

Each website, receipt, session, and usage query is scoped to its customer owner. DNS TXT ownership is required before public configuration is served. Localhost is auto-verified only outside production. Deleting a website stops serving its widget but retains receipts until expiry. Account deletion requires a password and no ongoing subscription; it removes the workspace data and expires open checkout sessions. Stripe may retain legally required billing records.

Account exports and consent CSVs include the latest 1,000 retained events, explicitly labelled in the UI. Arrange a database-level export for larger archives. Retention TTL indexes delete expired documents asynchronously; application reads exclude expired data immediately. Backups need their own expiry policy.

## Widget integration

Read `/docs`. Install the widget, then mark every optional script with `type="text/plain" data-consent="analytics"` or `data-consent="marketing"`. External scripts use `data-src`, not `src`. Unmarked scripts, tag managers, embeds, cookies and already-running vendors are not automatically blocked or cleaned up. Test acceptance, refusal, custom choices, withdrawal, notice updates and provider cleanup on each website. Browser language selects interface text, not jurisdiction. Provider descriptions need your own translations.

## Validation

```powershell
npm test
npm run build
# Disposable database only:
$env:MONGODB_URI='mongodb://127.0.0.1:27028'
$env:MONGODB_DB='pureconsent_test_local'
npm run test:db
```

Tests cover account lifecycle, one-time tokens, session revocation, tenant isolation, quota concurrency, signature tampering/expiry, canonical subscription state, duplicate webhook events, receipt idempotency and widget failure behavior. Billing tests mock Stripe; actual payment acceptance needs test-mode credentials.

## Launch requirements

Set production email/database/Stripe configuration. Finalize the legal entity, contact details, privacy notice, terms, DPA/subprocessor information, tax and refund policies for the actual service operator before public launch. The supplied pages describe implemented behavior but cannot invent your legal identity or deployment details. PureConsent does not certify legal compliance. Automated scanning, IAB TCF, Google CMP certification, organization invitations/roles, and vendor-specific cleanup are not included.
