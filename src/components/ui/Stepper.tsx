import { Check } from 'lucide-react'
import { cn } from '../../lib/utils'

interface StepperProps {
  current: number
  total: number
  label?: string
}

export function Stepper({ current, total, label }: StepperProps) {
  const pct = Math.max(0, Math.min(100, Math.round((current / total) * 100)))
  return (
    <div className="rounded-2xl border rgba(0,0,0,0.06) white px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="caption">{label ?? `Шаг ${current} из ${total}`}</span>
        <span className="rounded-xl #F4F5F6 px-2 py-0.5 text-[12px] font-bold #111418">{pct}%</span>
      </div>
      <div className="mt-2.5 h-1 overflow-hidden rounded-full #F4F5F6">
        <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function SelectionMark({ active }: { active: boolean }) {
  return (
    <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition', active ? 'border-accent bg-accent text-white' : 'rgba(0,0,0,0.06) white text-transparent')}>
      <Check size={14} strokeWidth={3} />
    </span>
  )
}