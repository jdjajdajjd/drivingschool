import { db } from './storage'
import { isSupabaseConfigured } from '../lib/supabase'
import { getPublicSchoolBundle } from './supabasePublicService'

const SYNC_TIMEOUT_MS = 3500

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Supabase sync timeout')), timeoutMs)
  })

  try {
    return await Promise.race([promise, timeout])
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}

export async function syncSupabaseSchoolToLocalDb(slug: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false

  const bundle = await withTimeout(getPublicSchoolBundle(slug), SYNC_TIMEOUT_MS)
  if (!bundle) return false

  const schoolId = bundle.school.id

  db.bookings.bySchool(schoolId).forEach((booking) => db.bookings.remove(booking.id))
  db.students.bySchool(schoolId).forEach((student) => db.students.remove(student.id))
  db.slots.bySchool(schoolId).forEach((slot) => db.slots.remove(slot.id))
  db.instructors.bySchool(schoolId).forEach((instructor) => db.instructors.remove(instructor.id))
  db.branches.bySchool(schoolId).forEach((branch) => db.branches.remove(branch.id))

  db.schools.upsert(bundle.school)
  bundle.branches.forEach((branch) => db.branches.upsert(branch))
  bundle.instructors.forEach((instructor) => db.instructors.upsert(instructor))
  bundle.slots.forEach((slot) => db.slots.upsert(slot))
  bundle.students.forEach((student) => db.students.upsert(student))
  bundle.bookings.forEach((booking) => db.bookings.upsert(booking))

  return true
}
