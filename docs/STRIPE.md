# Connect Stripe later

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

## Connected Sandbox

The PureConsent sandbox now has all six verified prices and a portal configuration. Local secrets and IDs are in ignored .env.local. Run node scripts/connect-sandbox.mjs to verify the prices and idempotently configure the Sandbox portal. Set STRIPE_PORTAL_CONFIGURATION_ID for the application to use that configuration.

For local webhook delivery, run node scripts/listen-stripe.mjs alongside npm run dev. It stores the CLI signing secret locally without printing it. Production uses https://pureconsent.de/api/billing/webhook after deployment and a separate Dashboard endpoint secret. Checkout explicitly uses standard Stripe Billing, regardless of the account Managed Payments default.
