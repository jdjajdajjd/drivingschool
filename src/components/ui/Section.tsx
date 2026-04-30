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
      <div
        className="flex flex-col gap-2 px-5 py-4 md:flex-row md:items-center md:justify-between"
        style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
      >
        <div>
          <h2 className="text-[15px] font-extrabold tracking-tight" style={{ color: '#111418' }}>{title}</h2>
          {description ? <p className="body mt-1.5" style={{ color: '#6F747A' }}>{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className="px-5 py-5">{children}</div>
    </Card>
  )
}