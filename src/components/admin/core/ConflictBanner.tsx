import type { ReactNode } from 'react'
import { WarningCircle, Xmark } from '@/components/icons/lucide'

interface ConflictBannerProps {
  message: string
  action?: ReactNode
  onDismiss?: () => void
}

export function ConflictBanner({ message, action, onDismiss }: ConflictBannerProps) {
  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-error/30 bg-error-soft p-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-error text-white">
        <WarningCircle width={16} height={16} strokeWidth={2.5} />
      </div>
      <p className="flex-1 text-[13px] font-bold text-error">{message}</p>
      {action}
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="shrink-0 rounded-[8px] p-1.5 text-text-muted hover:bg-error/10">
          <Xmark width={14} height={14} strokeWidth={2.5} />
        </button>
      )}
    </div>
  )
}
