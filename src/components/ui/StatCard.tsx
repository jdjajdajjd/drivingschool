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
    <Card variant="stat" padding="md" className="min-h-[96px] md:min-h-[132px] md:p-6">
      <div className="flex h-full items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] md:text-[12px] md:tracking-[0.14em]" style={{ color: '#A09488' }}>{label}</p>
          <p
            className="mt-2 font-black tracking-tight text-[#15120E] tabular-nums md:mt-3"
            style={{ fontSize: 'clamp(28px, 8vw, 42px)', lineHeight: '0.95' }}
          >
            {value}
          </p>
          {meta ? <p className="mt-1.5 text-[12px] font-semibold md:mt-2 md:text-[14px]" style={{ color: '#6F655C' }}>{meta}</p> : null}
        </div>
        {icon ? (
          <div
            className="mt-0 flex items-center justify-center rounded-[16px] p-2.5 md:mt-1 md:rounded-[20px] md:p-3.5"
            style={{ background: '#F2ECE2', color: '#15120E', boxShadow: 'inset 0 0 0 1px rgba(55,38,20,0.06)' }}
          >
            {icon}
          </div>
        ) : null}
      </div>
    </Card>
  )
}
