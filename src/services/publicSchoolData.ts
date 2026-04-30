import type { Branch, Instructor, School, Slot } from '../types'
import { isSupabaseConfigured } from '../lib/supabase'
import { db } from './storage'
import { getPublicSchoolBundle } from './supabasePublicService'

export interface PublicSchoolData {
  school: School
  branches: Branch[]
  instructors: Instructor[]
  slots: Slot[]
}

const PUBLIC_DATA_TIMEOUT_MS = 3500

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Supabase public data timeout')), timeoutMs)
  })

  try {
    return await Promise.race([promise, timeout])
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}

export async function loadPublicSchoolData(slug: string): Promise<PublicSchoolData | null> {
  const applyLocal = (school: School): PublicSchoolData => ({
    school,
    branches: db.branches.bySchool(school.id).filter((branch) => branch.isActive),
    instructors: db.instructors.bySchool(school.id).filter((instructor) => instructor.isActive),
    slots: db.slots.bySchool(school.id),
  })

  if (isSupabaseConfigured()) {
    try {
      const bundle = await withTimeout(getPublicSchoolBundle(slug), PUBLIC_DATA_TIMEOUT_MS)
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
      // Local demo data remains the fallback when Supabase is unavailable or slow.
    }
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
