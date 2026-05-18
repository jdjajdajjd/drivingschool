import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

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
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        ref={sheetRef}
        className={`absolute bottom-0 left-0 right-0 max-h-[90dvh] overflow-auto rounded-t-[24px] bg-surface p-5 pb-[calc(16px+env(safe-area-inset-bottom))] shadow-floating animate-slide-up ${className}`}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border-strong" />
        {title && <h2 className="mb-4 text-[17px] font-black text-ink">{title}</h2>}
        {children}
      </div>
    </div>
  )
}
