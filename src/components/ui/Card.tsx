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
  const baseStyles = 'transition-all duration-150'
  const selectedStyles = selected ? 'border-[#C4935A] shadow-[0_0_0_3px_rgba(246,184,77,0.15)]' : ''
  const hoverStyles = hover ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_20px_60px_rgba(15,20,25,0.12)]' : ''

  const variantStyles = {
    surface: 'bg-white/95 border border-[rgba(55,38,20,0.08)] shadow-[0_18px_42px_rgba(63,46,28,0.08)] backdrop-blur-xl',
    hero: 'bg-white/95 border border-[rgba(55,38,20,0.08)] shadow-[0_22px_54px_rgba(63,46,28,0.10)] backdrop-blur-xl',
    content: 'bg-white/95 border border-[rgba(55,38,20,0.08)] shadow-[0_18px_42px_rgba(63,46,28,0.08)] backdrop-blur-xl',
    selectable: 'bg-white/95 border border-[rgba(55,38,20,0.08)] shadow-[0_18px_42px_rgba(63,46,28,0.08)] backdrop-blur-xl',
    list: 'bg-white/95 border border-[rgba(55,38,20,0.08)] shadow-[0_14px_34px_rgba(63,46,28,0.07)] backdrop-blur-xl',
    stat: 'bg-white/95 border border-[rgba(55,38,20,0.08)] shadow-[0_18px_42px_rgba(63,46,28,0.08)] backdrop-blur-xl',
    schedule: 'bg-white/95 border border-[rgba(55,38,20,0.08)] shadow-[0_18px_42px_rgba(63,46,28,0.08)] backdrop-blur-xl',
    summary: 'bg-[#FFF7E8] border border-[rgba(174,118,35,0.18)] shadow-[0_18px_42px_rgba(63,46,28,0.08)]',
  }[variant]

  const paddingStyles = {
    none: '',
    sm: 'p-3.5',
    md: 'p-5',
    lg: 'p-6',
  }[padding]

  return (
    <div
      className={cn(baseStyles, 'rounded-[22px] md:rounded-[28px]', variantStyles, selectedStyles, hoverStyles, paddingStyles, className)}

      {...props}
    >
      {children}
    </div>
  )
}