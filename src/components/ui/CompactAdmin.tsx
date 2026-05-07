import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export function AdminWorkPage({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('max-w-7xl bg-[#EEF2F7] p-2.5 pb-24 md:p-5 md:pb-5', className)}>{children}</div>
}

export function CompactChecklistRow({
  title,
  status,
  action,
  done = false,
  onClick,
}: {
  title: string
  status: string
  action: string
  done?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid min-h-[52px] w-full grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2 border-b border-[#E5EAF1] bg-white px-3 py-2 text-left last:border-b-0 hover:bg-[#F8FAFC]"
    >
      <span className={cn('grid h-5 w-5 place-items-center rounded-[7px] border text-[12px] font-black', done ? 'border-[#22A06B] bg-[#EAF7EE] text-[#188447]' : 'border-[#D0D5DD] bg-[#F8FAFC] text-[#98A2B3]')}>
        {done ? '✓' : ''}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[15px] font-extrabold text-[#111827]">{title}</span>
        <span className={cn('block truncate text-[12px] font-bold', done ? 'text-[#188447]' : 'text-[#9A3412]')}>{status}</span>
      </span>
      <span className="rounded-[10px] border border-[#D7DEE8] bg-[#F8FAFC] px-2.5 py-1.5 text-[12px] font-black text-[#2436D9]">{action}</span>
    </button>
  )
}

export function CompactDataRow({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  const Element = onClick ? 'button' : 'div'
  return (
    <Element
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn('w-full rounded-[14px] border border-[#D7DEE8] bg-white px-3 py-2 text-left hover:bg-[#F8FAFC]', className)}
    >
      {children}
    </Element>
  )
}

export function SmallEmptyState({ title, description, action, className }: { title: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-[14px] border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-3 py-3 text-left', className)}>
      <p className="text-[15px] font-black text-[#111827]">{title}</p>
      {description ? <p className="mt-0.5 text-[13px] font-medium leading-5 text-[#667085]">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}

export function WarningRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-[12px] border border-[#FEDF89] bg-[#FFFAEB] px-3 py-2 text-[13px] font-semibold leading-5 text-[#92400E]', className)}>{children}</div>
}

export function FilterBar({ children, more, className }: { children: ReactNode; more?: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-[16px] border border-[#D7DEE8] bg-white p-2', className)}>
      <div className="grid grid-cols-4 gap-1.5 md:grid-cols-6 md:gap-2">{children}</div>
      {more ? <div className="mt-2 border-t border-[#E5EAF1] pt-2">{more}</div> : null}
    </div>
  )
}

export function StickyBottomAction({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('fixed inset-x-0 bottom-0 z-30 border-t border-[#D7DEE8] bg-white/95 px-3 py-2 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-0', className)}>
      <div className="mx-auto max-w-7xl">{children}</div>
    </div>
  )
}

export function CompactSettingsSection({ title, description, actions, children, className }: { title: string; description?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('overflow-hidden rounded-[16px] border border-[#D7DEE8] bg-white', className)}>
      <div className="flex items-center justify-between gap-3 border-b border-[#E5EAF1] px-3 py-2.5 md:px-4">
        <div className="min-w-0">
          <h2 className="truncate text-[16px] font-black tracking-[-0.02em] text-[#111827]">{title}</h2>
          {description ? <p className="mt-0.5 text-[12px] font-medium leading-4 text-[#667085]">{description}</p> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <div className="p-3 md:p-4">{children}</div>
    </section>
  )
}

export function compactFieldClassName(extra?: string) {
  return cn('h-10 w-full rounded-[12px] border border-[#D7DEE8] bg-white px-3 text-[14px] font-semibold text-[#111827] outline-none transition focus:border-[#2436D9] focus:ring-3 focus:ring-[#2436D9]/10', extra)
}
