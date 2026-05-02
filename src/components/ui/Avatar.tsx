import { cn } from '../../lib/utils'

interface AvatarProps {
  initials: string
  color?: string
  src?: string
  alt?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function Avatar({ initials, color = '#EFF2FF', src, alt = initials, size = 'md', className }: AvatarProps) {
  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-sans font-semibold shrink-0 overflow-hidden border rgba(0,0,0,0.06)',
        {
          sm: 'w-8 h-8 text-[11px]',
          md: 'w-10 h-10 text-sm',
          lg: 'w-12 h-12 text-base',
          xl: 'w-16 h-16 text-xl',
        }[size],
        className,
      )}
      style={src ? {} : { backgroundColor: color }}
    >
      {src ? <img src={src} alt={alt} className="h-full w-full object-cover" /> : (
        <span className={src ? '' : 'text-[#2436D9] font-bold'}>
          {initials}
        </span>
      )}
    </div>
  )
}
