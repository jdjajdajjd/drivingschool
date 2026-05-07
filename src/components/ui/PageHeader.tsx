import type { ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="rounded-[16px] border border-[#D8E0EC] bg-white px-3 py-2.5 md:flex md:items-center md:justify-between md:gap-4 md:px-4 md:py-3">
      <div className="min-w-0 max-w-3xl">
        {eyebrow ? <p className="truncate text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#667085]">{eyebrow}</p> : null}
        <h1 className="mt-0.5 truncate text-[22px] font-black leading-[1.05] tracking-[-0.035em] text-[#111827] md:text-[28px]">
          {title}
        </h1>
        {description ? <p className="mt-1 line-clamp-2 max-w-2xl text-[13px] font-medium leading-5 text-[#4B5A70] md:text-[14px]">{description}</p> : null}
      </div>
      {actions ? <div className="mt-2 flex shrink-0 flex-wrap items-center gap-2 md:mt-0">{actions}</div> : null}
    </div>
  )
}