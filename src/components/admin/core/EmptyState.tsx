import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 text-center ${className}`}>
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[18px] border border-border bg-surface-soft">{icon}</div>
      )}
      <h3 className="text-[15px] font-bold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-[260px] text-[13px] text-text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
