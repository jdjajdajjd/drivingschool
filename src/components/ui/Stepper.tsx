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
    <div className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <span className="ui-kicker">{label ?? `Шаг ${current} из ${total}`}</span>
        <span className="rounded-lg bg-white px-2 py-1 text-xs font-black text-blue-700 shadow-sm">{pct}%</span>
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        {Array.from({ length: total }, (_, index) => {
          const active = index + 1 <= current
          return (
            <div
              key={index}
              className={cn(
                'h-2 flex-1 rounded-full transition-all duration-300',
                active ? 'bg-blue-700 shadow-[0_4px_12px_rgba(37,99,235,0.18)]' : 'bg-slate-200',
              )}
            />
          )
        })}
      </div>
    </div>
  )
}

export function SelectionMark({ active }: { active: boolean }) {
  return (
    <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition', active ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-300 bg-white text-transparent')}>
      <Check size={14} strokeWidth={3} />
    </span>
  )
}
