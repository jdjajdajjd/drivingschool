import { cn } from '../../lib/utils'

type BrandMarkProps = {
  variant?: 'dark' | 'light'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  alt?: string
}

const sizeClass = {
  sm: 'text-[15px] leading-4',
  md: 'text-[18px] leading-5',
  lg: 'text-[22px] leading-6',
}

export function BrandMark({ variant = 'dark', size = 'md', className = '', alt = 'vroom' }: BrandMarkProps) {
  return (
    <span
      aria-label={alt}
      className={cn(
        sizeClass[size],
        'inline-flex shrink-0 items-baseline font-extrabold tracking-normal',
        variant === 'light' ? 'text-white' : 'text-[var(--text)]',
        className,
      )}
    >
      vroom
    </span>
  )
}
