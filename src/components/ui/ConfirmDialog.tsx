import { AlertTriangle } from 'lucide-react'
import { Button } from './Button'
import { Modal } from './Modal'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void
  onClose: () => void
  danger?: boolean
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Назад',
  onConfirm,
  onClose,
  danger = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="space-y-6 px-6 pb-6 pt-2">
        <div className="flex items-start gap-4 rounded-3xl border border-stone-100 bg-stone-50 px-4 py-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-soft">
            <AlertTriangle size={18} className={danger ? 'text-red-500' : 'text-amber-500'} />
          </div>
          <p className="text-sm leading-relaxed text-stone-600">{description}</p>
        </div>
        <div className="flex gap-3">
          <Button variant={danger ? 'danger' : 'primary'} className="flex-1" onClick={onConfirm}>
            {confirmLabel}
          </Button>
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            {cancelLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
