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
        'inline-flex items-center justify-center gap-2 font-sans font-medium rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none',
        {
          primary:
            'bg-forest-800 text-white hover:bg-forest-700 active:bg-forest-900 shadow-soft',
          secondary:
            'bg-white text-stone-800 border border-stone-200 hover:bg-stone-50 hover:border-stone-300 active:bg-stone-100 shadow-soft',
          ghost:
            'bg-transparent text-stone-700 hover:bg-stone-100 active:bg-stone-200',
          danger:
            'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-soft',
        }[variant],
        {
          sm: 'h-8 px-3 text-sm rounded-lg',
          md: 'h-10 px-4 text-sm',
          lg: 'h-12 px-6 text-base',
        }[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
