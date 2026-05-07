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
    surface: 'bg-white border border-[#D8E0EC] shadow-[0_14px_34px_rgba(35,47,78,0.10)]',
    hero: 'bg-white border border-[#D8E0EC] shadow-[0_16px_38px_rgba(35,47,78,0.12)]',
    content: 'bg-white border border-[#D8E0EC] shadow-[0_14px_34px_rgba(35,47,78,0.10)]',
    selectable: 'bg-white border border-[#D8E0EC] shadow-[0_14px_34px_rgba(35,47,78,0.10)]',
    list: 'bg-white border border-[#D8E0EC] shadow-[0_12px_28px_rgba(35,47,78,0.09)]',
    stat: 'bg-white border border-[#D8E0EC] shadow-[0_14px_34px_rgba(35,47,78,0.10)]',
    schedule: 'bg-white border border-[#D8E0EC] shadow-[0_14px_34px_rgba(35,47,78,0.10)]',
    summary: 'bg-[#FFF7E8] border border-[rgba(174,118,35,0.18)] shadow-[0_18px_42px_rgba(63,46,28,0.08)]',
  }[variant]

  const paddingStyles = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
  }[padding]

  return (
    <div
      className={cn(baseStyles, 'rounded-[18px] md:rounded-[22px]', variantStyles, selectedStyles, hoverStyles, paddingStyles, className)}

      {...props}
    >
      {children}
    </div>
  )
}