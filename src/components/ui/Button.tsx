import { cn } from '../../lib/utils'
import React from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

void React

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  style,
  children,
  ...props
}: ButtonProps) {
  const minHeight = { sm: 40, md: 48, lg: 56 }[size]

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap font-extrabold transition-all duration-150 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#2436D9]/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 select-none',
        'active:scale-[0.97]',
        {
          primary:
            'text-white shadow-[0_12px_28px_rgba(0,0,0,0.16)] hover:shadow-[0_18px_36px_rgba(0,0,0,0.22)] hover:-translate-y-0.5',
          secondary:
            'border text-[#111418] shadow-[0_8px_20px_rgba(0,0,0,0.08)] hover:-translate-y-0.5',
          ghost:
            'text-[#6F747A] hover:bg-[rgba(0,0,0,0.04)] hover:text-[#111418]',
          danger:
            'text-[#E5534B] shadow-[0_8px_20px_rgba(0,0,0,0.08)] hover:-translate-y-0.5',
        }[variant],
        {
          primary: 'bg-[#2436D9] rounded-full shadow-[0_14px_30px_rgba(36,54,217,0.24)] hover:bg-[#1D2CC4]',
          secondary: 'bg-white border-[rgba(0,0,0,0.06)] rounded-full hover:border-[rgba(0,0,0,0.10)] hover:shadow-[0_14px_32px_rgba(0,0,0,0.12)]',
          ghost: 'bg-transparent border-none rounded-full',
          danger: 'bg-white border border-[rgba(229,83,75,0.15)] rounded-full hover:bg-[#FEF2F2]',
        }[variant],
        {
          sm: 'min-h-[40px] px-4 text-[13px]',
          md: 'min-h-[48px] px-5 text-[15px]',
          lg: 'min-h-[56px] px-6 text-[16px]',
        }[size],
        className,
      )}
      style={{ minHeight, ...style }}
      {...props}
    >
      {children}
    </button>
  )
}
