import type { ReactNode } from 'react'
import { NavArrowLeft } from '@/components/icons/lucide'

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
          <NavArrowLeft width={16} height={16} strokeWidth={2.5} />
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
