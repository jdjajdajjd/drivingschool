import { cn } from '../../lib/utils'
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export function Input({ label, error, helperText, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-')
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-semibold text-product-secondary">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'ui-field h-12',
          error && 'border-product-error focus:border-product-error focus:ring-product-error-soft',
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs font-medium text-product-error">{error}</p>}
      {!error && helperText ? <p className="text-xs text-product-muted">{helperText}</p> : null}
    </div>
  )
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
}

export function Textarea({ label, error, helperText, className, id, ...props }: TextareaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-')
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-semibold text-product-secondary">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={cn(
          'w-full resize-none rounded-2xl border border-product-border bg-white px-3.5 py-2.5 text-sm text-product-main placeholder:text-product-muted transition-colors duration-150',
          'focus:border-product-primary focus:outline-none focus:ring-4 focus:ring-product-primary-soft',
          error && 'border-product-error focus:border-product-error focus:ring-product-error-soft',
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs font-medium text-product-error">{error}</p>}
      {!error && helperText ? <p className="text-xs text-product-muted">{helperText}</p> : null}
    </div>
  )
}
