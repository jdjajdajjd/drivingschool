import { CheckCircle2 } from 'lucide-react'
import type { ReactNode } from 'react'

export function SuccessStateBlock({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="rounded-[20px] border border-product-border bg-white px-5 py-6 text-center shadow-soft">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-product-success-soft text-product-success">
        <CheckCircle2 size={30} />
      </div>
      <h1 className="mt-4 font-display text-[32px] font-bold leading-[38px] text-product-main">{title}</h1>
      {subtitle ? <p className="mx-auto mt-2 max-w-sm text-base leading-[22px] text-product-secondary">{subtitle}</p> : null}
      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  )
}
