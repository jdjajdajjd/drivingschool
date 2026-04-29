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
    <Card variant="stat" padding="sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-product-secondary">{label}</p>
          <p className="mt-2 font-display text-[1.75rem] font-bold tracking-normal text-product-main tabular-nums">{value}</p>
          {meta ? <p className="mt-1 text-sm text-product-muted">{meta}</p> : null}
        </div>
        {icon ? <div className="mt-1 rounded-2xl bg-product-primary-soft p-2 text-product-primary">{icon}</div> : null}
      </div>
    </Card>
  )
}
