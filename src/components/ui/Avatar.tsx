import { cn } from '../../lib/utils'

interface AvatarProps {
  initials: string
  color?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function Avatar({ initials, color = '#2A6E4C', size = 'md', className }: AvatarProps) {
  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-display font-medium text-white shrink-0',
        {
          sm: 'w-8 h-8 text-xs',
          md: 'w-10 h-10 text-sm',
          lg: 'w-12 h-12 text-base',
          xl: 'w-16 h-16 text-xl',
        }[size],
        className,
      )}
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  )
}
