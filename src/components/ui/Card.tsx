import { cn } from '../../lib/utils'
import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  hover?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
  variant?: 'surface' | 'hero' | 'content' | 'selectable' | 'list' | 'stat' | 'schedule' | 'summary'
  selected?: boolean
}

export function Card({
  children,
  hover = false,
  padding = 'md',
  variant = 'surface',
  selected = false,
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'transition-all duration-200',
        {
          surface: 'rounded-[24px] border border-product-border bg-white shadow-card',
          hero: 'rounded-[28px] border border-product-border bg-white shadow-card',
          content: 'rounded-[24px] border border-product-border bg-white shadow-soft',
          selectable: 'rounded-[22px] border border-product-border bg-white shadow-soft',
          list: 'rounded-[20px] border border-product-border bg-white shadow-soft',
          stat: 'rounded-[22px] border border-product-border bg-white shadow-soft',
          schedule: 'rounded-[22px] border border-product-border bg-white shadow-soft',
          summary: 'rounded-[22px] border border-product-primary-border bg-product-primary-soft/70 shadow-soft',
        }[variant],
        selected && 'ui-selected',
        (hover || variant === 'selectable') && 'ui-card-hover cursor-pointer',
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
