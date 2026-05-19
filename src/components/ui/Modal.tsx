import { AnimatePresence, motion } from 'framer-motion'
import { Xmark as X } from 'iconoir-react'
import { useEffect } from 'react'
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

  const content = (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(17,20,24,0.4)', backdropFilter: 'blur(4px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div
              className="flex max-h-[calc(100dvh-24px)] w-full flex-col overflow-hidden"
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
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              {title && (
                <div
                  className="flex shrink-0 items-center justify-between gap-3 px-5 py-4"
                  style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
                >
                  <h2 className="text-[18px] font-extrabold tracking-tight" style={{ color: '#111418' }}>{title}</h2>
                  <button
                    type="button"
                    aria-label="Закрыть"
                    onClick={onClose}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#111827]/10 bg-[#F8FAFC] transition-colors"
                    style={{ color: '#9EA3A8' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#F4F5F6'; e.currentTarget.style.color = '#111418' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.color = '#9EA3A8' }}
                  >
                    <X width={17} height={17} />
                  </button>
                </div>
              )}
              <div className="min-h-0 overflow-y-auto">{children}</div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )

  if (typeof document === 'undefined') return content
  return createPortal(content, document.body)
}
