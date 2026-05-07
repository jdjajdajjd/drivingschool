import type { ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="rounded-[18px] border border-[#D8E0EC] bg-white px-3.5 py-3.5 shadow-[0_14px_34px_rgba(35,47,78,0.10)] md:flex md:items-end md:justify-between md:gap-5 md:rounded-[22px] md:px-5 md:py-4">
      <div className="max-w-3xl">
        {eyebrow ? <p className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-[#667085]">{eyebrow}</p> : null}
        <h1
          className="mt-1 font-black tracking-tight text-[#15120E]"
          style={{ fontSize: 'clamp(22px, 3vw, 34px)', lineHeight: '1.02', letterSpacing: '-0.04em' }}
        >
          {title}
        </h1>
        {description ? <p className="mt-2 max-w-2xl text-[14px] font-semibold leading-5 text-[#4B5A70] md:mt-3 md:text-[16px] md:leading-6">{description}</p> : null}
      </div>
      {actions ? <div className="mt-3 flex flex-wrap items-center gap-2 md:mt-0">{actions}</div> : null}
    </div>
  )
}