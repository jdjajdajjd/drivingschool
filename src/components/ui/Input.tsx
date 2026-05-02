import { cn } from '../../lib/utils'
import React from 'react'
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

void React

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
        <label htmlFor={inputId} className="label">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'field',
          error && '!border-[#E5534B] !shadow-[0_0_0_3px_rgba(229,83,75,0.15)]',
          className,
        )}
        {...props}
      />
      {error && <p className="text-[12px] font-medium" style={{ color: '#E5534B' }}>{error}</p>}
      {!error && helperText ? <p className="text-[12px]" style={{ color: '#9EA3A8' }}>{helperText}</p> : null}
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
        <label htmlFor={inputId} className="label">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={cn(
          'w-full resize-none rounded-xl border border-[rgba(0,0,0,0.06)] bg-white px-4 py-3 text-[15px] font-medium text-[#111418] placeholder:text-[#9EA3A8] transition-all duration-200 outline-none',
          'focus:border-[#2436D9] focus:shadow-[0_0_0_3px_rgba(36,54,217,0.14)]',
          error && '!border-[#E5534B] focus:shadow-[0_0_0_3px_rgba(229,83,75,0.15)]',
          className,
        )}
        {...props}
      />
      {error && <p className="text-[12px] font-medium" style={{ color: '#E5534B' }}>{error}</p>}
      {!error && helperText ? <p className="text-[12px]" style={{ color: '#9EA3A8' }}>{helperText}</p> : null}
    </div>
  )
}
