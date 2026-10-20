# PureConsent

A privacy-focused consent manager by **Abinod**, with database persistence through **Ambiten**.

This first release is a working **single-operator MVP**: marketing site, website dashboard, banner studio, English/German widget, explicit optional-script blocking, consent ledger, retention, and CSV export. It is not yet a self-service, subscription-ready SaaS.

## Run locally

Use Node.js **22.15+** (the installed host’s 22.13 also passed the initial checks, but a transitive Ambiten dependency requires 22.15).

```powershell
cd C:\Users\User\Documents\GitHub\pureconsent
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open [localhost:3100](http://localhost:3100) and enter the workspace. Use `localhost`, matching `APP_ORIGIN` in the environment file.

By default, `PURECONSENT_STORAGE=local` uses an atomic JSON development store in `.data/pureconsent.json`. No database or credentials are needed to try the product. This mode is explicit, single-process, and rejected in production; it is never used as a silent fallback after a database failure.

If port 3100 is occupied, run:

```powershell
node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3117
```

Also update `APP_ORIGIN` to `http://localhost:3117`.

## Use Ambiten

Set these values in `.env.local`:

```dotenv
PURECONSENT_STORAGE=ambiten
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=pureconsent
APP_ORIGIN=http://localhost:3100
```

Restart Next.js. The dashboard status will show “Ambiten connected” after a successful read.

All database operations go through `@ambiten/core`’s **AmbitenClient** and its collection API. The application imports MongoDB types only; it does not create a separate MongoClient. This is Ambiten’s documented direct-collection integration pattern, with Zod validation at the HTTP boundary.

The database creates:

- `sites`: unique public site ID; unique operator/origin; configuration and notice version.
- `consent_receipts`: unique event ID; operator/site/time index; expiry TTL index.

The application explicitly scopes operator queries to the Abinod workspace. It does not claim multi-customer tenancy. A future account model must replace the fixed owner and enforce domain ownership.

**Ambiten 1.3.0 compatibility:** its current client implementation forces `directConnection: true`. This project was verified against standalone MongoDB 8.0. Validate or update Ambiten before deploying to Atlas/SRV or multi-node production topology; do not assume those are supported by this version.

## Install on a website

1. Add the exact website origin and its real privacy notice in the dashboard.
2. Review purpose/provider descriptions; defaults are placeholders for you to replace.
3. Copy the Banner studio snippet into the website’s `<head>`.
4. Make optional scripts inert:

```html
<script src="https://YOUR-PURECONSENT-HOST/consent.js"
  data-site="YOUR-SITE-ID" defer></script>

<script type="text/plain" data-consent="analytics"
  data-src="https://YOUR-PROVIDER/script.js"></script>
```

Use `analytics` or `marketing`. Remove duplicate active scripts. The widget does not block arbitrary scripts, images, iframes, tag managers, or server-side tracking automatically.

Listen to `pureconsent:change` for vendor-specific stop/reset logic:

```js
window.addEventListener("pureconsent:change", event => {
  const { analytics, marketing } = event.detail;
  // Notify vendors; remove their cookies and identifiers when false.
});
window.PureConsent.open();     // Your own privacy settings link
window.PureConsent.withdraw(); // Refuse all optional categories
```

The widget saves refusal before reloading on withdrawal when local storage works. Your cleanup remains necessary for cookies and data already sent to vendors. If storage is unavailable, preferences apply only to the current page and the change event still fires.

The preview at `/demo.html` is explicitly non-persistent and sends no receipts.

## Privacy behavior

- Optional categories default off; accept and reject have equal prominence.
- First-party local storage remembers choices for 180 days. No tracking cookies or fingerprinting are created by the widget.
- A notice version change requests new consent on the next page load.
- Browser language selects EN/DE interface copy; it does **not** infer location or legal jurisdiction. Provider descriptions are operator-written and are not translated.
- Receipts contain a site-specific pseudonymous consent ID, event ID, choices, action, interface language, server-received timestamp, notice snapshot, and expiry.
- No IP address, user agent, page URL, or location is stored in application consent records. Infrastructure logging must be configured separately.
- Receipt retries are idempotent. Failed submission is shown to visitors and retried from stored pending state.
- Retention is 30–365 days per website, applied to new receipts. MongoDB TTL deletion is asynchronous; expired records are excluded from reads.
- Export is limited to the latest 1,000 retained records. Counts reflect that same window, not page views or unique visitors.
- Origin checks prevent casual cross-origin submissions but public browser receipts are not independently verified proof of identity.

Consent tools do not by themselves certify a website’s compliance. See the [EDPB Cookie Banner Taskforce report](https://www.edpb.europa.eu/system/files/2023-01/edpb_20230118_report_cookie_banner_taskforce_en.pdf) and [§25 TDDDG](https://www.gesetze-im-internet.de/ttdsg/__25.html). Local storage is also device storage. Site-specific purposes, providers, legal bases, controller details, and integration testing remain necessary.

## Authentication and deployment

This application uses the **Node.js runtime**, not Cloudflare Workers, because Ambiten uses MongoDB TCP connections and Node runtime facilities.

For production:

- Configure Ambiten and a supported MongoDB topology.
- Set `ADMIN_PASSWORD` to a unique value of at least 16 characters and `SESSION_SECRET` to a random secret of at least 32 characters.
- Set `APP_ORIGIN` to the exact public HTTPS dashboard origin.
- Run `npm run build` and `npm start` behind an HTTPS reverse proxy. The start script binds to loopback.
- Configure infrastructure logging, backups, database access, deployment region, and provider agreements.

Operator sessions use signed, eight-hour, HTTP-only, same-site cookies, secure in production. Writes require matching origin. Request sizes and schemas are bounded. Login and receipt endpoints use per-process rate limits; distributed abuse protection is required before multi-instance/commercial deployment.

The banner uses shadow DOM styles. Review CSP allowances for the widget host (`script-src`, `connect-src`) and inline styles. Nonces on optional script templates are copied onto activated scripts.

## Verify

```powershell
npm test
npm run typecheck
npm run build
```

Tests cover validation, auth, CSRF, origin enforcement, consent APIs, notice versioning, CSV, saved/expired preferences, unsaved toggles, category-specific execution, outages, retries, and blocked storage.

For live Ambiten integration, use a disposable database on a test MongoDB:

```powershell
$env:MONGODB_URI = 'mongodb://127.0.0.1:27028'
$env:MONGODB_DB = 'pureconsent_test_local'
npm run test:db
```

The test requires the `pureconsent_test_` prefix and deletes only that explicitly named disposable database afterward. It checks CRUD, uniqueness, versioning, receipt idempotency, expiration, and TTL indexes.

## Next product milestones

See [ROADMAP.md](ROADMAP.md). Initial proposed pricing in the brief (free tier and a paid per-domain plan) is a hypothesis, not an implemented checkout or usage limit. AI summaries are intentionally not generated at visitor request time; any future AI feature should assist operator-reviewed drafts.
