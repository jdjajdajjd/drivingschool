import { cn } from '../../lib/utils'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap font-extrabold transition-all duration-150 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#F6B84D]/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 select-none',
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
          primary: 'bg-[#050607] rounded-full',
          secondary: 'bg-white border-[rgba(0,0,0,0.06)] rounded-full hover:border-[rgba(0,0,0,0.10)] hover:shadow-[0_14px_32px_rgba(0,0,0,0.12)]',
          ghost: 'bg-transparent border-none rounded-full',
          danger: 'bg-white border border-[rgba(229,83,75,0.15)] rounded-full hover:bg-[#FEF2F2]',
        }[variant],
        {
          sm: 'h-9 px-4 text-[13px]',
          md: 'h-11 px-5 text-[15px]',
          lg: 'h-13 px-6 text-[15px]',
        }[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
