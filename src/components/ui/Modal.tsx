import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Xmark as X } from 'iconoir-react'
import { useEffect, useId } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  const titleId = useId()
  const prefersReducedMotion = useReducedMotion()
  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined
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

  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined
    const active = document.activeElement
    if (active instanceof HTMLElement) active.blur()
    return undefined
  }, [open])

  const content = (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="v-modal-overlay fixed inset-0 z-40"
            style={{ background: 'rgba(17,20,24,0.4)', backdropFilter: 'blur(4px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
            onClick={onClose}
          />
          <div className="v-modal-shell fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-2 pt-[max(10px,env(safe-area-inset-top))] sm:items-center sm:p-4">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? titleId : undefined}
              aria-label={title ? undefined : 'Окно'}
              className="v-modal-card flex max-h-[calc(100dvh-20px)] w-full flex-col overflow-hidden overscroll-contain sm:max-h-[calc(100dvh-32px)]"
              style={{
                background: 'white',
                border: '1px solid rgba(0,0,0,0.06)',
                borderRadius: '24px',
                boxShadow: '0 30px 90px rgba(15,20,25,0.16)',
                maxWidth: size === 'sm' ? '400px' : size === 'lg' ? '720px' : '520px',
              }}
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 4 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              {title && (
                <div
                  className="v-modal-header flex shrink-0 items-center justify-between gap-3 px-5 py-4"
                  style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
                >
                  <h2 id={titleId} className="v-modal-title min-w-0 text-[18px] font-extrabold tracking-tight" style={{ color: '#111418' }}>{title}</h2>
                  <button
                    type="button"
                    aria-label="Закрыть"
                    onClick={onClose}
                    className="v-modal-close flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#111827]/10 bg-[#F8FAFC] transition-colors"
                    style={{ color: '#667085' }}
                  >
                    <X width={17} height={17} aria-hidden="true" />
                  </button>
                </div>
              )}
              <div className="v-modal-body min-h-0 overflow-y-auto">{children}</div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )

  if (typeof document === 'undefined') return content
  return createPortal(content, document.body)
}
