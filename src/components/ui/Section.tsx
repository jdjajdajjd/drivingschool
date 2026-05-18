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
        className="flex items-center justify-between gap-3 px-4 py-3 md:px-5 md:py-4"
        style={{ borderBottom: '1px solid rgba(17,24,39,0.07)' }}
      >
        <div>
          <h2 className="text-[16px] font-semibold md:text-[18px]" style={{ color: '#111315' }}>{title}</h2>
          {description ? <p className="mt-1 line-clamp-1 text-[12px] font-medium leading-4 md:text-[13px]" style={{ color: '#687381' }}>{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className="px-3 py-3 md:px-5 md:py-4">{children}</div>
    </Card>
  )
}
