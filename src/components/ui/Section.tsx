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
        className="flex items-center justify-between gap-3 px-3 py-2 md:px-4 md:py-2.5"
        style={{ borderBottom: '1px solid #D8E0EC' }}
      >
        <div>
          <h2 className="text-[15px] font-black tracking-[-0.02em] md:text-[17px]" style={{ color: '#111827' }}>{title}</h2>
          {description ? <p className="mt-0.5 line-clamp-1 text-[12px] font-medium leading-4 md:text-[13px]" style={{ color: '#4B5A70' }}>{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className="px-2.5 py-2.5 md:px-4 md:py-3">{children}</div>
    </Card>
  )
}