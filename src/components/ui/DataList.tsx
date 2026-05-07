import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export function DataToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn('flex items-center gap-2 p-2 md:gap-2.5 md:p-2.5', className)}
      style={{ background: '#FFFFFF', border: '1px solid #D8E0EC', borderRadius: '16px', boxShadow: '0 10px 24px rgba(35,47,78,0.08)' }}
    >
      {children}
    </div>
  )
}

export function DataRow({ children, className, selected = false }: { children: ReactNode; className?: string; selected?: boolean }) {
  return (
    <div
      className={cn('flex items-center gap-3 px-3 py-2.5 transition-all duration-150 hover:-translate-y-px md:gap-3.5 md:px-3.5 md:py-3', className)}
      style={{
        background: '#FFFFFF',
        border: selected ? '2px solid #1026D8' : '1px solid #D8E0EC',
        borderRadius: '16px',
        boxShadow: selected ? '0 0 0 3px rgba(16,38,216,0.12)' : '0 10px 24px rgba(35,47,78,0.08)',
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
      style={{ background: '#FFFFFF', border: '1px solid rgba(55,38,20,0.08)', borderRadius: '28px', boxShadow: '0 18px 42px rgba(63,46,28,0.08)' }}
    >
      {children}
    </div>
  )
}