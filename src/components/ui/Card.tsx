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
        'rounded-xl border border-stone-200 bg-white shadow-[0_1px_2px_rgba(28,25,23,0.04)]',
        hover && 'cursor-pointer transition-all duration-200 hover:border-stone-300',
        {
          none: '',
          sm: 'p-3.5',
          md: 'p-4',
          lg: 'p-5',
        }[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
