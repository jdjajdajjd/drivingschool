import type { ReactNode } from 'react'

export function StickyActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-4 border-t border-product-border bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3 backdrop-blur-xl">
      <div className="mx-auto max-w-2xl">{children}</div>
    </div>
  )
}
