import { z } from 'zod'

export const OWNER = 'abinod'
export const categories = ['analytics', 'marketing'] as const
export const siteInput = z.object({
  name: z.string().trim().min(2).max(80),
  origin: z
    .string()
    .url()
    .max(500)
    .refine(value => {
      try {
        const url = new URL(value)
        return !url.username && !url.password && (
          url.protocol === 'https:' ||
          (url.protocol === 'http:' &&
            ['localhost', '127.0.0.1'].includes(url.hostname))
        )
      } catch { return false }
    }, 'Use HTTPS, or HTTP on localhost for development. Do not include credentials.')
    .transform(value => new URL(value).origin),
  privacyUrl: z
    .string()
    .url()
    .max(500)
    .refine(value => {
      try {
        const url = new URL(value)
        return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password
      } catch { return false }
    }),
  language: z.enum(['auto', 'en', 'de']).default('auto'),
  accent: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#4F46E5'),
  retentionDays: z.number().int().min(30).max(365).default(180),
  analytics: z
    .string()
    .trim()
    .min(5)
    .max(500)
    .default(
      'Understand which pages are useful. List your analytics providers in your privacy notice.'
    ),
  marketing: z
    .string()
    .trim()
    .min(5)
    .max(500)
    .default(
      'Show relevant advertising. List your advertising providers in your privacy notice.'
    )
})
export type SiteInput = z.infer<typeof siteInput>
export type Site = SiteInput & {
  id: string
  ownerId: string
  version: number
  createdAt: string
  updatedAt: string
}
export const consentInput = z
  .object({
    id: z.string().uuid(),
    consentId: z.string().uuid(),
    version: z.number().int().positive(),
    language: z.enum(['en', 'de']),
    action: z.enum(['accept', 'reject', 'custom', 'withdraw']),
    choices: z
      .object({
        necessary: z.literal(true),
        analytics: z.boolean(),
        marketing: z.boolean()
      })
      .strict()
  })
  .strict()
  .superRefine((value, ctx) => {
    const { analytics, marketing } = value.choices
    if (
      (value.action === 'accept' && (!analytics || !marketing)) ||
      (['reject', 'withdraw'].includes(value.action) &&
        (analytics || marketing))
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Action and choices must match.'
      })
    }
  })
export type Receipt = z.infer<typeof consentInput> & {
  siteId: string
  ownerId: string
  createdAt: string
  expiresAt: Date | string
  notice: {
    name: string
    privacyUrl: string
    analytics: string
    marketing: string
    version: number
  }
}
export function publicSite (site: Site) {
  const { ownerId: _, createdAt: __, updatedAt: ___, ...config } = site
  return config
}
export function originAllowed (site: Site, origin: string | null) {
  return origin !== null && origin === site.origin
}
export function csv (rows: Receipt[]) {
  const cell = (value: unknown) => `"${String(value).replace(/"/g, '""')}"`
  const fields = [
    'id',
    'siteId',
    'createdAt',
    'action',
    'version',
    'language',
    'analytics',
    'marketing'
  ]
  return [
    fields.join(','),
    ...rows.map(row =>
      [
        row.id,
        row.siteId,
        row.createdAt,
        row.action,
        row.version,
        row.language,
        row.choices.analytics,
        row.choices.marketing
      ]
        .map(cell)
        .join(',')
    )
  ].join('\r\n')
}
