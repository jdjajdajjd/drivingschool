import type { ReactNode } from 'react'

interface ConflictBannerProps {
  message: string
  action?: ReactNode
  onDismiss?: () => void
}

export function ConflictBanner({ message, action, onDismiss }: ConflictBannerProps) {
  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-error/30 bg-error-soft p-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-error text-white">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      </div>
      <p className="flex-1 text-[13px] font-bold text-error">{message}</p>
      {action}
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="shrink-0 rounded-[8px] p-1.5 text-text-muted hover:bg-error/10">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </button>
      )}
    </div>
  )
}
