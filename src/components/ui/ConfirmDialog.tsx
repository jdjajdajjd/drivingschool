import { Alert02Icon } from '@hugeicons/core-free-icons'
import { Button } from './Button'
import { createHugeIcon } from './HugeIcon'
import { Modal } from './Modal'

const AlertTriangle = createHugeIcon(Alert02Icon)

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
        <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 ${danger ? 'border-[#E5534B]/15 bg-[#FEF2F2]' : 'border-[#B45309]/15 bg-[#FFFBEB]'}`}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white">
            <AlertTriangle size={16} className={danger ? 'text-[#E5534B]' : 'text-[#B45309]'} />
          </div>
          <p className="text-[14px] leading-relaxed text-[#6F747A]">{description}</p>
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
