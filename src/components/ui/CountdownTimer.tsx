import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'

interface CountdownTimerProps {
  expiresAt: Date
  onExpire?: () => void
  label?: string
  showDays?: boolean
  className?: string
  variant?: 'default' | 'urgent' | 'calm'
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function getRemaining(expiresAt: Date): { days: number; hours: number; minutes: number; seconds: number; totalMs: number } {
  const totalMs = Math.max(0, expiresAt.getTime() - Date.now())
  const totalSeconds = Math.floor(totalMs / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return { days, hours, minutes, seconds, totalMs }
}

export function CountdownTimer({
  expiresAt,
  onExpire,
  label = 'Осталось',
  showDays = true,
  className,
  variant = 'default',
}: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(() => getRemaining(expiresAt))
  const expired = remaining.totalMs <= 0

  useEffect(() => {
    const tick = () => {
      const r = getRemaining(expiresAt)
      setRemaining(r)
      if (r.totalMs <= 0) {
        onExpire?.()
      }
    }

    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt, onExpire])

  const urgent = variant === 'urgent' || remaining.totalMs < 5 * 60 * 1000
  const calm = variant === 'calm' || remaining.totalMs > 60 * 60 * 1000

  const accentColor = urgent ? '#E5534B' : calm ? '#15803D' : '#F6B84D'
  const bgColor = urgent ? 'rgba(229,83,75,0.08)' : calm ? 'rgba(21,128,61,0.06)' : 'rgba(246,184,77,0.08)'
  const borderColor = urgent ? 'rgba(229,83,75,0.20)' : calm ? 'rgba(21,128,61,0.15)' : 'rgba(246,184,77,0.20)'

  if (expired) {
    return (
      <div
        className={cn('inline-flex items-center gap-2 rounded-2xl px-4 py-3', className)}
        style={{ background: 'rgba(229,83,75,0.08)', border: '1px solid rgba(229,83,75,0.20)' }}
      >
        <span style={{ color: '#E5534B' }}>⏱</span>
        <span className="text-[14px] font-semibold" style={{ color: '#E5534B' }}>
          Время вышло
        </span>
      </div>
    )
  }

  const units = showDays && remaining.days > 0
    ? `${remaining.days}д ${pad(remaining.hours)}:${pad(remaining.minutes)}:${pad(remaining.seconds)}`
    : `${pad(remaining.minutes)}:${pad(remaining.seconds)}`

  return (
    <div
      className={cn('inline-flex items-center gap-3 rounded-2xl px-4 py-3', className)}
      style={{ background: bgColor, border: `1px solid ${borderColor}` }}
    >
      <span style={{ color: accentColor }}>⏱</span>
      <div>
        {label && (
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#9EA3A8' }}>
            {label}
          </p>
        )}
        <p className="font-extrabold tracking-tight" style={{ fontSize: '18px', color: accentColor, fontFamily: 'ui-monospace, monospace' }}>
          {units}
        </p>
      </div>
    </div>
  )
}

// Compact version for hero cards
export function CountdownCompact({ expiresAt, onExpire }: { expiresAt: Date; onExpire?: () => void }) {
  const [remaining, setRemaining] = useState(() => getRemaining(expiresAt))

  useEffect(() => {
    const tick = () => {
      const r = getRemaining(expiresAt)
      setRemaining(r)
      if (r.totalMs <= 0) onExpire?.()
    }
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt, onExpire])

  if (remaining.totalMs <= 0) return null

  const urgent = remaining.totalMs < 5 * 60 * 1000
  const color = urgent ? '#E5534B' : '#6F747A'

  const parts: string[] = []
  if (remaining.days > 0) parts.push(`${remaining.days}д`)
  if (remaining.hours > 0 || remaining.days > 0) parts.push(`${remaining.hours}ч`)
  parts.push(`${remaining.minutes}м`)
  if (remaining.days === 0 && remaining.hours === 0) parts.push(`${remaining.seconds}с`)

  return (
    <span className="font-mono text-[13px] font-semibold" style={{ color }}>
      {parts.join(' ')}
    </span>
  )
}

// Countdown to a future date (exam date, etc.)
export function ExamCountdown({ targetDate }: { targetDate: Date }) {
  const [remaining, setRemaining] = useState(() => getRemaining(targetDate))

  useEffect(() => {
    const tick = () => setRemaining(getRemaining(targetDate))
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [targetDate])

  if (remaining.totalMs <= 0) {
    return (
      <span className="text-[13px] font-bold" style={{ color: '#E5534B' }}>
        Экзамен сегодня!
      </span>
    )
  }

  const totalDays = Math.ceil(remaining.totalMs / (86400 * 1000))
  const color = totalDays <= 7 ? '#E5534B' : totalDays <= 14 ? '#F6B84D' : '#15803D'

  return (
    <span className="text-[13px] font-bold" style={{ color }}>
      {totalDays} {totalDays === 1 ? 'день' : totalDays < 5 ? 'дня' : 'дней'}
    </span>
  )
}