import { supabase } from '../lib/supabase'

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
