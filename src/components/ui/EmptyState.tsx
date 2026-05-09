import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-black/10 bg-[#F4F5F6] px-5 py-10 text-center">
      {icon ? <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#9EA3A8] ">{icon}</div> : null}
      <p className="text-lg font-semibold text-[#050609]">{title}</p>
      {description ? <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-[#6F747A]">{description}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  )
}
