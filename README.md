# PureConsent

Consent management SaaS built by Abinod, with Ambiten persistence, verified customer accounts, domain verification, configurable consent controls, encrypted receipts, subscriptions and restricted client workspaces.

## Local development

Use Node.js 22.15 or newer. Run `npm ci`, copy `.env.example` to `.env.local`, then `npm run dev`. Open http://localhost:3100. Development email links appear in the interface. Local storage in `.data/saas-v2.json` is for single-process development only.

## Pricing

| Plan | Monthly | Annual | Monthly page views | Domains | Client seats |
| --- | ---: | ---: | ---: | ---: | ---: |
| Free / Sandbox | €0 | — | 1,000 | 1 | 0 |
| Starter | €12 | €99 | 25,000 | 1 | 0 |
| Business Pro | €29 | €249 | 100,000 | 3 | 0 |
| Agency / Studio | €69 | €599 | 500,000 | 15 | 5 |

Unlimited subpages on every plan. Paid plans allow custom colors/fonts and branding removal. Business and Agency include DE/EN/FR localization, optional translation drafts and audit JSON export. Agency includes five invited clients plus the owner, restricted to assigned domains. Downgrading suspends shared access and applies current feature limits. Existing consent controls continue operating above traffic allowances, with upgrade prompts and no automatic overage fees.

Page views are explicit widget impression events, independent of consent or configuration fetches. Random event IDs deduplicate retries without a persistent visitor ID. Allowances reset each UTC calendar month, including annual subscriptions. SPAs must invoke `window.PureConsent?.trackPageView()` after route changes; see `/docs`.

## Production setup

Set `PURECONSENT_STORAGE=ambiten`, `MONGODB_URI`, `MONGODB_DB`, the exact HTTPS `APP_ORIGIN`, and verified `RESEND_API_KEY` / `EMAIL_FROM`. Configure production audit keys as described in [audit storage](docs/AUDIT.md). No secrets belong in Git. Optional `DEEPL_API_KEY` enables purpose-description translation drafts; review drafts before saving. Built-in interface translations need no API key.

Ambiten 1.3.0 currently enables directConnection internally. Validate your MongoDB topology; a local MongoDB 8 endpoint is tested, while Atlas/SRV and multi-node failover require validation or a client update. Configure backups, key recovery, monitoring, access controls and retention for infrastructure logs. Verify actual app/database/backup/subprocessor locations before claiming German or EU-only hosting.

[Stripe setup](docs/STRIPE.md) documents all six EUR prices, webhooks, portal and Sandbox checks. Stripe remains unconnected until you provide server configuration. Automated billing tests use mocks.

## Security and integration boundaries

Passwords use salted scrypt; sessions and one-time tokens are hashed. Verified email and DNS domain ownership are required. Workspace authorization is enforced on the server. Account deletion requires a password and no ongoing subscription. Retention is 30/180/365/365 days by plan; existing receipts retain original expiry. Exports include the latest 1,000 retained records. Database TTL deletion is asynchronous, with expired records excluded from reads immediately.

Read `/docs` before installing. Optional scripts must be explicitly tagged `type="text/plain" data-consent="analytics"` or `marketing`, using `data-src` for external scripts. Unmarked scripts, embeds, cookies and already-running providers are not automatically blocked or cleaned up. Test vendor cleanup and withdrawal on each site. No cookie scanner, IAB TCF or Google CMP certification is included. Encryption does not certify legal compliance.

The readable widget lives in `widget/consent.js`; `npm run build:widget` generates `public/consent.js` and reports actual compressed sizes, excluding configuration/network headers. Build, development and test commands regenerate it. Compression must be enabled by the hosting stack. No zero-performance-impact guarantee is made.

## Validation and launch

Run `npm test` and `npm run build`. For a disposable MongoDB instance, set `MONGODB_URI` and `MONGODB_DB=pureconsent_test_<unique>`, then `npm run test:db`; the integration test deletes that database afterward.

Tests exercise pricing, six checkout offers, encryption/tampering/key rotation, client permissions/seat caps, tenant isolation, page-view deduplication, account lifecycle and widget behavior. Before launch, test real Stripe Sandbox and email delivery, production storage/key recovery, browser integration on customer sites, and finalize operator identity, tax treatment, privacy/terms, DPA and subprocessors.

Dependency review: Next.js is updated to 16.4.2. npm audit still flags the GraphQL Tools utility chain bundled by Ambiten 1.3.0 (GHSA-7mx3-vvmw-hjmv). This app uses Ambiten's database API, not its GraphQL schema helpers. Obtain an upstream-compatible patched dependency release and reassess before public launch; do not interpret passing application tests as clearing that advisory.
