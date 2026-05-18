import { db } from './storage'
import { isSupabaseRemoteConfigured, markWorkspaceSupabaseReady } from '../lib/supabase'
import { getAdminSchoolBundle, getAdminSchoolBundleById } from './supabasePublicService'
import { hydrateAdminRecords } from './adminStorage'
import { listSupabaseAdminRecords } from './supabaseAdminService'

const SYNC_TIMEOUT_MS = 3500

export interface SupabaseSchoolSyncTarget {
  slug?: string
  schoolId?: string
}

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

export async function syncSupabaseSchoolToLocalDb(target: SupabaseSchoolSyncTarget): Promise<boolean> {
  if (!isSupabaseRemoteConfigured()) {
    markWorkspaceSupabaseReady(false)
    return false
  }

  const bundlePromise = target.schoolId
    ? getAdminSchoolBundleById(target.schoolId)
    : getAdminSchoolBundle(target.slug ?? 'virazh')
  const bundle = await withTimeout(bundlePromise, SYNC_TIMEOUT_MS)
  if (!bundle) {
    markWorkspaceSupabaseReady(false)
    return false
  }

  db.bookings.all().forEach((booking) => db.bookings.remove(booking.id))
  db.students.all().forEach((student) => db.students.remove(student.id))
  db.slots.all().forEach((slot) => db.slots.remove(slot.id))
  db.instructors.all().forEach((instructor) => db.instructors.remove(instructor.id))
  db.branches.all().forEach((branch) => db.branches.remove(branch.id))
  db.schools.all().forEach((school) => db.schools.remove(school.id))

  db.schools.upsert(bundle.school)
  bundle.branches.forEach((branch) => db.branches.upsert(branch))
  bundle.instructors.forEach((instructor) => db.instructors.upsert(instructor))
  bundle.slots.forEach((slot) => db.slots.upsert(slot))
  bundle.students.forEach((student) => db.students.upsert(student))
  bundle.bookings.forEach((booking) => db.bookings.upsert(booking))
  markWorkspaceSupabaseReady(true)
  hydrateAdminRecords(await listSupabaseAdminRecords(bundle.school.id))

  return true
}
