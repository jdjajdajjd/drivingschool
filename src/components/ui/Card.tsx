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
        'rounded-3xl border border-stone-200 bg-white shadow-soft',
        hover && 'cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-card-hover',
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
