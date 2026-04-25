import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-3xl border border-dashed border-stone-200 bg-white px-6 py-14 text-center shadow-soft">
      {icon ? <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-stone-100 text-stone-400">{icon}</div> : null}
      <p className="text-lg font-semibold text-stone-900">{title}</p>
      {description ? <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-500">{description}</p> : null}
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  )
}
