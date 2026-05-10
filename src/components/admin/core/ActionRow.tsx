import type { ReactNode } from 'react'

interface ActionRowProps {
  primary?: ReactNode
  secondary?: ReactNode
  className?: string
}

export function ActionRow({ primary, secondary, className = '' }: ActionRowProps) {
  return (
    <div className={`flex gap-2 ${className}`}>
      {secondary && <div className="flex-1">{secondary}</div>}
      {primary && <div className="flex-1">{primary}</div>}
    </div>
  )
}
