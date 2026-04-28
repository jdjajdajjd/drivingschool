import type { CSSProperties, ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'forest' | 'outline'
  size?: 'sm' | 'md'
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export function Badge({
  variant = 'default',
  size = 'sm',
  children,
  className,
  style,
}: BadgeProps) {
  return (
    <span
      style={style}
      className={cn(
        'inline-flex items-center rounded-lg border font-sans font-bold whitespace-nowrap',
        {
          default: 'border-slate-200 bg-slate-100 text-slate-700',
          success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
          warning: 'border-amber-200 bg-amber-50 text-amber-700',
          error: 'border-red-200 bg-red-50 text-red-700',
          forest: 'border-blue-200 bg-blue-50 text-blue-700',
          outline: 'border-slate-200 bg-white text-slate-600',
        }[variant],
        {
          sm: 'px-2.5 py-1 text-xs',
          md: 'px-3 py-1 text-sm',
        }[size],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function StatusBadge({ status, kind = 'booking' }: { status: string; kind?: 'booking' | 'slot' }) {
  const map: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    active: { label: 'Активна', variant: 'success' },
    cancelled: { label: kind === 'slot' ? 'Отменено' : 'Отменена', variant: 'error' },
    completed: { label: 'Проведена', variant: 'default' },
    available: { label: 'Свободно', variant: 'forest' },
    booked: { label: 'Занято', variant: 'warning' },
    pending: { label: 'Активна', variant: 'warning' },
    confirmed: { label: 'Активна', variant: 'success' },
  }

  const entry = map[status] ?? { label: status, variant: 'default' as const }
  return <Badge variant={entry.variant}>{entry.label}</Badge>
}
