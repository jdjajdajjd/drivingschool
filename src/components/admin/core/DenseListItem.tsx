import type { ReactNode } from 'react'

interface DenseListItemProps {
  avatar?: ReactNode
  title: string
  subtitle?: string
  meta?: string
  badge?: ReactNode
  right?: ReactNode
  onClick?: () => void
  className?: string
}

export function DenseListItem({ avatar, title, subtitle, meta, badge, right, onClick, className = '' }: DenseListItemProps) {
  return (
    <button type="button" onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-[14px] border border-border bg-surface px-3 py-2.5 text-left transition hover:border-border-strong active:scale-[0.99] ${className}`}>
      {avatar && (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-surface-soft">{avatar}</div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[14px] font-bold text-ink">{title}</span>
          {badge}
        </div>
        {subtitle && <p className="truncate text-[12px] text-text-muted">{subtitle}</p>}
        {meta && <p className="mt-0.5 text-[11px] font-medium text-text-soft">{meta}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </button>
  )
}
