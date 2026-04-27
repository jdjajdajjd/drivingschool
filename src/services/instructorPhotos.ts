import type { Instructor } from '../types'

const INSTRUCTOR_PHOTOS: Record<string, string> = {
  'inst-petrov': '/instructors/male1.webp',
  'inst-kozlov': '/instructors/male2.webp',
  'inst-zakharov': '/instructors/male3.webp',
  'inst-smirnova': '/instructors/fem1.webp',
  'inst-volkova': '/instructors/fem2.webp',
}

export function getInstructorPhoto(instructor: Pick<Instructor, 'id'> | null | undefined): string | undefined {
  return instructor ? INSTRUCTOR_PHOTOS[instructor.id] : undefined
}
