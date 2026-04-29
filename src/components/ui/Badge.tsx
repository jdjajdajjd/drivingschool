import type { CSSProperties, ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'forest' | 'outline' | 'info' | 'muted'
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
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-sans font-semibold',
        {
          default: 'border-product-border bg-product-alt text-product-secondary',
          success: 'border-product-success-border bg-product-success-soft text-product-success',
          warning: 'border-transparent bg-product-warning-soft text-product-warning',
          error: 'border-transparent bg-product-error-soft text-product-error',
          forest: 'border-product-primary-border bg-product-primary-soft text-product-primary',
          outline: 'border-product-border bg-white text-product-secondary',
          info: 'border-product-primary-border bg-product-primary-soft text-product-primary',
          muted: 'border-product-border bg-[#EEF1F7] text-product-secondary',
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
    completed: { label: 'Проведена', variant: 'muted' },
    available: { label: 'Свободно', variant: 'forest' },
    booked: { label: 'Занято', variant: 'warning' },
    pending: { label: 'Ожидает', variant: 'warning' },
    confirmed: { label: 'Подтверждена', variant: 'success' },
  }

  const entry = map[status] ?? { label: status, variant: 'default' as const }
  return <Badge variant={entry.variant}>{entry.label}</Badge>
}

export function AvailabilityBadge({ available, label }: { available: boolean; label?: string }) {
  return <Badge variant={available ? 'success' : 'muted'}>{label ?? (available ? 'Свободно' : 'Нет мест')}</Badge>
}
