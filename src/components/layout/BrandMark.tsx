import { cn } from '../../lib/utils'

type BrandMarkProps = {
  variant?: 'dark' | 'light'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  alt?: string
}

const sizeClass = {
  sm: 'h-9 w-9 rounded-[10px]',
  md: 'h-11 w-11 rounded-[12px]',
  lg: 'h-16 w-16 rounded-[16px]',
}

export function BrandMark({ variant = 'dark', size = 'md', className = '', alt = 'vroom' }: BrandMarkProps) {
  const src = variant === 'light' ? '/brand/vroom-mark-light.png' : '/brand/vroom-mark-dark.png'
  const surfaceClass = variant === 'light' ? 'bg-white' : 'bg-[#050609]'

  return (
    <span className={cn(sizeClass[size], 'grid shrink-0 place-items-center overflow-hidden', surfaceClass, className)}>
      <img src={src} alt={alt} className="h-[76%] w-[76%] object-contain" />
    </span>
  )
}
