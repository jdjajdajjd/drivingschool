import { cn } from '../../lib/utils'
import React, { forwardRef } from 'react'
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

void React

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, error, helperText, className, id, ...props }, ref) {
  const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-')
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label htmlFor={inputId} className="text-[13px] font-medium leading-none text-[var(--text-muted,#687381)]">
          {label}
        </label>
      )}
      <input
        id={inputId}
        ref={ref}
        className={cn(
          'min-h-[52px] w-full rounded-[20px] border border-[var(--border)] bg-[rgba(255,255,255,0.66)] px-4 text-[16px] font-medium leading-none text-[var(--text)] outline-none placeholder:text-[var(--text-soft)]',
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_24px_rgba(20,24,32,0.03)] backdrop-blur-xl transition-[border-color,box-shadow,background-color] duration-150',
          'focus:border-[rgba(83,97,106,0.28)] focus:bg-[rgba(255,255,255,0.9)] focus:shadow-[0_0_0_4px_rgba(129,153,173,0.12)] disabled:cursor-not-allowed disabled:bg-[var(--surface-muted)] disabled:text-[var(--text-muted)]',
          error && '!border-[#E5534B] !shadow-[0_0_0_4px_rgba(229,83,75,0.14)]',
          className,
        )}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
        {...props}
      />
      {error && <p id={`${inputId}-error`} aria-live="polite" className="text-[12px] font-medium" style={{ color: '#E5534B' }}>{error}</p>}
      {!error && helperText ? <p id={`${inputId}-helper`} className="text-[12px]" style={{ color: '#9EA3A8' }}>{helperText}</p> : null}
    </div>
  )
})

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
}

export function Textarea({ label, error, helperText, className, id, ...props }: TextareaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-')
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label htmlFor={inputId} className="text-[13px] font-medium leading-none text-[var(--text-muted,#687381)]">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={cn(
          'min-h-[104px] w-full resize-none rounded-[20px] border border-[var(--border)] bg-[rgba(255,255,255,0.66)] px-4 py-3 text-[16px] font-medium leading-6 text-[var(--text)] outline-none placeholder:text-[var(--text-soft)]',
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_24px_rgba(20,24,32,0.03)] backdrop-blur-xl transition-[border-color,box-shadow,background-color] duration-150',
          'focus:border-[rgba(83,97,106,0.28)] focus:bg-[rgba(255,255,255,0.9)] focus:shadow-[0_0_0_4px_rgba(129,153,173,0.12)] disabled:cursor-not-allowed disabled:bg-[var(--surface-muted)] disabled:text-[var(--text-muted)]',
          error && '!border-[#E5534B] !shadow-[0_0_0_4px_rgba(229,83,75,0.14)]',
          className,
        )}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
        {...props}
      />
      {error && <p id={`${inputId}-error`} aria-live="polite" className="text-[12px] font-medium" style={{ color: '#E5534B' }}>{error}</p>}
      {!error && helperText ? <p id={`${inputId}-helper`} className="text-[12px]" style={{ color: '#9EA3A8' }}>{helperText}</p> : null}
    </div>
  )
}
