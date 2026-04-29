import type { ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        {eyebrow ? <p className="ui-kicker">{eyebrow}</p> : null}
        <h1 className="mt-1.5 font-display text-[1.75rem] font-bold leading-[2.125rem] tracking-normal text-product-main md:text-[2rem] md:leading-[2.4rem]">
          {title}
        </h1>
        {description ? <p className="mt-2 max-w-xl text-[15px] leading-6 text-product-secondary">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null}
    </div>
  )
}
