import type { ReactNode } from 'react'
import { WarningCircle as AlertCircle, CheckCircle as CheckCircle2, Search, ShieldAlert } from 'iconoir-react'
import { Spinner as Loader2 } from '@phosphor-icons/react'
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
  empty: <Search width={22} height={22} />,
  'no-results': <Search width={22} height={22} />,
  loading: <Loader2 width={22} height={22} className="animate-spin" />,
  error: <AlertCircle width={22} height={22} />,
  success: <CheckCircle2 width={22} height={22} />,
  locked: <ShieldAlert width={22} height={22} />,
}

const toneByKind: Record<StateKind, { bg: string; color: string }> = {
  empty: { bg: '#EEF6FF', color: '#667381' },
  'no-results': { bg: '#EEF6FF', color: '#667381' },
  loading: { bg: '#F2F6FA', color: '#111315' },
  error: { bg: '#FEF2F2', color: '#D1433C' },
  success: { bg: '#EAF6EE', color: '#247A4B' },
  locked: { bg: '#EAF3FF', color: '#315A7C' },
}

export function StateView({ kind = 'empty', title, description, action, className }: StateViewProps) {
  const tone = toneByKind[kind]
  return (
    <div
      className={cn('text-left shadow-[var(--shadow-card)] backdrop-blur-2xl', className)}
      style={{
        borderRadius: '24px',
        border: '1px solid rgba(255,255,255,0.72)',
        background: 'rgba(255,255,255,0.72)',
        padding: '1rem',
      }}
    >
      <div className="flex items-start gap-2.5">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px]"
          style={{ background: tone.bg, color: tone.color }}
        >
          {iconByKind[kind]}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold" style={{ color: '#111315' }}>{title}</p>
          {description ? (
            <p className="mt-0.5 text-[13px] font-medium leading-5" style={{ color: '#687381' }}>
              {description}
            </p>
          ) : null}
          {action ? <div className="mt-2 flex justify-start">{action}</div> : null}
        </div>
      </div>
    </div>
  )
}

export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse', className)}
      style={{ background: 'rgba(0,0,0,0.06)', borderRadius: '16px' }}
    />
  )
}
