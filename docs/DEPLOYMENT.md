# Launch pureconsent.de

The public origin is `https://pureconsent.de`, deployed on Vercel project `pureconsent` in `emmanuels-projects-ebd3c432`. GitHub `AbinodHQ/pureconsent` main triggers production deployments. `vercel.json` places server functions in Frankfurt (`fra1`). The apex DNS A record points to `216.198.79.1`; email records remain separate.

MongoDB Atlas cluster `pureconsent` is in AWS Frankfurt (`eu-central-1`). Ambiten uses the restricted `pureconsent_app` user with read/write access to the `pureconsent` database. Atlas permits IPv4 connections from `0.0.0.0/0` for Vercel Hobby dynamic egress, with TLS and database authentication still required. The Free cluster has no automated backups; arrange backup/restore before relying on it for customer audit retention.

Ambiten 1.3.0 hardcodes `directConnection: true`, which rejects Atlas SRV connections. `scripts/patch-ambiten.mjs` patches the pinned ESM and CommonJS implementations during `postinstall` to enable replica-set discovery. It fails on unexpected source/version changes; review and remove it when upgrading to an upstream release that fixes this.

Production environment variables are stored as Vercel secrets, scoped to Production. The ignored `.env.vercel` is a local recovery copy, not a file to commit or share. Preserve the audit key when rotating database/API credentials; replacing it without retaining the old key prevents decryption of earlier receipts.

Use Node.js 22.18 or newer (Node 24 LTS recommended), HTTPS, and a compatible MongoDB endpoint through Ambiten. Set `PURECONSENT_STORAGE=ambiten`, `MONGODB_URI`, `MONGODB_DB`, and `APP_ORIGIN=https://pureconsent.de`. Configure encrypted audit keys using AUDIT.md and Resend using EMAIL.md. Verify app, database, backups and subprocessors before claiming EU-only hosting.

Run `npm ci`, `npm test`, and `npm run build`. Start Next.js on the interface/port required by your host; the local npm start command binds loopback, suitable behind a local reverse proxy. A container or platform requiring external binding can run `node node_modules/next/dist/bin/next start --hostname 0.0.0.0 --port 3000`.

Stripe Sandbox has six EUR prices and a customer portal configured; local keys are ignored by Git. Standard Stripe Billing is explicitly selected for Checkout. This integration does not opt into Stripe Managed Payments. Configure your chosen tax collection setup before accepting live payments.

The hosted Sandbox webhook is `https://pureconsent.de/api/billing/webhook` (endpoint `we_1UU6SAIGVLNZKarIuYUsn75n`) with checkout completion, subscription create/update/delete, invoice paid/payment-failed events. Its signing secret is set in Vercel. The local Stripe CLI signing secret is a different secret. Live billing is not enabled: use separately created live keys, prices, portal configuration and webhook before charging customers.

Deployment checks on 2026-10-24 passed: 21 automated tests, TypeScript, Vercel production build, Ambiten/Atlas authentication and ping, hosted email-verification token consumption and replay rejection, login with Secure/HttpOnly session cookie, authenticated home/dashboard navigation, persisted overview, signed webhook acceptance, unsigned webhook rejection, logout session revocation, and widget delivery. The disposable smoke-test account was removed. Resend sender `noreply@pureconsent.de` is configured; email delivery was previously verified through Resend.

The launch also requires operator identity/contact details, finalized legal pages, backup/restore verification and real provider-specific consent tests. The software does not provide legal certification or an automatic cookie scanner.
