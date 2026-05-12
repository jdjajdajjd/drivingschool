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

export function BrandMark({ variant = 'dark', size = 'md', className = '', alt = 'Vroom' }: BrandMarkProps) {
  const src = variant === 'light' ? '/brand/vroom-mark-light.png' : '/brand/vroom-mark-dark.png'

  return (
    <span className={`${sizeClass[size]} grid shrink-0 place-items-center overflow-hidden bg-white ${className}`}>
      <img src={src} alt={alt} className="h-full w-full object-cover" />
    </span>
  )
}
