import { createContext, useContext, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'
import { cn } from '../../lib/utils'

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 items-end pointer-events-none"
        aria-live="polite"
        aria-label="Уведомления"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.94, y: 8 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                'flex items-center gap-3 pl-4 pr-3 py-3 rounded-2xl text-sm font-medium pointer-events-auto min-w-[260px] max-w-[400px]',
                toast.type === 'success' && 'bg-stone-900 text-white shadow-modal',
                toast.type === 'error' && 'bg-red-600 text-white shadow-modal',
                toast.type === 'info' && 'bg-stone-700 text-white shadow-modal',
              )}
            >
              {toast.type === 'success' && (
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
              )}
              {toast.type === 'error' && (
                <XCircle size={15} className="text-red-200 shrink-0" />
              )}
              {toast.type === 'info' && (
                <Info size={15} className="text-stone-300 shrink-0" />
              )}
              <span className="flex-1 leading-snug">{toast.message}</span>
              <button
                onClick={() => dismiss(toast.id)}
                className="ml-1 p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                aria-label="Закрыть"
              >
                <X size={12} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
