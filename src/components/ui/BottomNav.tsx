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
    <nav className="bottom-nav">
      {items.map((item) => (
        <button
          key={item.key}
          onClick={item.onClick}
          className={cn(
            'bottom-nav-item',
            item.active ? 'active' : '',
          )}
        >
          <span className="relative">
            {item.icon}
            {item.active && <span className="bottom-nav-dot" />}
          </span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
