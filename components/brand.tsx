import Link from 'next/link'

export function Brand ({
  small = false,
  href = '/'
}: {
  small?: boolean
  href?: string
}) {
  return (
    <Link
      className={`brand ${small ? 'small' : ''}`}
      href={href}
      aria-label='PureConsent'
    >
      <span className='brand-icon'>
        <img src='/brand/emblem.png' width={34} height={38} alt='' />
      </span>
      <span>
        Pure<span style={{ color: '#5159FA' }}>Consent</span>
        <span className='brand-dot'>.</span>
      </span>
    </Link>
  )
}
