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
    <Card padding="sm" className="bg-white/95">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-600">{label}</p>
          <p className="mt-2 text-[1.75rem] font-black tracking-tight text-ink-900 tabular-nums">{value}</p>
          {meta ? <p className="mt-1 text-sm text-slate-500">{meta}</p> : null}
        </div>
        {icon ? <div className="mt-1 rounded-xl bg-blue-50 p-2 text-blue-600">{icon}</div> : null}
      </div>
    </Card>
  )
}
