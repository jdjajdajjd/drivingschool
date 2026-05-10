import type { ReactNode } from 'react'

interface StepWizardProps {
  steps: { label: string }[]
  currentStep: number
  children: ReactNode
}

export function StepWizard({ steps, currentStep, children }: StepWizardProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1">
        {steps.map((step, i) => (
          <>
            <div key={i} className="flex flex-col items-center">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-black ${
                i < currentStep ? 'bg-success text-white' : i === currentStep ? 'bg-ink text-white' : 'border-2 border-border text-text-muted'
              }`}>
                {i < currentStep ? '✓' : i + 1}
              </div>
              <span className={`mt-1 text-[10px] font-bold ${i <= currentStep ? 'text-ink' : 'text-text-muted'}`}>{step.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`mb-4 h-[2px] flex-1 rounded-full ${i < currentStep ? 'bg-success' : 'bg-border'}`} />
            )}
          </>
        ))}
      </div>
      {children}
    </div>
  )
}
