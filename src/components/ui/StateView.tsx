import type { ReactNode } from 'react'
import React from 'react'
import { AlertCircle, CheckCircle2, Loader2, Search, ShieldAlert } from 'lucide-react'
import { cn } from '../../lib/utils'

void React

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

const toneByKind: Record<StateKind, { bg: string; color: string }> = {
  empty: { bg: '#F4F5F6', color: '#9EA3A8' },
  'no-results': { bg: '#F4F5F6', color: '#9EA3A8' },
  loading: { bg: 'rgba(36,54,217,0.10)', color: '#2436D9' },
  error: { bg: '#FEF2F2', color: '#E5534B' },
  success: { bg: '#F0FDF4', color: '#15803D' },
  locked: { bg: '#FFFBEB', color: '#B45309' },
}

export function StateView({ kind = 'empty', title, description, action, className }: StateViewProps) {
  const tone = toneByKind[kind]
  return (
    <div
      className={cn('text-center', className)}
      style={{
        borderRadius: '24px',
        border: '1px dashed rgba(0,0,0,0.08)',
        background: '#F7F8F9',
        padding: '2.5rem 1.5rem',
      }}
    >
      <div
        className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
        style={{ background: tone.bg, color: tone.color, boxShadow: '0 18px 45px rgba(15,20,25,0.10)' }}
      >
        {iconByKind[kind]}
      </div>
      <p className="text-[17px] font-extrabold tracking-tight" style={{ color: '#111418' }}>{title}</p>
      {description ? (
        <p className="body mx-auto mt-2 max-w-md" style={{ color: '#6F747A' }}>
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
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
