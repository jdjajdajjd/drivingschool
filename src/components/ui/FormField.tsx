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
      <label className="text-[13px] font-semibold #6F747A">{label}</label>
      {children}
      {error ? <p className="text-[12px] font-medium #E5534B">{error}</p> : null}
      {!error && helperText ? <p className="text-[12px] #9EA3A8">{helperText}</p> : null}
    </div>
  )
}