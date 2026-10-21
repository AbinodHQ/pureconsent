import type { Metadata } from 'next'
import './globals.css'
import './secure-shield.css'
export const metadata: Metadata = {
  title: 'PureConsent — Make room for trust.',
  description:
    'Thoughtful consent management by Abinod. Clear choices, lightweight integration, and consent records powered by Ambiten.'
}
export default function RootLayout ({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang='en'>
      {/* Grammarly can add body attributes before React hydrates. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
