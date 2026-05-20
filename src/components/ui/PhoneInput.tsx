import React, { useCallback, useId } from 'react'
import { cn } from '../../lib/utils'

/** Converts raw 10-digit input (without country code) to Russian display format. */
export function formatPhoneDisplay(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 0) return ''
  if (digits.length <= 3) return `+7 ${digits}`
  if (digits.length <= 6) return `+7 ${digits.slice(0, 3)} ${digits.slice(3)}`
  if (digits.length <= 8) return `+7 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
  if (digits.length <= 10) return `+7 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`
  return `+7 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`
}

export function rawPhoneDigits(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    return digits.slice(1)
  }
  if (digits.length > 10 && digits.startsWith('7')) {
    return digits.slice(1, 11)
  }
  return digits.slice(0, 10)
}

interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  disabled?: boolean
  error?: string
  label?: string
  placeholder?: string
  autoFocus?: boolean
}

export function PhoneInput({
  value,
  onChange,
  onBlur,
  disabled,
  error,
  label,
  placeholder = '+7 ',
  autoFocus,
}: PhoneInputProps) {
  const inputId = `${useId()}-phone`
  const errorId = `${inputId}-error`
  const successId = `${inputId}-success`

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(rawPhoneDigits(e.target.value))
    },
    [onChange],
  )

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault()
      onChange(value.slice(0, -1))
      return
    }
    if (['Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return
    if (e.ctrlKey || e.metaKey) return
    if (/^\d$/.test(e.key)) {
      e.preventDefault()
      onChange((value + e.key).slice(0, 10))
      return
    }
    e.preventDefault()
  }, [onChange, value])

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    onChange(rawPhoneDigits(e.clipboardData.getData('text')))
  }, [onChange])

  const displayValue = value ? formatPhoneDisplay(value) : ''
  const isComplete = value.length === 10

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label htmlFor={inputId} className="text-[13px] font-medium leading-none text-[var(--text-muted,#687381)]">
          {label}
        </label>
      )}
      <input
        id={inputId}
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={onBlur}
        disabled={disabled}
        placeholder={placeholder}
        autoFocus={autoFocus}
        name="phone"
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? errorId : isComplete ? successId : undefined}
        className={cn(
          'min-h-[52px] w-full rounded-[20px] border border-[var(--border)] bg-[rgba(255,255,255,0.66)] px-4 text-[16px] font-medium leading-none text-[var(--text)] outline-none placeholder:text-[var(--text-soft)]',
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_24px_rgba(20,24,32,0.03)] backdrop-blur-xl transition-[border-color,box-shadow,background-color] duration-150',
          'focus:border-[rgba(83,97,106,0.28)] focus:bg-[rgba(255,255,255,0.9)] focus:shadow-[0_0_0_4px_rgba(129,153,173,0.12)] disabled:cursor-not-allowed disabled:bg-[var(--surface-muted)] disabled:text-[var(--text-muted)]',
          error && '!border-[#E5534B] !shadow-[0_0_0_4px_rgba(229,83,75,0.14)]',
          disabled && 'opacity-70',
        )}
        style={{ letterSpacing: 0 }}
      />
      {error && <p id={errorId} aria-live="polite" className="text-[12px] font-medium text-[#E5534B]">{error}</p>}
      {!disabled && !error && isComplete && (
        <p id={successId} className="text-[12px] font-medium text-[#247A4B]">Номер введён верно</p>
      )}
    </div>
  )
}
