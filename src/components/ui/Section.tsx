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
        className="flex flex-col gap-2 px-3.5 py-3 md:flex-row md:items-center md:justify-between md:px-5 md:py-3.5"
        style={{ borderBottom: '1px solid #D8E0EC' }}
      >
        <div>
          <h2 className="text-[16px] font-black tracking-[-0.03em] md:text-[18px]" style={{ color: '#111827' }}>{title}</h2>
          {description ? <p className="mt-1 text-[13px] font-semibold leading-5 md:mt-1.5 md:text-[14px]" style={{ color: '#4B5A70' }}>{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className="px-3.5 py-3.5 md:px-5 md:py-4">{children}</div>
    </Card>
  )
}