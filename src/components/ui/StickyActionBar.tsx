import type { ReactNode } from 'react'

export function StickyActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky-bar">
      <div className="mx-auto max-w-2xl">{children}</div>
    </div>
  )
}