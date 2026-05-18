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
    <Card variant="stat" padding="md" className="min-h-[104px] md:min-h-[132px] md:p-6">
      <div className="flex h-full items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-medium md:text-[13px]" style={{ color: '#667381' }}>{label}</p>
          <p
            className="mt-2 font-semibold text-[#111315] tabular-nums md:mt-3"
            style={{ fontSize: 'clamp(28px, 7vw, 40px)', lineHeight: '0.96' }}
          >
            {value}
          </p>
          {meta ? <p className="mt-1.5 text-[12px] font-medium md:mt-2 md:text-[14px]" style={{ color: '#687381' }}>{meta}</p> : null}
        </div>
        {icon ? (
          <div
            className="mt-0 flex items-center justify-center rounded-[16px] p-2.5 md:mt-1 md:rounded-[20px] md:p-3.5"
            style={{ background: '#EEF6FF', color: '#111827', boxShadow: 'inset 0 0 0 1px rgba(17,24,39,0.06)' }}
          >
            {icon}
          </div>
        ) : null}
      </div>
    </Card>
  )
}
