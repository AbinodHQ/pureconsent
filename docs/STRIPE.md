# Stripe billing

No Stripe account changes are required to run the Free plan. Configure Sandbox first, then independently create live prices and replace all keys/IDs together.

| Plan | Monthly EUR | Annual EUR | Environment prefix |
| --- | ---: | ---: | --- |
| Starter | 12 | 99 | STRIPE_PRICE_STARTER |
| Business Pro | 29 | 249 | STRIPE_PRICE_BUSINESS |
| Agency / Studio | 69 | 599 | STRIPE_PRICE_AGENCY |

Create six recurring prices, using one-month or one-year recurrence. Set each prefix with `_MONTH` and `_YEAR` suffixes in server environment. Amounts are 1200/9900, 2900/24900 and 6900/59900 euro cents. Checkout validates currency, amount and recurrence against the code.

Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. Hosted Checkout needs no browser publishable key. Configure `/api/billing/webhook` for checkout.session.completed, customer.subscription.created/updated/deleted, invoice.paid and invoice.payment_failed. Configure the customer portal for invoices, payment methods, cancellation and the six allowed prices. Set operator identity, tax treatment and refund policy before launch.

Signed webhook events trigger a fresh canonical subscription lookup. Checkout return URLs never grant access. Only active/trialing allowlisted subscriptions with a future period end grant paid features. Test all six offers, portal changes, failed payments, cancellation, duplicate events and expired sessions before live billing. Automated tests use a Stripe mock; they do not verify your account configuration.

Page views reset each UTC calendar month even for annual subscriptions. Overages show an upgrade prompt, keep consent controls running, and incur no automatic charges. Agency includes five invited client seats plus the owner.

## Live configuration

The live catalogue was provisioned on 2026-10-25 for PureConsent. Vercel Production uses a restricted live key, six live EUR prices, a live customer portal and a separate live webhook signing secret. Local development remains on Sandbox.

Run `node scripts/connect-live.mjs --provision --env=.env.live.local` with an ignored environment file to reconcile the catalogue. The script verifies price amounts and recurrence, writes IDs into that file, and never creates payments. Keep the key and signing secret out of Git. Copy all nine STRIPE variables together to Vercel Production and deploy.

The restricted key needs write access to Customers, Checkout Sessions, Prices, Products, Customer Portal and Webhook Endpoints, plus read access to Subscriptions. It does not need payout or transfer access. Provisioning does not prove a real payment or tax setup; those require a deliberate operator acceptance test.

Live verification on 2026-10-25: all six configured offers created live Checkout sessions and were expired without payment. Production accepted the live webhook signature (200) and rejected an invalid signature (400). No existing production accounts had Stripe customer references at cutover. No actual charge was made.

