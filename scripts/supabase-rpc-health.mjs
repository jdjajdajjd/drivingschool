import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY
const password = process.env.VROOM_ADMIN_PASSWORD

if (!url || !key || !password) {
  console.error('Missing VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY or VROOM_ADMIN_PASSWORD')
  process.exit(1)
}

const supabase = createClient(url, key)
const failures = []

async function check(label, promise, allowBusinessError = false) {
  const { error, data } = await promise
  if (!error) {
    console.log(`${label}: ok (${Array.isArray(data) ? data.length : data ? 'data' : 'empty'})`)
    return
  }
  const message = error.message || String(error)
  const missing = message.includes('Could not find the function') || message.includes('digest(text')
  if (allowBusinessError && !missing) {
    console.log(`${label}: ok business-error (${message})`)
    return
  }
  failures.push(`${label}: ${message}`)
}

const school = await supabase.from('schools').select('id,slug,name').eq('slug', 'virazh').single()
if (school.error) failures.push(`schools select: ${school.error.message}`)
const schoolId = school.data?.id || 'school-virazh'

await check('public_create_booking', supabase.rpc('public_create_booking', {
  p_school_id: schoolId,
  p_student_name: 'RPC Health',
  p_student_phone: '+79990001122',
  p_slot_ids: ['slot-health-nonexistent'],
}), true)
await check('public_login_student', supabase.rpc('public_login_student', {
  p_school_id: schoolId,
  p_phone: '+79990001122',
  p_password: 'wrong',
}), true)
await check('public_get_booking_group', supabase.rpc('public_get_booking_group', { p_booking_id: 'booking-001' }))
await check('public_get_instructor_schedule', supabase.rpc('public_get_instructor_schedule', { p_token: 'tok-petrov-2024' }))
await check('public_get_student_progress', supabase.rpc('public_get_student_progress', { p_student_id: 'stu-001', p_staff_password: password }))
await check('public_get_student_documents', supabase.rpc('public_get_student_documents', { p_student_id: 'stu-001', p_staff_password: password }))
await check('public_admin_list_students', supabase.rpc('public_admin_list_students', { p_school_id: schoolId, p_staff_password: password }))
await check('public_admin_list_bookings', supabase.rpc('public_admin_list_bookings', { p_school_id: schoolId, p_staff_password: password }))
await check('public_admin_list_student_requests', supabase.rpc('public_admin_list_student_requests', { p_school_id: schoolId, p_staff_password: password }))

if (failures.length) {
  console.error('\nSupabase RPC health failed:')
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log('Supabase RPC health passed')
