import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export function DataToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn('flex items-center gap-2 p-2.5 md:gap-2.5 md:p-3', className)}
      style={{ background: 'rgba(255,255,255,0.84)', border: '1px solid rgba(55,38,20,0.08)', borderRadius: '22px', boxShadow: '0 14px 34px rgba(63,46,28,0.06)' }}
    >
      {children}
    </div>
  )
}

export function DataRow({ children, className, selected = false }: { children: ReactNode; className?: string; selected?: boolean }) {
  return (
    <div
      className={cn('flex items-center gap-3 px-3.5 py-3 transition-all duration-150 hover:-translate-y-px md:gap-3.5 md:px-4 md:py-3.5', className)}
      style={{
        background: 'rgba(255,255,255,0.92)',
        border: selected ? '2px solid #15120E' : '1px solid rgba(55,38,20,0.08)',
        borderRadius: '22px',
        boxShadow: selected ? '0 0 0 3px rgba(17,20,24,0.10)' : '0 14px 34px rgba(63,46,28,0.07)',
      }}
    >
      {children}
    </div>
  )
}

export function TableShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn('overflow-hidden', className)}
      style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(55,38,20,0.08)', borderRadius: '28px', boxShadow: '0 18px 42px rgba(63,46,28,0.08)' }}
    >
      {children}
    </div>
  )
}