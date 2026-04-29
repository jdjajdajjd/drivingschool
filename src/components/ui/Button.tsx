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
        'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl font-display font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-product-primary-soft disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-product-border disabled:bg-product-alt disabled:text-product-muted select-none',
        {
          primary:
            'border border-product-primary bg-product-primary text-white shadow-[0_10px_24px_rgba(75,87,209,0.16)] hover:border-product-primary-dark hover:bg-product-primary-dark active:shadow-none',
          secondary:
            'border border-product-border bg-white text-product-main hover:border-product-primary/30 hover:bg-product-primary-soft active:bg-product-primary-soft',
          ghost:
            'border border-transparent bg-transparent text-product-secondary hover:bg-product-alt hover:text-product-main active:bg-product-alt',
          danger:
            'border border-red-200 bg-white text-red-700 hover:border-red-300 hover:bg-red-50 active:bg-red-100',
        }[variant],
        {
          sm: 'h-11 px-3.5 text-sm rounded-2xl',
          md: 'h-[52px] px-4 text-base',
          lg: 'h-[52px] px-5 text-base',
        }[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
