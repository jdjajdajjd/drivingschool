import type { ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="rounded-[24px] border border-white/70 bg-[rgba(255,255,255,0.76)] px-4 py-4 shadow-[var(--shadow-card)] backdrop-blur-2xl md:flex md:items-center md:justify-between md:gap-4 md:px-5 md:py-5">
      <div className="min-w-0 max-w-3xl">
        {eyebrow ? <p className="truncate text-[12px] font-medium text-[#687381]">{eyebrow}</p> : null}
        <h1 className="mt-0.5 truncate text-[22px] font-semibold leading-[1.08] text-[#111315] md:text-[28px]">
          {title}
        </h1>
        {description ? <p className="mt-1 line-clamp-2 max-w-2xl text-[13px] font-medium leading-5 text-[#687381] md:text-[14px]">{description}</p> : null}
      </div>
      {actions ? <div className="mt-2 flex shrink-0 flex-wrap items-center gap-2 md:mt-0">{actions}</div> : null}
    </div>
  )
}
