import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export function AdminPageShell({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto max-w-7xl p-4 md:p-6', className)}>{children}</div>
}

export function AdminFilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-2xl border rgba(0,0,0,0.06) white p-3 ', className)}>
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
        'rounded-2xl border px-3.5 py-3',
        {
          default: 'rgba(0,0,0,0.06) #F4F5F6',
          primary: 'rgba(246,184,77,0.20) rgba(246,184,77,0.12)',
          success: 'rgba(21,128,61,0.15) #F0FDF4',
          warning: 'rgba(180,83,9,0.15) #FFFBEB',
          danger: 'rgba(229,83,75,0.15) #FEF2F2',
        }[tone],
        className,
      )}
    >
      <p className="caption">{label}</p>
      <div className="mt-1 text-[14px] font-semibold #111418">{value}</div>
      {meta ? <div className="mt-1 text-[13px] #6F747A">{meta}</div> : null}
    </div>
  )
}

export function AdminActionGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid gap-2 sm:grid-cols-2 lg:flex lg:justify-end', className)}>{children}</div>
}