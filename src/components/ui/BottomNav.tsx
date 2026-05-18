import type { ReactNode } from 'react'
import React from 'react'
import { cn } from '../../lib/utils'

void React

export interface BottomNavItem {
  key: string
  label: string
  icon: ReactNode
  active?: boolean
  onClick: () => void
}

export function BottomNav({ items }: { items: BottomNavItem[] }) {
  return (
    <nav className="bottom-nav fixed bottom-0 left-1/2 z-50 grid w-[calc(100%_-_18px)] max-w-[430px] -translate-x-1/2 grid-cols-4 bg-[rgba(249,251,253,0.82)] px-2 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-20px_44px_rgba(32,45,62,0.08)] backdrop-blur-2xl">
      {items.map((item) => (
        <button
          key={item.key}
          onClick={item.onClick}
          className={cn(
            'bottom-nav-item grid min-h-[54px] place-items-center gap-0.5 rounded-[22px] text-[11px] leading-none text-[#8B98A7] transition active:scale-[0.96]',
            item.active ? 'active bg-white text-[#111827] shadow-[0_10px_24px_rgba(32,45,62,0.10)] ring-1 ring-[#DCE7F2]' : 'hover:bg-white/55 hover:text-[#394756]',
          )}
        >
          <span className="grid h-7 place-items-center text-current">{item.icon}</span>
          <span className="font-normal">{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
