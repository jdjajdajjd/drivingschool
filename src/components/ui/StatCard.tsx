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
    <Card padding="md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-stone-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-stone-900 tabular-nums">{value}</p>
          {meta ? <p className="mt-1 text-xs text-stone-400">{meta}</p> : null}
        </div>
        {icon ? <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-100 text-forest-700">{icon}</div> : null}
      </div>
    </Card>
  )
}
