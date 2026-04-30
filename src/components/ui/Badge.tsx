import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'accent' | 'outline' | 'info' | 'muted'
  size?: 'sm' | 'md'
  children: ReactNode
  className?: string
  style?: React.CSSProperties
}

export function Badge({
  variant = 'default',
  size = 'sm',
  children,
  className,
  style,
}: BadgeProps) {
  const variants: Record<string, { bg: string; color: string; border: string }> = {
    default: { bg: '#F4F5F6', color: '#6F747A', border: 'rgba(0,0,0,0.06)' },
    success: { bg: '#F0FDF4', color: '#15803D', border: 'rgba(21,128,61,0.15)' },
    warning: { bg: '#FFFBEB', color: '#B45309', border: 'rgba(180,83,9,0.15)' },
    error: { bg: '#FEF2F2', color: '#E5534B', border: 'rgba(229,83,75,0.15)' },
    accent: { bg: 'rgba(246,184,77,0.12)', color: '#C97F10', border: 'rgba(246,184,77,0.20)' },
    outline: { bg: 'transparent', color: '#6F747A', border: 'rgba(0,0,0,0.10)' },
    info: { bg: '#EFF6FF', color: '#1D4ED8', border: 'rgba(29,78,216,0.15)' },
    muted: { bg: '#F4F5F6', color: '#9EA3A8', border: 'rgba(0,0,0,0.06)' },
  }
  const v = variants[variant] ?? variants.default
  return (
    <span
      style={{ background: v.bg, color: v.color, borderColor: v.border, ...style }}
      className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm border font-semibold', size === 'sm' ? 'px-2.5 py-0.5 text-[12px]' : 'px-3 py-1 text-[13px]', className)}
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
    available: { label: 'Свободно', variant: 'success' },
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