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
        <label htmlFor={inputId} className="text-[13px] font-extrabold leading-none text-[var(--text-muted,#6F655C)]">
          {label}
        </label>
      )}
      <input
        id={inputId}
        ref={ref}
        className={cn(
          'min-h-[52px] w-full rounded-[15px] border border-[var(--border-strong,rgba(0,0,0,0.10))] bg-white px-4 text-[16px] font-extrabold leading-none text-[var(--text,#15120E)] outline-none placeholder:text-[var(--text-soft,#A09488)]',
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-[border-color,box-shadow,background-color] duration-150',
          'focus:border-[#1F2BD8] focus:shadow-[0_0_0_4px_rgba(31,43,216,0.12)] disabled:cursor-not-allowed disabled:bg-[var(--surface-muted,#F2ECE2)] disabled:text-[var(--text-muted,#6F655C)]',
          error && '!border-[#E5534B] !shadow-[0_0_0_4px_rgba(229,83,75,0.14)]',
          className,
        )}
        {...props}
      />
      {error && <p className="text-[12px] font-medium" style={{ color: '#E5534B' }}>{error}</p>}
      {!error && helperText ? <p className="text-[12px]" style={{ color: '#9EA3A8' }}>{helperText}</p> : null}
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
        <label htmlFor={inputId} className="text-[13px] font-extrabold leading-none text-[var(--text-muted,#6F655C)]">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={cn(
          'min-h-[104px] w-full resize-none rounded-[15px] border border-[var(--border-strong,rgba(0,0,0,0.10))] bg-white px-4 py-3 text-[16px] font-bold leading-6 text-[var(--text,#15120E)] outline-none placeholder:text-[var(--text-soft,#A09488)]',
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-[border-color,box-shadow,background-color] duration-150',
          'focus:border-[#1F2BD8] focus:shadow-[0_0_0_4px_rgba(31,43,216,0.12)] disabled:cursor-not-allowed disabled:bg-[var(--surface-muted,#F2ECE2)] disabled:text-[var(--text-muted,#6F655C)]',
          error && '!border-[#E5534B] !shadow-[0_0_0_4px_rgba(229,83,75,0.14)]',
          className,
        )}
        {...props}
      />
      {error && <p className="text-[12px] font-medium" style={{ color: '#E5534B' }}>{error}</p>}
      {!error && helperText ? <p className="text-[12px]" style={{ color: '#9EA3A8' }}>{helperText}</p> : null}
    </div>
  )
}
