import { cn } from '../../lib/utils'
import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  hover?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function Card({
  children,
  hover = false,
  padding = 'md',
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200/75 bg-white/95 shadow-card',
        hover && 'ui-card-hover cursor-pointer',
        {
          none: '',
          sm: 'p-3.5',
          md: 'p-4',
          lg: 'p-6',
        }[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
