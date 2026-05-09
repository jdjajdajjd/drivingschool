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
    surface: 'bg-white border border-[#D8E0EC] shadow-none',
    hero: 'bg-white border border-[#D8E0EC] shadow-none',
    content: 'bg-white border border-[#D8E0EC] shadow-none',
    selectable: 'bg-white border border-[#D8E0EC] shadow-none',
    list: 'bg-white border border-[#D8E0EC] shadow-none',
    stat: 'bg-white border border-[#D8E0EC] shadow-none',
    schedule: 'bg-white border border-[#D8E0EC] shadow-none',
    summary: 'bg-[#FFF7E8] border border-[rgba(174,118,35,0.18)] shadow-none',
  }[variant]

  const paddingStyles = {
    none: '',
    sm: 'p-2.5',
    md: 'p-3',
    lg: 'p-4',
  }[padding]

  return (
    <div
      className={cn(baseStyles, 'rounded-[14px] md:rounded-[16px]', variantStyles, selectedStyles, hoverStyles, paddingStyles, className)}

      {...props}
    >
      {children}
    </div>
  )
}