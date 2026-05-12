import { cn } from '../../lib/utils'

type BrandMarkProps = {
  variant?: 'dark' | 'light'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  alt?: string
}

const sizeClass = {
  sm: 'h-[11px] w-[58px]',
  md: 'h-[14px] w-[74px]',
  lg: 'h-[19px] w-[100px]',
}

export function BrandMark({ variant = 'dark', size = 'md', className = '', alt = 'vroom' }: BrandMarkProps) {
  const src = variant === 'light' ? '/brand/vroom-wordmark-light.png' : '/brand/vroom-wordmark-dark.png'

  return (
    <span className={cn(sizeClass[size], 'inline-flex shrink-0 items-center justify-center', className)}>
      <img src={src} alt={alt} className="h-full w-full object-contain" />
    </span>
  )
}
