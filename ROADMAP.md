# PureConsent product roadmap

## Implemented in the first build

- Abinod-branded landing page, responsive operator dashboard, website setup, banner studio, real interactive preview.
- Real Ambiten/MongoDB persistence; explicit local development adapter.
- Standalone English/German widget, preference categories, equal accept/reject buttons, privacy re-entry.
- Explicit script tagging; deny by default; saved choices, expiry, and notice-version invalidation.
- Versioned consent receipts, retry idempotency, TTL retention, CSV exports.
- Single-operator sign-in, origin/CSRF validation, bounded JSON bodies, request validation, per-process throttling.
- Behavior tests, API integration tests, actual Ambiten database verification.

## Next: production pilot with Abinod

1. Choose the actual hosted Node environment and database region. Validate Ambiten’s current forced direct-connection behavior against the selected MongoDB topology.
2. Configure operator secrets, HTTPS, backups, monitoring, and infrastructure log retention.
3. Write site-specific privacy copy and accurate provider descriptions; add per-language provider text.
4. Integrate one real Abinod website, including vendor cleanup and any non-script embeds.
5. Test network behavior before consent, refusal, category selection, withdrawal, version changes, and outages.
6. Obtain site-specific legal review. Do not advertise certification, automatic compliance, guaranteed fine avoidance, or German hosting without evidence.

## Next: commercial launch

- Customer identity, account recovery, organizations, role-based access, domain verification, and tenant-isolation tests.
- Stripe customer/checkout/portal flows, signed webhooks, real entitlements, plan changes, and subscription state.
- Validate the brief’s free 1-domain/5,000-view tier and paid plan. Define a privacy-respecting metering design first; the current consent-event count is not a page-view meter.
- Durable distributed rate limiting, receipt abuse protection, pagination, bulk exports, deletion/request workflows, backup restoration, and independent security review.
- Vendor catalog, script/iframe integrations, consent-mode adapters, scanner with SSRF protections, CSP-compatible stylesheet delivery.
- Optional AI assistance for operator-reviewed plain-language drafts with provenance. Do not use browser language as geolocation or AI as the legal authority.

## After PureConsent

PitchPulse remains the next distinct Abinod product from the supplied conversation. No PitchPulse implementation is included in this repository.
