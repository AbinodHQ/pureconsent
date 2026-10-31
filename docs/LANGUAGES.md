# Website languages and branding

German is served at https://pureconsent.de and English at https://com.pureconsent.de. Both hosts use the same Vercel project and database. The language switcher keeps the current path, query and fragment. Domain selection is explicit; browser location is not used to infer nationality.

Server rendering selects the language from the hostname. Local development uses the pc_locale preference cookie. Client components inherit the server locale, avoiding a client-only translation flash. Static UI copy lives in lib/i18n/de.json; English source strings are the keys. Translate new interface copy with the shared translator. Customer-entered website names, descriptions and audit records are not automatically rewritten. The banner's DE/EN/FR controls remain independent of the website language.

Both hosts are allowlisted for application-origin handling and payment/email return links. Secure HttpOnly pc_session_v2 cookies use Domain=.pureconsent.de. Existing host-only pc_session cookies migrate on navigation; their server-side expiry and revocation remain authoritative. Keep all subdomains under trusted control because browser domain cookies are shared with subdomains. Local development and Vercel preview cookies remain host-only.

The English hostname is connected to Vercel Production with a CNAME named com pointing to d5501decbd3a34ec.vercel-dns-017.com. Both production domains must retain valid TLS certificates. APP_ORIGIN stays https://pureconsent.de as the canonical fallback; Stripe webhooks continue to use the existing apex endpoint.

The provided pureconsent-assets shield-and-leaf emblem and favicon are published under public/brand. Wordmark variants are retained there for light/dark branded materials. Brand links use the emblem with accessible text, preserving the dashboard-specific destination.

## Legal content

The `/impressum` and `/privacy` routes use English source strings and the German dictionary, including navigation labels, headings, body text and localized metadata. Canonical and alternate-language URLs follow the selected host. Keep English source strings in `t(...)`, normalize dictionary keys by whitespace, and preserve the original spaces around inline links. Run `npx tsx --test tests/legal-languages.test.ts` to detect missing dictionary entries and regressions in contact links.
