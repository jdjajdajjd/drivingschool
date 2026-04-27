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
        'inline-flex items-center justify-center gap-2 whitespace-nowrap font-sans font-medium rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-300 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-100 disabled:text-stone-400 select-none',
        {
          primary:
            'border border-forest-700 bg-forest-700 text-white hover:bg-forest-600 hover:border-forest-600 active:bg-forest-800 active:border-forest-800',
          secondary:
            'border border-stone-200 bg-white text-stone-800 hover:border-stone-300 hover:bg-stone-50 active:bg-stone-100',
          ghost:
            'border border-transparent bg-transparent text-stone-600 hover:bg-stone-100 hover:text-stone-900 active:bg-stone-200',
          danger:
            'border border-red-200 bg-white text-red-700 hover:border-red-300 hover:bg-red-50 active:bg-red-100',
        }[variant],
        {
          sm: 'h-9 px-3.5 text-sm rounded-lg',
          md: 'h-9.5 px-4 text-sm',
          lg: 'h-10 px-4.5 text-sm',
        }[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
