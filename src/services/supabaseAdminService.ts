import { supabase } from '../lib/supabase'
import type { School, SlotStatus } from '../types'

async function runAdminMutation<T>(
  request: PromiseLike<{ data: T | null; error: unknown }>,
): Promise<T | null> {
  const { data, error } = await request
  if (error) throw error
  return data
}

export async function cancelSupabaseBooking(bookingId: string): Promise<void> {
  await runAdminMutation(supabase.rpc('public_cancel_booking', { p_booking_id: bookingId }))
}

export async function completeSupabaseBooking(bookingId: string): Promise<void> {
  await runAdminMutation(supabase.rpc('public_complete_booking', { p_booking_id: bookingId }))
}

export async function rescheduleSupabaseBooking(bookingId: string, newSlotId: string): Promise<void> {
  await runAdminMutation(
    supabase.rpc('public_reschedule_booking', {
      p_booking_id: bookingId,
      p_new_slot_id: newSlotId,
    }),
  )
}

export function persistSupabaseMutation(mutation: Promise<void>): void {
  void mutation.catch((error) => {
    console.error('Supabase mutation failed', error)
  })
}

export async function updateSupabaseSchoolSettings(
  schoolId: string,
  patch: {
    name: string
    slug: string
    description: string
    primaryColor?: string
    logoUrl?: string
    bookingLimitEnabled?: boolean
    maxActiveBookingsPerStudent?: number
    branchSelectionMode?: School['branchSelectionMode']
    maxSlotsPerBooking?: number
    defaultLessonDuration?: number
  },
): Promise<void> {
  await runAdminMutation(
    supabase.rpc('public_update_school_settings', {
      p_school_id: schoolId,
      p_name: patch.name,
      p_slug: patch.slug,
      p_description: patch.description,
      p_primary_color: patch.primaryColor ?? '',
      p_logo_url: patch.logoUrl ?? '',
      p_booking_limit_enabled: patch.bookingLimitEnabled ?? true,
      p_max_active_bookings_per_student: patch.maxActiveBookingsPerStudent ?? 2,
      p_branch_selection_mode: patch.branchSelectionMode ?? 'student_choice',
      p_max_slots_per_booking: patch.maxSlotsPerBooking ?? 1,
      p_default_lesson_duration: patch.defaultLessonDuration ?? 90,
    }),
  )
}

export async function createSupabaseSlot(params: {
  slotId: string
  schoolId: string
  branchId: string
  instructorId: string
  date: string
  startTime: string
  duration: number
}): Promise<void> {
  await runAdminMutation(
    supabase.rpc('public_create_slot', {
      p_slot_id: params.slotId,
      p_school_id: params.schoolId,
      p_branch_id: params.branchId,
      p_instructor_id: params.instructorId,
      p_date: params.date,
      p_start_time: params.startTime,
      p_duration: params.duration,
    }),
  )
}

export async function updateSupabaseSlotStatus(slotId: string, status: SlotStatus): Promise<void> {
  await runAdminMutation(
    supabase.rpc('public_update_slot_status', {
      p_slot_id: slotId,
      p_status: status,
    }),
  )
}

export async function deleteSupabaseSlot(slotId: string): Promise<void> {
  await runAdminMutation(supabase.rpc('public_delete_slot', { p_slot_id: slotId }))
}
