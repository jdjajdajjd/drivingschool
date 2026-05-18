

type StatusType = 'success' | 'warning' | 'error' | 'info' | 'neutral'

interface StatusPillProps {
  label: string
  status?: StatusType
  size?: 'sm' | 'md'
}

const statusStyles: Record<StatusType, string> = {
  success: 'bg-success-soft text-success border-success/20',
  warning: 'bg-warning-soft text-warning border-warning/20',
  error: 'bg-error-soft text-error border-error/20',
  info: 'bg-info-soft text-info border-info/20',
  neutral: 'bg-surface-soft text-text-muted border-border',
}

export function StatusPill({ label, status = 'neutral', size = 'md' }: StatusPillProps) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-bold ${
      size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'
    } ${statusStyles[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full bg-current`} />
      {label}
    </span>
  )
}
