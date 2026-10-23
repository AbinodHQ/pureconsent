# Launch pureconsent.de

The intended public origin is `https://pureconsent.de`. Hosting and DNS deployment are not configured by this repository.

Use Node.js 22.18 or newer (Node 24 LTS recommended), HTTPS, and a compatible MongoDB endpoint through Ambiten. Set `PURECONSENT_STORAGE=ambiten`, `MONGODB_URI`, `MONGODB_DB`, and `APP_ORIGIN=https://pureconsent.de`. Configure encrypted audit keys using AUDIT.md and Resend using EMAIL.md. Verify app, database, backups and subprocessors before claiming EU-only hosting.

Run `npm ci`, `npm test`, and `npm run build`. Start Next.js on the interface/port required by your host; the local npm start command binds loopback, suitable behind a local reverse proxy. A container or platform requiring external binding can run `node node_modules/next/dist/bin/next start --hostname 0.0.0.0 --port 3000`.

Stripe Sandbox has six EUR prices and a customer portal configured; local keys are ignored by Git. Standard Stripe Billing is explicitly selected for Checkout. This integration does not opt into Stripe Managed Payments. Configure your chosen tax collection setup before accepting live payments.

Once the HTTPS app is deployed, configure the Stripe webhook at `https://pureconsent.de/api/billing/webhook` with the events in STRIPE.md. Use its signing secret on the deployed server. The local Stripe CLI signing secret is a different secret and must not be used for a Dashboard webhook. Test Sandbox delivery and checkout against the deployed application before switching to separately created live keys/prices/portal configuration.

The launch also requires operator identity/contact details, finalized legal pages, backup/restore verification and real provider-specific consent tests. The software does not provide legal certification or an automatic cookie scanner.
