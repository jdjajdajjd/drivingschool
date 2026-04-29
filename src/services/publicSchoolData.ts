import type { Branch, Instructor, School, Slot } from '../types'
import { db } from './storage'
import { getPublicSchoolBundle } from './supabasePublicService'

export interface PublicSchoolData {
  school: School
  branches: Branch[]
  instructors: Instructor[]
  slots: Slot[]
}

export async function loadPublicSchoolData(slug: string): Promise<PublicSchoolData | null> {
  const applyLocal = (school: School): PublicSchoolData => ({
    school,
    branches: db.branches.bySchool(school.id).filter((branch) => branch.isActive),
    instructors: db.instructors.bySchool(school.id).filter((instructor) => instructor.isActive),
    slots: db.slots.bySchool(school.id),
  })

  try {
    const bundle = await getPublicSchoolBundle(slug)
    if (bundle) {
      db.schools.upsert(bundle.school)
      bundle.branches.forEach((branch) => db.branches.upsert(branch))
      bundle.instructors.forEach((instructor) => db.instructors.upsert(instructor))
      bundle.slots.forEach((slot) => db.slots.upsert(slot))
      bundle.students.forEach((student) => db.students.upsert(student))
      bundle.bookings.forEach((booking) => db.bookings.upsert(booking))
      return {
        school: bundle.school,
        branches: bundle.branches.filter((branch) => branch.isActive),
        instructors: bundle.instructors.filter((instructor) => instructor.isActive),
        slots: bundle.slots,
      }
    }
  } catch {
    // Local demo data remains the fallback when the network is unavailable.
  }

  const localSchool = db.schools.bySlug(slug)
  return localSchool ? applyLocal(localSchool) : null
}

export function getFutureAvailableSlots(schoolId: string): Slot[] {
  const now = Date.now()
  return db.slots.bySchool(schoolId)
    .filter((slot) => slot.status === 'available')
    .filter((slot) => new Date(`${slot.date}T${slot.time}:00`).getTime() > now)
    .sort((left, right) => new Date(`${left.date}T${left.time}:00`).getTime() - new Date(`${right.date}T${right.time}:00`).getTime())
}
