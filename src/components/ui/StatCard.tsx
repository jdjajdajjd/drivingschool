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
    <Card variant="stat" padding="lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-wider" style={{ color: '#9EA3A8' }}>{label}</p>
          <p
            className="mt-2 font-extrabold tracking-tight text-[#111418] tabular-nums"
            style={{ fontSize: '34px', lineHeight: '1' }}
          >
            {value}
          </p>
          {meta ? <p className="mt-1.5 text-[13px] font-medium" style={{ color: '#6F747A' }}>{meta}</p> : null}
        </div>
        {icon ? (
          <div
            className="mt-1 flex items-center justify-center rounded-2xl p-3"
            style={{ background: 'rgba(246,184,77,0.12)', color: '#C97F10', boxShadow: '0 8px 20px rgba(246,184,77,0.15)' }}
          >
            {icon}
          </div>
        ) : null}
      </div>
    </Card>
  )
}
