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
    <nav className="bottom-nav fixed bottom-0 left-1/2 z-50 grid w-full max-w-[430px] -translate-x-1/2 grid-cols-4 border-t border-[#E4E7EC] bg-white/95 px-2 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-18px_45px_rgba(15,20,25,0.08)] backdrop-blur">
      {items.map((item) => (
        <button
          key={item.key}
          onClick={item.onClick}
          className={cn(
            'bottom-nav-item grid min-h-[54px] place-items-center gap-0.5 rounded-[16px] text-[11px] font-bold leading-none text-[#A1A5AE] transition active:scale-[0.96]',
            item.active ? 'active bg-[#EEF0FA] text-[#1F2BD8]' : 'hover:bg-[#F6F7FA] hover:text-[#050609]',
          )}
        >
          <span className="grid h-7 place-items-center">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
