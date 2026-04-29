import type { ReactNode } from 'react'

interface FormFieldProps {
  label: string
  helperText?: string
  error?: string
  children: ReactNode
}

export function FormField({ label, helperText, error, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-product-secondary">{label}</label>
      {children}
      {error ? <p className="text-xs font-medium text-product-error">{error}</p> : null}
      {!error && helperText ? <p className="text-xs text-product-muted">{helperText}</p> : null}
    </div>
  )
}
