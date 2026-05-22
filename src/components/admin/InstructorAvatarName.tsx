import { InstructorFallbackIcon, InstructorUnknownIcon } from '@/components/icons/lucide'
import { getInstructorPhoto } from '../../services/instructorPhotos'
import type { Instructor } from '../../types'

type InstructorAvatarNameProps = {
  instructor?: Pick<Instructor, 'id' | 'name' | 'phone'> | null
  name?: string
  meta?: string
  compact?: boolean
  className?: string
}

export function InstructorAvatarName({ instructor, name, meta, compact = false, className = '' }: InstructorAvatarNameProps) {
  const photo = getInstructorPhoto(instructor)
  const displayName = instructor?.name ?? name ?? 'Инструктор'
  const displayMeta = meta ?? instructor?.phone
  const Icon = instructor ? InstructorFallbackIcon : InstructorUnknownIcon

  return (
    <span className={`v-instructor-avatar-name ${compact ? 'is-compact' : ''} ${className}`.trim()}>
      <span className="v-instructor-avatar" aria-hidden="true">
        {photo ? <img src={photo} alt="" /> : <Icon />}
      </span>
      <span className="min-w-0">
        <span className="v-instructor-avatar-title">{displayName}</span>
        {displayMeta ? <span className="v-instructor-avatar-meta">{displayMeta}</span> : null}
      </span>
    </span>
  )
}
