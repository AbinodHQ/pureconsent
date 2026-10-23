import { Leaf } from 'lucide-react'
import Link from 'next/link'
export function Brand ({ small = false, href = '/' }: { small?: boolean; href?: string }) {
  return (
    <Link className={`brand ${small ? 'small' : ''}`} href={href}>
      <span className='brand-icon'>
        <Leaf size={small ? 18 : 21} strokeWidth={1.7} />
      </span>
      <span>
        PureConsent<span className='brand-dot'>.</span>
      </span>
    </Link>
  )
}
