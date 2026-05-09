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
  const selectedStyles = selected ? 'border-[#1F2BD8] shadow-[0_0_0_3px_rgba(31,43,216,0.12)]' : ''
  const hoverStyles = hover ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_20px_60px_rgba(15,20,25,0.12)]' : ''

  const variantStyles = {
    surface: 'bg-white border border-[#EBECF0] shadow-none',
    hero: 'bg-white border border-[#EBECF0] shadow-none',
    content: 'bg-white border border-[#EBECF0] shadow-none',
    selectable: 'bg-white border border-[#EBECF0] shadow-none',
    list: 'bg-white border border-[#EBECF0] shadow-none',
    stat: 'bg-white border border-[#EBECF0] shadow-none',
    schedule: 'bg-white border border-[#EBECF0] shadow-none',
    summary: 'bg-[#EEF0FA] border border-[#DCE2FF] shadow-none',
  }[variant]

  const paddingStyles = {
    none: '',
    sm: 'p-2.5',
    md: 'p-3',
    lg: 'p-4',
  }[padding]

  return (
    <div
      className={cn(baseStyles, 'rounded-[24px]', variantStyles, selectedStyles, hoverStyles, paddingStyles, className)}

      {...props}
    >
      {children}
    </div>
  )
}