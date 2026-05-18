import React, { createContext, useContext, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cancel01Icon, CancelCircleIcon, CheckmarkCircle02Icon, InformationCircleIcon } from '@hugeicons/core-free-icons'
import { cn } from '../../lib/utils'
import { createHugeIcon } from './HugeIcon'

const CheckCircle2 = createHugeIcon(CheckmarkCircle02Icon)
const XCircle = createHugeIcon(CancelCircleIcon)
const Info = createHugeIcon(InformationCircleIcon)
const X = createHugeIcon(Cancel01Icon)

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
        className="pointer-events-none fixed left-4 right-4 top-4 z-[100] flex flex-col items-stretch gap-2 sm:left-auto sm:right-6 sm:top-6 sm:items-end"
        aria-live="polite"
        aria-label="Уведомления"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94, y: 8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                'pointer-events-auto flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-[14px] font-medium shadow-[0_8px_24px_rgba(15,20,25,0.12)] sm:min-w-[260px] sm:max-w-[380px]',
                toast.type === 'success' && 'rgba(0,0,0,0.06) bg-warm-main text-white',
                toast.type === 'error' && 'rgba(229,83,75,0.15) bg-error text-white',
                toast.type === 'info' && 'border-info-border bg-info text-white',
              )}
            >
              {toast.type === 'success' && (
                <CheckCircle2 size={15} className="shrink-0 text-green-400" />
              )}
              {toast.type === 'error' && (
                <XCircle size={15} className="shrink-0 text-red-200" />
              )}
              {toast.type === 'info' && (
                <Info size={15} className="shrink-0 text-blue-200" />
              )}
              <span className="flex-1 leading-snug">{toast.message}</span>
              <button
                onClick={() => dismiss(toast.id)}
                className="ml-1 shrink-0 rounded-xl p-1 text-white/40 transition-colors hover:text-white hover:bg-white/10"
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
