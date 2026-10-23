# Resend transactional email

Production sender: `PureConsent <noreply@pureconsent.de>`.

1. Sign in to Resend, add `pureconsent.de`, and select the intended email region.
2. At the domain's DNS provider, add exactly the verification/DKIM/SPF records Resend provides. Avoid replacing existing mail records blindly. Wait for Resend to show Verified.
3. Create a sending API key scoped to that domain. Store it as `RESEND_API_KEY` in the deployment's secret settings, never in Git or browser code.
4. Set `EMAIL_FROM=PureConsent <noreply@pureconsent.de>` and `APP_ORIGIN=https://pureconsent.de` on the production server. Restart/redeploy after configuration changes.
5. Register a real test account, open its verification email, sign in, request a password reset, and check Resend delivery events and spam placement. Test invitation delivery too. Do not enable link tracking for authentication links.

Verification links expire after 24 hours; password-reset links after one hour; both are single-use. Verification requires an explicit button click so email scanners do not consume the link. Password resets revoke prior sessions. API responses do not include delivered links when Resend is connected. Production refuses to expose local test links or create accounts when email configuration is absent.

Without a Resend key, development shows an explicit local test link instead of pretending to send email. This exercises the complete account flow but does not deliver mail. Use Resend verification after a delivery failure; the account does not need to be recreated.

Local `localhost` and `127.0.0.1` aliases are accepted only on the configured port. Cookies are still hostname-specific: keep using the same hostname after signing in. Production mutations require the exact configured origin.
