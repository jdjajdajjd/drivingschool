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
      <div className="space-y-5 px-5 pb-5 pt-2">
        <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 ${danger ? 'rgba(229,83,75,0.15) #FEF2F2' : 'rgba(180,83,9,0.15) #FFFBEB'}`}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl white ">
            <AlertTriangle size={16} className={danger ? '#E5534B' : '#B45309'} />
          </div>
          <p className="text-[14px] leading-relaxed #6F747A">{description}</p>
        </div>
        <div className="flex gap-2">
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