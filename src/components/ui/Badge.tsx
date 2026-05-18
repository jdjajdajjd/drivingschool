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
    default: { bg: '#F2F6FA', color: '#667381', border: 'rgba(17,24,39,0.07)' },
    success: { bg: '#EAF6EE', color: '#247A4B', border: 'rgba(36,122,75,0.16)' },
    warning: { bg: '#EAF3FF', color: '#315A7C', border: 'rgba(161,92,7,0.16)' },
    error: { bg: '#FEF2F2', color: '#D1433C', border: 'rgba(209,67,60,0.16)' },
    accent: { bg: '#EAF3FF', color: '#111827', border: 'rgba(17,24,39,0.08)' },
    outline: { bg: 'rgba(255,255,255,0.62)', color: '#667381', border: 'rgba(17,24,39,0.10)' },
    info: { bg: '#EAF4FF', color: '#315A7C', border: 'rgba(49,90,124,0.15)' },
    muted: { bg: '#F2F6FA', color: '#8A96A3', border: 'rgba(17,24,39,0.06)' },
  }
  const v = variants[variant] ?? variants.default
  return (
    <span
      style={{ background: v.bg, color: v.color, borderColor: v.border, ...style }}
      className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-medium', size === 'sm' ? 'px-2.5 py-1 text-[12px]' : 'px-3 py-1.5 text-[13px]', className)}
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
