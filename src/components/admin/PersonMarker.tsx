import { ChalkboardTeacher, Student } from '@phosphor-icons/react'

type PersonRole = 'student' | 'instructor'

type PersonMarkerProps = {
  role: PersonRole
  name: string
  meta?: string
  compact?: boolean
  className?: string
}

export function PersonMarker({ role, name, meta, compact = false, className = '' }: PersonMarkerProps) {
  const Icon = role === 'student' ? Student : ChalkboardTeacher
  const label = role === 'student' ? 'Ученик' : 'Инструктор'

  return (
    <span className={`v-person-marker v-person-marker-${role} ${compact ? 'is-compact' : ''} ${className}`.trim()}>
      <span className="v-person-marker-icon" aria-hidden="true"><Icon weight="duotone" /></span>
      <span className="min-w-0">
        <span className="v-person-marker-name">{name}</span>
        {meta ? <span className="v-person-marker-meta">{meta}</span> : compact ? null : <span className="v-person-marker-meta">{label}</span>}
      </span>
    </span>
  )
}
