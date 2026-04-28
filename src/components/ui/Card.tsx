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
          surface: 'rounded-2xl border border-slate-200/75 bg-white/95 shadow-card',
          hero: 'rounded-[1.75rem] border border-slate-200/75 bg-white shadow-card',
          content: 'rounded-2xl border border-slate-200/70 bg-white/95 shadow-soft',
          selectable: 'rounded-2xl border border-slate-200 bg-white shadow-sm',
          list: 'rounded-2xl border border-slate-100 bg-white shadow-sm',
          stat: 'rounded-2xl border border-slate-200/70 bg-white shadow-soft',
          schedule: 'rounded-2xl border border-slate-200/75 bg-white shadow-sm',
          summary: 'rounded-2xl border border-blue-100 bg-blue-50/30 shadow-sm',
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
