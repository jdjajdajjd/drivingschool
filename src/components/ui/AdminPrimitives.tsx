import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export function AdminPageShell({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto max-w-7xl p-4 md:p-6', className)}>{children}</div>
}

export function AdminFilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-black/10 bg-white p-3 ', className)}>
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
          default: 'border-black/10 bg-[#F4F5F6]',
          primary: 'border-[#F6B84D]/20 bg-[#F6B84D]/10',
          success: 'border-[#15803D]/15 bg-[#F0FDF4]',
          warning: 'border-[#B45309]/15 bg-[#FFFBEB]',
          danger: 'border-[#E5534B]/15 bg-[#FEF2F2]',
        }[tone],
        className,
      )}
    >
      <p className="caption">{label}</p>
      <div className="mt-1 text-[14px] font-semibold text-[#111418]">{value}</div>
      {meta ? <div className="mt-1 text-[13px] text-[#6F747A]">{meta}</div> : null}
    </div>
  )
}

export function AdminActionGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid gap-2 sm:grid-cols-2 lg:flex lg:justify-end', className)}>{children}</div>
}
