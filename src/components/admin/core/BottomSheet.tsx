import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Xmark } from 'iconoir-react'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
}

export function BottomSheet({ open, onClose, title, children, className = '' }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose, open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        className={`absolute bottom-0 left-0 right-0 mx-auto flex max-h-[92dvh] max-w-3xl flex-col overflow-hidden rounded-t-[24px] bg-surface shadow-floating animate-slide-up md:bottom-auto md:top-1/2 md:max-h-[min(760px,calc(100dvh-32px))] md:-translate-y-1/2 md:rounded-[24px] ${className}`}
      >
        <div className="shrink-0 border-b border-border bg-surface px-5 pb-3 pt-4">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border-strong md:hidden" />
          <div className="flex items-center justify-between gap-3">
            {title ? <h2 className="min-w-0 truncate text-[17px] font-black text-ink">{title}</h2> : <span />}
            <button type="button" aria-label="Закрыть" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-muted text-muted-foreground transition hover:bg-surface hover:text-ink">
              <Xmark width={17} height={17} />
            </button>
          </div>
        </div>
        <div className="min-h-0 overflow-auto p-5 pb-[calc(16px+env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  )
}
