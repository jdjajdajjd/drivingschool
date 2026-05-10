import type { ReactNode } from 'react'

interface CompactHeaderProps {
  title: string
  subtitle?: string
  back?: () => void
  actions?: ReactNode
  className?: string
}

export function CompactHeader({ title, subtitle, back, actions, className = '' }: CompactHeaderProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {back && (
        <button type="button" onClick={back}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-border bg-surface">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[17px] font-black text-ink">{title}</h1>
        {subtitle && <p className="truncate text-[12px] text-text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  )
}
