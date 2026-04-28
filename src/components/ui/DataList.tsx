import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export function DataToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-2xl border border-slate-200 bg-white p-3 shadow-soft', className)}>{children}</div>
}

export function DataRow({ children, className, selected = false }: { children: ReactNode; className?: string; selected?: boolean }) {
  return (
    <div className={cn('rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm transition hover:border-blue-100 hover:bg-blue-50/20', selected && 'ui-selected', className)}>
      {children}
    </div>
  )
}

export function TableShell({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft', className)}>{children}</div>
}
