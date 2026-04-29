import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-product-border bg-product-alt px-5 py-10 text-center">
      {icon ? <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-product-muted shadow-sm">{icon}</div> : null}
      <p className="text-lg font-bold text-ink-900">{title}</p>
      {description ? <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-product-secondary">{description}</p> : null}
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  )
}
