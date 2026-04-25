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
        <label htmlFor={inputId} className="text-sm font-medium text-stone-700">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'w-full rounded-2xl border border-stone-200 bg-white px-3.5 text-[15px] text-stone-900 placeholder:text-stone-400 transition-colors duration-150',
          'h-11 focus:border-forest-300 focus:outline-none focus:ring-4 focus:ring-forest-100',
          error && 'border-red-300 focus:border-red-300 focus:ring-red-100',
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      {!error && helperText ? <p className="text-xs text-stone-500">{helperText}</p> : null}
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
        <label htmlFor={inputId} className="text-sm font-medium text-stone-700">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={cn(
          'w-full resize-none rounded-2xl border border-stone-200 bg-white px-3.5 py-3 text-[15px] text-stone-900 placeholder:text-stone-400 transition-colors duration-150',
          'focus:border-forest-300 focus:outline-none focus:ring-4 focus:ring-forest-100',
          error && 'border-red-300 focus:border-red-300 focus:ring-red-100',
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      {!error && helperText ? <p className="text-xs text-stone-500">{helperText}</p> : null}
    </div>
  )
}
