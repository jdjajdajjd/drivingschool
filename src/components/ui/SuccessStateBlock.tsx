import { CheckCircle as CheckCircle2 } from '@/components/icons/lucide'
import type { ReactNode } from 'react'

export function SuccessStateBlock({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#15803D]/15 bg-[#F0FDF4] px-5 py-6 text-center ">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#15803D] ">
        <CheckCircle2 width={26} height={26} />
      </div>
      <h1 className="mt-4 font-sans text-[28px] font-bold leading-[34px] text-[#111418]">{title}</h1>
      {subtitle ? <p className="mx-auto mt-2 max-w-sm text-[15px] leading-[22px] text-[#6F747A]">{subtitle}</p> : null}
      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  )
}
