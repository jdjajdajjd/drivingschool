import { useCallback } from 'react'

/**
 * Formats raw phone digits into readable display:
 * +7 902 753 86 85
 */
export function formatPhoneDisplay(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 0) return ''
  if (digits.length === 1) return `+${digits}`
  if (digits.length === 2) return `+${digits.slice(0, 1)} ${digits.slice(1)}`
  if (digits.length === 3) return `+${digits.slice(0, 1)} ${digits.slice(1)}`
  if (digits.length === 4) return `+${digits.slice(0, 1)} ${digits.slice(1, 4)}`
  if (digits.length === 5) return `+${digits.slice(0, 1)} ${digits.slice(1, 4)} ${digits.slice(4)}`
  if (digits.length === 6) return `+${digits.slice(0, 1)} ${digits.slice(1, 4)} ${digits.slice(4)}`
  if (digits.length === 7) return `+${digits.slice(0, 1)} ${digits.slice(1, 4)} ${digits.slice(4, 7)}`
  if (digits.length === 8) return `+${digits.slice(0, 1)} ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
  if (digits.length === 9) return `+${digits.slice(0, 1)} ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
  if (digits.length === 10) return `+${digits.slice(0, 1)} ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)}`
  if (digits.length === 11) return `+${digits.slice(0, 1)} ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9)}`
  return `+${digits.slice(0, 1)} ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9, 11)}`
}

export function rawPhoneDigits(value: string): string {
  return value.replace(/\D/g, '')
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
  placeholder = '+7',
  autoFocus,
}: PhoneInputProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = rawPhoneDigits(e.target.value)
      const limited = raw.slice(0, 11)
      onChange(limited)
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
  const digits = rawPhoneDigits(value)
  const isComplete = digits.length === 11

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
        style={{ fontSize: '16px', letterSpacing: digits.length > 0 ? '0.04em' : 'normal' }}
      />
      {error && <p className="input-error-msg">{error}</p>}
      {!error && isComplete && (
        <p style={{ fontSize: '11px', fontWeight: 600, color: '#15803D' }}>Номер введён верно</p>
      )}
    </div>
  )
}
