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
  const baseStyles = 'transition-all duration-200'
  const selectedStyles = selected ? 'border-[#111827] shadow-[0_0_0_4px_rgba(17,24,39,0.07)]' : ''
  const hoverStyles = hover ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]' : ''

  const variantStyles = {
    surface: 'border border-white/70 bg-[rgba(255,255,255,0.76)] shadow-[var(--shadow-card)] backdrop-blur-2xl',
    hero: 'border border-white/70 bg-[rgba(255,255,255,0.78)] shadow-[var(--shadow-card)] backdrop-blur-2xl',
    content: 'border border-white/70 bg-[rgba(255,255,255,0.76)] shadow-[var(--shadow-card)] backdrop-blur-2xl',
    selectable: 'border border-white/70 bg-[rgba(255,255,255,0.76)] shadow-[var(--shadow-card)] backdrop-blur-2xl',
    list: 'border border-white/70 bg-[rgba(255,255,255,0.72)] shadow-[var(--shadow-card)] backdrop-blur-2xl',
    stat: 'border border-white/70 bg-[rgba(255,255,255,0.78)] shadow-[var(--shadow-card)] backdrop-blur-2xl',
    schedule: 'border border-white/70 bg-[rgba(255,255,255,0.76)] shadow-[var(--shadow-card)] backdrop-blur-2xl',
    summary: 'border border-white/70 bg-[#EEF6FF] shadow-[var(--shadow-card)] backdrop-blur-2xl',
  }[variant]

  const paddingStyles = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
  }[padding]

  return (
    <div
      className={cn(baseStyles, 'rounded-[22px] md:rounded-[24px]', variantStyles, selectedStyles, hoverStyles, paddingStyles, className)}

      {...props}
    >
      {children}
    </div>
  )
}
