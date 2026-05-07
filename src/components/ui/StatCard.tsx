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
    <Card variant="stat" padding="lg" className="min-h-[132px]">
      <div className="flex h-full items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-extrabold uppercase tracking-[0.14em]" style={{ color: '#A09488' }}>{label}</p>
          <p
            className="mt-3 font-black tracking-tight text-[#15120E] tabular-nums"
            style={{ fontSize: '42px', lineHeight: '0.95' }}
          >
            {value}
          </p>
          {meta ? <p className="mt-2 text-[14px] font-semibold" style={{ color: '#6F655C' }}>{meta}</p> : null}
        </div>
        {icon ? (
          <div
            className="mt-1 flex items-center justify-center rounded-[20px] p-3.5"
            style={{ background: '#F2ECE2', color: '#15120E', boxShadow: 'inset 0 0 0 1px rgba(55,38,20,0.06)' }}
          >
            {icon}
          </div>
        ) : null}
      </div>
    </Card>
  )
}
