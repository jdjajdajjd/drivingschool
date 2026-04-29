import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export function AdminPageShell({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto max-w-7xl p-4 md:p-6', className)}>{children}</div>
}

export function AdminFilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-[24px] border border-product-border bg-white p-3 shadow-soft', className)}>
      {children}
    </div>
  )
}

export function AdminInfoTile({
  label,
  value,
  meta,
  tone = 'default',
  className,
}: {
  label: string
  value: ReactNode
  meta?: ReactNode
  tone?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-[20px] border px-4 py-3',
        {
          default: 'border-product-border bg-product-alt',
          primary: 'border-product-primary-border bg-product-primary-soft',
          success: 'border-product-success-border bg-product-success-soft',
          warning: 'border-transparent bg-product-warning-soft',
          danger: 'border-transparent bg-product-error-soft',
        }[tone],
        className,
      )}
    >
      <p className="ui-kicker">{label}</p>
      <div className="mt-1 text-sm font-semibold text-product-main">{value}</div>
      {meta ? <div className="mt-1 text-sm text-product-secondary">{meta}</div> : null}
    </div>
  )
}

export function AdminActionGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid gap-2 sm:grid-cols-2 lg:flex lg:justify-end', className)}>{children}</div>
}
