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
  const minHeight = { sm: 36, md: 44, lg: 50 }[size]

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap font-extrabold transition-all duration-150 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#1F2BD8]/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 select-none',
        'active:scale-[0.97]',
        {
          primary:
            'text-white shadow-[0_8px_18px_rgba(0,0,0,0.12)] hover:shadow-[0_10px_22px_rgba(0,0,0,0.16)]',
          secondary:
            'border text-[#050609] shadow-none',
          ghost:
            'text-[#6F747A] hover:bg-[rgba(0,0,0,0.04)] hover:text-[#050609]',
          danger:
            'text-[#E5534B] shadow-none',
        }[variant],
        {
          primary: 'bg-[#1F2BD8] rounded-[18px] shadow-[0_10px_24px_rgba(31,43,216,0.20)] hover:bg-[#1723B8]',
          secondary: 'bg-white border-[#EBECF0] rounded-[18px] hover:border-[#DDE0E5] hover:bg-[#F7F8FA]',
          ghost: 'bg-transparent border-none rounded-[16px]',
          danger: 'bg-white border border-[#FFEDEF] rounded-[18px] hover:bg-[#FFEDEF]',
        }[variant],
        {
          sm: 'min-h-[36px] px-3 text-[13px]',
          md: 'min-h-[44px] px-4 text-[15px]',
          lg: 'min-h-[50px] px-5 text-[16px]',
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
