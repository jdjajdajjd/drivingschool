import { InstructorFallbackIcon, Student } from '@/components/icons/lucide'

type PersonRole = 'student' | 'instructor'

type PersonMarkerProps = {
  role: PersonRole
  name: string
  meta?: string
  avatarUrl?: string
  compact?: boolean
  className?: string
}

export function PersonMarker({ role, name, meta, avatarUrl, compact = false, className = '' }: PersonMarkerProps) {
  const Icon = role === 'student' ? Student : InstructorFallbackIcon
  const label = role === 'student' ? 'Ученик' : 'Инструктор'

  return (
    <span className={`v-person-marker v-person-marker-${role} ${compact ? 'is-compact' : ''} ${className}`.trim()}>
      <span className="v-person-marker-icon" aria-hidden="true">
        {avatarUrl ? <img src={avatarUrl} alt="" /> : <Icon />}
      </span>
      <span className="min-w-0">
        <span className="v-person-marker-name">{name}</span>
        {meta ? <span className="v-person-marker-meta">{meta}</span> : compact ? null : <span className="v-person-marker-meta">{label}</span>}
      </span>
    </span>
  )
}
