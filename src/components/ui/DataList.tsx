import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export function DataToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn('flex items-center gap-2.5 p-3', className)}
      style={{ background: 'white', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '18px' }}
    >
      {children}
    </div>
  )
}

export function DataRow({ children, className, selected = false }: { children: ReactNode; className?: string; selected?: boolean }) {
  return (
    <div
      className={cn('flex items-center gap-3.5 px-4 py-3.5 transition-all duration-150 hover:-translate-y-px', className)}
      style={{
        background: 'white',
        border: selected ? '2px solid #F6B84D' : '1px solid rgba(0,0,0,0.06)',
        borderRadius: '18px',
        boxShadow: selected ? '0 0 0 3px rgba(246,184,77,0.15)' : '0 18px 45px rgba(15,20,25,0.10)',
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
      style={{ background: 'white', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '24px', boxShadow: '0 18px 45px rgba(15,20,25,0.10)' }}
    >
      {children}
    </div>
  )
}