import { ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

export interface BreadcrumbStep {
  label: string
  active?: boolean
  completed?: boolean
}

interface BreadcrumbsProps {
  steps: BreadcrumbStep[]
  onStepClick?: (index: number) => void
  className?: string
}

export function Breadcrumbs({ steps, onStepClick, className }: BreadcrumbsProps) {
  return (
    <nav
      className={cn('flex items-center gap-1 overflow-x-auto', className)}
      aria-label="Прогресс записи"
    >
      {steps.map((step, i) => {
        return (
          <div key={step.label} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight size={14} className="shrink-0" style={{ color: '#D1D5DB' }} />
            )}
            <button
              type="button"
              onClick={() => onStepClick?.(i)}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-all',
                step.active
                  ? 'bg-[#050607] text-white shadow-[0_4px_12px_rgba(0,0,0,0.15)]'
                  : step.completed
                    ? 'text-[#9EA3A8] hover:text-[#6F747A]'
                    : 'text-[#9EA3A8]',
              )}
              style={!step.active && !step.completed ? { background: '#F4F5F6' } : undefined}
            >
              {step.completed && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex h-4 w-4 items-center justify-center rounded-full"
                  style={{ background: 'rgba(21,128,61,0.15)', color: '#15803D' }}
                >
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1 4L3 6L7 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </motion.span>
              )}
              {step.label}
            </button>
          </div>
        )
      })}
    </nav>
  )
}
