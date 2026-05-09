import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export function DataToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn('flex items-center gap-2 p-2 md:gap-2.5', className)}
      style={{ background: '#FFFFFF', border: '1px solid #D8E0EC', borderRadius: '16px' }}
    >
      {children}
    </div>
  )
}

export function DataRow({ children, className, selected = false }: { children: ReactNode; className?: string; selected?: boolean }) {
  return (
    <div
      className={cn('block px-3 py-2.5 transition-all duration-150 hover:bg-[#F8FAFC] md:px-3.5 md:py-3', className)}
      style={{
        background: '#FFFFFF',
        border: selected ? '2px solid #1F2BD8' : '1px solid #D8E0EC',
        borderRadius: '14px',
        boxShadow: selected ? '0 0 0 3px rgba(36,54,217,0.10)' : 'none',
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
      style={{ background: '#FFFFFF', border: '1px solid #D8E0EC', borderRadius: '16px', boxShadow: 'none' }}
    >
      {children}
    </div>
  )
}