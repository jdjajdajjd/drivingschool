import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export function DataToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn('flex items-center gap-2 p-2.5 md:gap-2.5', className)}
      style={{ background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(255,255,255,0.72)', borderRadius: '22px', boxShadow: 'var(--shadow-card)', backdropFilter: 'blur(20px)' }}
    >
      {children}
    </div>
  )
}

export function DataRow({ children, className, selected = false }: { children: ReactNode; className?: string; selected?: boolean }) {
  return (
    <div
      className={cn('block px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 md:px-4 md:py-3.5', className)}
      style={{
        background: selected ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.74)',
        border: selected ? '1px solid rgba(17,24,39,0.18)' : '1px solid rgba(255,255,255,0.72)',
        borderRadius: '22px',
        boxShadow: selected ? '0 0 0 4px rgba(17,24,39,0.06), var(--shadow-card)' : 'var(--shadow-card)',
        backdropFilter: 'blur(20px)',
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
      style={{ background: 'rgba(255,255,255,0.76)', border: '1px solid rgba(255,255,255,0.72)', borderRadius: '24px', boxShadow: 'var(--shadow-card)', backdropFilter: 'blur(20px)' }}
    >
      {children}
    </div>
  )
}
