import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'forest' | 'outline'
  size?: 'sm' | 'md'
  children: ReactNode
  className?: string
}

export function Badge({
  variant = 'default',
  size = 'sm',
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-sans font-medium',
        {
          default: 'bg-stone-100 text-stone-700',
          success: 'bg-emerald-50 text-emerald-700',
          warning: 'bg-amber-50 text-amber-700',
          error: 'bg-red-50 text-red-700',
          forest: 'bg-forest-50 text-forest-700',
          outline: 'border border-stone-200 bg-white text-stone-600',
        }[variant],
        {
          sm: 'px-2.5 py-1 text-[11px]',
          md: 'px-3 py-1 text-sm',
        }[size],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    active: { label: 'Активна', variant: 'success' },
    cancelled: { label: 'Отменена', variant: 'error' },
    completed: { label: 'Проведена', variant: 'default' },
    available: { label: 'Свободно', variant: 'forest' },
    booked: { label: 'Занято', variant: 'warning' },
    pending: { label: 'Активна', variant: 'warning' },
    confirmed: { label: 'Активна', variant: 'success' },
  }

  const entry = map[status] ?? { label: status, variant: 'default' as const }
  return <Badge variant={entry.variant}>{entry.label}</Badge>
}
