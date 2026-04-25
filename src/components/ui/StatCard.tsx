import type { ReactNode } from 'react'
import { Card } from './Card'

interface StatCardProps {
  label: string
  value: string | number
  meta?: string
  icon?: ReactNode
}

export function StatCard({ label, value, meta, icon }: StatCardProps) {
  return (
    <Card padding="sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-stone-600">{label}</p>
          <p className="mt-2 text-[1.75rem] font-semibold tracking-tight text-stone-900 tabular-nums">{value}</p>
          {meta ? <p className="mt-1 text-sm text-stone-500">{meta}</p> : null}
        </div>
        {icon ? <div className="mt-1 text-stone-400">{icon}</div> : null}
      </div>
    </Card>
  )
}
