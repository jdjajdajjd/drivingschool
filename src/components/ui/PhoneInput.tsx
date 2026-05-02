import React, { useCallback } from 'react'

/**
 * Converts raw 10-digit input (without country code) to display format:
 * 9027538685 → "+7 902 753 86 85"
 */
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
  if (value.trim().startsWith('+7') || value.trim().startsWith('7') || value.trim().startsWith('8')) {
    return digits.slice(1, 11)
  }
  return digits.slice(0, 10)
}

interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  error?: string
  label?: string
  placeholder?: string
  autoFocus?: boolean
}

export function PhoneInput({
  value,
  onChange,
  onBlur,
  error,
  label,
  placeholder = '+7 ',
  autoFocus,
}: PhoneInputProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(rawPhoneDigits(e.target.value))
    },
    [onChange],
  )

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return
    if (e.ctrlKey || e.metaKey) return
    if (/^\d$/.test(e.key)) return
    e.preventDefault()
  }, [])

  const displayValue = value ? formatPhoneDisplay(value) : ''
  const isComplete = value.length === 10

  return (
    <div className="input-wrap">
      {label && <label className="input-label">{label}</label>}
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={onBlur}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={['input', error ? 'input-error' : ''].join(' ')}
        style={{ fontSize: '16px', letterSpacing: value.length > 0 ? '0.04em' : 'normal' }}
      />
      {error && <p className="input-error-msg">{error}</p>}
      {!error && isComplete && (
        <p style={{ fontSize: '11px', fontWeight: 600, color: '#15803D' }}>Номер введён верно</p>
      )}
    </div>
  )
}
