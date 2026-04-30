import type { ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        {eyebrow ? <p className="caption">{eyebrow}</p> : null}
        <h1
          className="mt-1 font-extrabold tracking-tight text-[#111418]"
          style={{ fontSize: '28px', lineHeight: '1.1', letterSpacing: '-0.03em' }}
        >
          {title}
        </h1>
        {description ? <p className="body-lg mt-2" style={{ fontSize: '15px', lineHeight: '1.55', color: '#6F747A' }}>{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}