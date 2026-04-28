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
        'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-sans font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 select-none',
        {
          primary:
            'border border-blue-700 bg-blue-700 text-white shadow-[0_10px_24px_rgba(37,99,235,0.20)] hover:border-blue-600 hover:bg-blue-600 active:border-blue-800 active:bg-blue-800 active:shadow-none',
          secondary:
            'border border-slate-200 bg-white text-ink-800 hover:border-blue-200 hover:bg-blue-50/50 active:bg-blue-50',
          ghost:
            'border border-transparent bg-transparent text-slate-600 hover:bg-slate-100 hover:text-ink-900 active:bg-slate-200',
          danger:
            'border border-red-200 bg-white text-red-700 hover:border-red-300 hover:bg-red-50 active:bg-red-100',
        }[variant],
        {
          sm: 'h-9 px-3.5 text-sm rounded-lg',
          md: 'h-10 px-4 text-sm',
          lg: 'h-11 px-5 text-sm',
        }[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
