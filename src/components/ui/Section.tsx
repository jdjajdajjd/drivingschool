import type { ReactNode } from 'react'
import { Card } from './Card'

interface SectionProps {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}

export function Section({ title, description, actions, children }: SectionProps) {
  return (
    <Card padding="none">
      <div className="flex flex-col gap-2.5 border-b border-slate-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-bold text-ink-900">{title}</h2>
          {description ? <p className="mt-1 text-sm leading-relaxed text-slate-600">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className="px-5 py-4">{children}</div>
    </Card>
  )
}
