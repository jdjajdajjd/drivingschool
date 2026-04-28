import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export interface BottomNavItem {
  key: string
  label: string
  icon: ReactNode
  active?: boolean
  onClick: () => void
}

export function BottomNav({ items, action }: { items: BottomNavItem[]; action?: ReactNode }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2 shadow-[0_-10px_32px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-2">
        {items.map((item) => (
          <button
            key={item.key}
            onClick={item.onClick}
            className={cn(
              'flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 text-[11px] font-black transition',
              item.active ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-100 hover:text-ink-900',
            )}
          >
            <span className={cn('transition', item.active ? 'text-blue-700' : 'text-slate-400')}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </nav>
  )
}
