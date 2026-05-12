import { cn } from '../../lib/utils'

type BrandMarkProps = {
  variant?: 'dark' | 'light'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  alt?: string
}

const sizeClass = {
  sm: 'h-4 w-9',
  md: 'h-5 w-12',
  lg: 'h-8 w-20',
}

export function BrandMark({ variant = 'dark', size = 'md', className = '', alt = 'vroom' }: BrandMarkProps) {
  const src = variant === 'light' ? '/brand/vroom-mark-light.png' : '/brand/vroom-mark-dark.png'

  return (
    <span className={cn(sizeClass[size], 'inline-flex shrink-0 items-center justify-center', className)}>
      <img src={src} alt={alt} className="h-full w-full object-contain" />
    </span>
  )
}
