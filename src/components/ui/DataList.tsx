import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export function DataToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-[24px] border border-product-border bg-white p-3 shadow-soft', className)}>{children}</div>
}

export function DataRow({ children, className, selected = false }: { children: ReactNode; className?: string; selected?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-[22px] border border-product-border bg-white px-4 py-3 shadow-soft transition hover:border-product-primary/30 hover:bg-product-primary-soft/45',
        selected && 'ui-selected',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function TableShell({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('overflow-hidden rounded-[24px] border border-product-border bg-white shadow-soft', className)}>{children}</div>
}
