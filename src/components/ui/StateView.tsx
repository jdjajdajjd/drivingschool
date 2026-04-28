import type { ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Loader2, Search, ShieldAlert } from 'lucide-react'
import { cn } from '../../lib/utils'

type StateKind = 'empty' | 'no-results' | 'loading' | 'error' | 'success' | 'locked'

interface StateViewProps {
  kind?: StateKind
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

const iconByKind: Record<StateKind, ReactNode> = {
  empty: <Search size={22} />,
  'no-results': <Search size={22} />,
  loading: <Loader2 size={22} className="animate-spin" />,
  error: <AlertCircle size={22} />,
  success: <CheckCircle2 size={22} />,
  locked: <ShieldAlert size={22} />,
}

const toneByKind: Record<StateKind, string> = {
  empty: 'text-slate-500 bg-white',
  'no-results': 'text-slate-500 bg-white',
  loading: 'text-blue-700 bg-blue-50',
  error: 'text-red-700 bg-red-50',
  success: 'text-emerald-700 bg-emerald-50',
  locked: 'text-amber-700 bg-amber-50',
}

export function StateView({ kind = 'empty', title, description, action, className }: StateViewProps) {
  return (
    <div className={cn('rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-9 text-center', className)}>
      <div className={cn('mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm', toneByKind[kind])}>
        {iconByKind[kind]}
      </div>
      <p className="text-lg font-black text-ink-900">{title}</p>
      {description ? <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">{description}</p> : null}
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  )
}

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-2xl bg-slate-200/70', className)} />
}
