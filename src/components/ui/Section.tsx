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
        className="flex flex-col gap-2 px-4 py-3.5 md:flex-row md:items-center md:justify-between md:px-5 md:py-4"
        style={{ borderBottom: '1px solid rgba(55,38,20,0.08)' }}
      >
        <div>
          <h2 className="text-[16px] font-black tracking-[-0.03em] md:text-[18px]" style={{ color: '#15120E' }}>{title}</h2>
          {description ? <p className="mt-1 text-[13px] font-semibold leading-5 md:mt-1.5 md:text-[14px]" style={{ color: '#6F655C' }}>{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className="px-4 py-4 md:px-5 md:py-5">{children}</div>
    </Card>
  )
}