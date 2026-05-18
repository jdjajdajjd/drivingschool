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
        'inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[rgba(17,19,21,0.10)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 select-none',
        'active:scale-[0.97]',
        {
          primary:
            'text-white shadow-[var(--shadow-btn)] hover:shadow-[var(--shadow-btn-hover)]',
          secondary:
            'border text-[var(--text)] shadow-[0_6px_20px_rgba(20,24,32,0.04)] backdrop-blur-xl',
          ghost:
            'text-[var(--text-muted)] hover:bg-[rgba(17,19,21,0.05)] hover:text-[var(--text)]',
          danger:
            'text-[#E5534B] shadow-none',
        }[variant],
        {
          primary: 'bg-[var(--accent)] rounded-full hover:bg-[var(--accent-deep)]',
          secondary: 'bg-[var(--surface)] border-[var(--border)] rounded-full hover:border-[var(--border-hover)] hover:bg-[var(--surface-soft)]',
          ghost: 'bg-transparent border-none rounded-full',
          danger: 'bg-[var(--surface)] border border-[rgba(229,83,75,0.18)] rounded-full hover:bg-[#FEF2F2]',
        }[variant],
        {
          sm: 'min-h-[36px] px-3 text-[13px]',
          md: 'min-h-[44px] px-4 text-[14px]',
          lg: 'min-h-[50px] px-5 text-[15px]',
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
