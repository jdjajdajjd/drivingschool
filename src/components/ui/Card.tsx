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
        'bg-white rounded-2xl border border-stone-100 shadow-card',
        hover && 'transition-shadow duration-200 hover:shadow-card-hover cursor-pointer',
        {
          none: '',
          sm: 'p-4',
          md: 'p-6',
          lg: 'p-8',
        }[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
