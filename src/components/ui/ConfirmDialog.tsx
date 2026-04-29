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
        <div className={`flex items-start gap-4 rounded-[22px] border px-4 py-4 ${danger ? 'border-product-error-soft bg-product-error-soft/60' : 'border-transparent bg-product-warning-soft'}`}>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-soft">
            <AlertTriangle size={18} className={danger ? 'text-product-error' : 'text-product-warning'} />
          </div>
          <p className="text-sm leading-relaxed text-product-secondary">{description}</p>
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
