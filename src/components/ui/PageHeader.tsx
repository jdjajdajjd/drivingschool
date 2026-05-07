import type { ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="rounded-[32px] border border-[rgba(55,38,20,0.08)] bg-white/70 px-5 py-5 shadow-[0_18px_42px_rgba(63,46,28,0.06)] backdrop-blur-xl md:flex md:items-end md:justify-between md:gap-5">
      <div className="max-w-3xl">
        {eyebrow ? <p className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-[#A09488]">{eyebrow}</p> : null}
        <h1
          className="mt-1 font-black tracking-tight text-[#15120E]"
          style={{ fontSize: 'clamp(30px, 4vw, 44px)', lineHeight: '0.98', letterSpacing: '-0.05em' }}
        >
          {title}
        </h1>
        {description ? <p className="mt-3 max-w-2xl text-[16px] font-semibold leading-6 text-[#6F655C]">{description}</p> : null}
      </div>
      {actions ? <div className="mt-4 flex flex-wrap items-center gap-2 md:mt-0">{actions}</div> : null}
    </div>
  )
}