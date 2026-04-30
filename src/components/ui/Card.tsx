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
  const selectedStyles = selected ? 'border-[#F6B84D] shadow-[0_0_0_3px_rgba(246,184,77,0.15)]' : ''
  const hoverStyles = hover ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_20px_60px_rgba(15,20,25,0.12)]' : ''

  const variantStyles = {
    surface: 'bg-white border border-[rgba(0,0,0,0.06)] shadow-[0_18px_45px_rgba(15,20,25,0.10)]',
    hero: 'bg-white border border-[rgba(0,0,0,0.06)] shadow-[0_18px_45px_rgba(15,20,25,0.10)]',
    content: 'bg-white border border-[rgba(0,0,0,0.06)] shadow-[0_18px_45px_rgba(15,20,25,0.10)]',
    selectable: 'bg-white border border-[rgba(0,0,0,0.06)] shadow-[0_18px_45px_rgba(15,20,25,0.10)]',
    list: 'bg-white border border-[rgba(0,0,0,0.06)] shadow-[0_18px_45px_rgba(15,20,25,0.10)]',
    stat: 'bg-white border border-[rgba(0,0,0,0.06)] shadow-[0_18px_45px_rgba(15,20,25,0.10)]',
    schedule: 'bg-white border border-[rgba(0,0,0,0.06)] shadow-[0_18px_45px_rgba(15,20,25,0.10)]',
    summary: 'bg-[rgba(246,184,77,0.08)] border border-[rgba(246,184,77,0.20)] shadow-[0_18px_45px_rgba(15,20,25,0.10)]',
  }[variant]

  const paddingStyles = {
    none: '',
    sm: 'p-3.5',
    md: 'p-5',
    lg: 'p-6',
  }[padding]

  return (
    <div
      className={cn(baseStyles, variantStyles, selectedStyles, hoverStyles, paddingStyles, className)}
      style={{ borderRadius: '24px' }}
      {...props}
    >
      {children}
    </div>
  )
}