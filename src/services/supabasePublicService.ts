import type { Booking, Branch, Instructor, School, Slot, Student } from '../types'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/supabaseTypes'

type SchoolRow = Database['public']['Tables']['schools']['Row']
type BranchRow = Database['public']['Tables']['branches']['Row']
type InstructorRow = Database['public']['Tables']['instructors']['Row']
type SlotRow = Database['public']['Tables']['slots']['Row']
type BookingRow = Database['public']['Tables']['bookings']['Row']
type StudentRow = Database['public']['Tables']['students']['Row']

export interface PublicSchoolBundle {
  school: School
  branches: Branch[]
  instructors: Instructor[]
  slots: Slot[]
  students: Student[]
  bookings: Booking[]
}

export interface SupabaseBookingResult {
  bookingGroupId: string
  bookingIds: string[]
  slotIds: string[]
}

function mapSchool(row: SchoolRow): School {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    phone: row.phone,
    email: row.email,
    address: row.address,
    createdAt: row.created_at,
    logoUrl: row.logo_url ?? undefined,
    primaryColor: row.primary_color ?? undefined,
    bookingLimitEnabled: row.booking_limit_enabled,
    maxActiveBookingsPerStudent: row.max_active_bookings_per_student,
    branchSelectionMode: row.branch_selection_mode,
    maxSlotsPerBooking: row.max_slots_per_booking,
    defaultLessonDuration: row.default_lesson_duration,
    isActive: row.is_active,
  }
}

function mapBranch(row: BranchRow): Branch {
  return {
    id: row.id,
    schoolId: row.school_id,
    name: row.name,
    address: row.address,
    phone: row.phone,
    isActive: row.is_active,
  }
}

function mapInstructor(row: InstructorRow): Instructor {
  return {
    id: row.id,
    schoolId: row.school_id,
    branchId: row.branch_id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    token: row.token,
    bio: row.bio,
    experience: row.experience,
    isActive: row.is_active,
    categories: row.categories,
    avatarInitials: row.avatar_initials,
    avatarColor: row.avatar_color,
    car: row.car ?? undefined,
    transmission: row.transmission ?? undefined,
  }
}

function mapSlot(row: SlotRow): Slot {
  return {
    id: row.id,
    schoolId: row.school_id,
    instructorId: row.instructor_id,
    branchId: row.branch_id,
    date: row.date,
    time: row.time.slice(0, 5),
    duration: row.duration,
    status: row.status,
    bookingId: row.booking_id ?? undefined,
    createdAt: row.created_at,
  }
}

function mapBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    schoolId: row.school_id,
    slotId: row.slot_id,
    instructorId: row.instructor_id,
    branchId: row.branch_id,
    studentId: row.student_id,
    studentName: row.student_name,
    studentPhone: row.student_phone,
    studentEmail: row.student_email,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    rescheduledAt: row.rescheduled_at ?? undefined,
    notes: row.notes ?? undefined,
    comment: row.comment ?? undefined,
  }
}

function mapStudent(row: StudentRow): Student {
  return {
    id: row.id,
    schoolId: row.school_id,
    name: row.name,
    phone: row.phone,
    normalizedPhone: row.normalized_phone,
    email: row.email,
    avatarUrl: row.avatar_url ?? undefined,
    assignedBranchId: row.assigned_branch_id ?? undefined,
    assignedInstructorId: row.assigned_instructor_id ?? undefined,
    branchChangeRequestedAt: row.branch_change_requested_at ?? undefined,
    branchChangeNote: row.branch_change_note ?? undefined,
    hasPassword: Boolean(row.password_hash),
    createdAt: row.created_at,
  }
}

export async function getPublicSchoolBundle(slug: string): Promise<PublicSchoolBundle | null> {
  const { data: schoolRow, error: schoolError } = await supabase
    .from('schools')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (schoolError) {
    if (schoolError.code === 'PGRST116') return null
    throw schoolError
  }

  const school = mapSchool(schoolRow)

  const [branchesResult, instructorsResult, slotsResult, studentsResult, bookingsResult] = await Promise.all([
    supabase.from('branches').select('*').eq('school_id', school.id).eq('is_active', true).order('name'),
    supabase.from('instructors').select('*').eq('school_id', school.id).eq('is_active', true).order('name'),
    supabase.from('slots').select('*').eq('school_id', school.id).order('date').order('time'),
    supabase.from('students').select('*').eq('school_id', school.id).order('created_at', { ascending: false }),
    supabase.from('bookings').select('*').eq('school_id', school.id).order('created_at', { ascending: false }),
  ])

  if (branchesResult.error) throw branchesResult.error
  if (instructorsResult.error) throw instructorsResult.error
  if (slotsResult.error) throw slotsResult.error
  if (studentsResult.error) throw studentsResult.error
  if (bookingsResult.error) throw bookingsResult.error

  return {
    school,
    branches: branchesResult.data.map(mapBranch),
    instructors: instructorsResult.data.map(mapInstructor),
    slots: slotsResult.data.map(mapSlot),
    students: studentsResult.data.map(mapStudent),
    bookings: bookingsResult.data.map(mapBooking),
  }
}

export async function createSupabaseBooking(params: {
  schoolId: string
  studentName: string
  studentPhone: string
  slotIds: string[]
}): Promise<SupabaseBookingResult> {
  const { data, error } = await supabase.rpc('public_create_booking', {
    p_school_id: params.schoolId,
    p_student_name: params.studentName,
    p_student_phone: params.studentPhone,
    p_slot_ids: params.slotIds,
  })

  if (error) throw error
  const rows = data ?? []

  return {
    bookingGroupId: rows[0]?.booking_group_id ?? '',
    bookingIds: rows.map((row) => row.booking_id),
    slotIds: rows.map((row) => row.slot_id),
  }
}

export async function getBookingByIdFromSupabase(bookingId: string): Promise<{
  booking: Booking
  school: School | null
  branch: Branch | null
  instructor: Instructor | null
  slot: Slot | null
  student: Student | null
} | null> {
  const { data: bookingRow, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  const [schoolResult, branchResult, instructorResult, slotResult, studentResult] = await Promise.all([
    supabase.from('schools').select('*').eq('id', bookingRow.school_id).single(),
    supabase.from('branches').select('*').eq('id', bookingRow.branch_id).single(),
    supabase.from('instructors').select('*').eq('id', bookingRow.instructor_id).single(),
    supabase.from('slots').select('*').eq('id', bookingRow.slot_id).single(),
    supabase.from('students').select('*').eq('id', bookingRow.student_id).single(),
  ])

  return {
    booking: mapBooking(bookingRow),
    school: schoolResult.data ? mapSchool(schoolResult.data) : null,
    branch: branchResult.data ? mapBranch(branchResult.data) : null,
    instructor: instructorResult.data ? mapInstructor(instructorResult.data) : null,
    slot: slotResult.data ? mapSlot(slotResult.data) : null,
    student: studentResult.data ? mapStudent(studentResult.data) : null,
  }
}

export async function updateStudentProfileInSupabase(params: {
  schoolId: string
  name: string
  phone: string
  email: string
  password: string
  avatarUrl: string
}): Promise<{ studentId: string; normalizedPhone: string }> {
  const { data, error } = await supabase.rpc('public_update_student_profile', {
    p_school_id: params.schoolId,
    p_phone: params.phone,
    p_name: params.name,
    p_email: params.email,
    p_password: params.password,
    p_avatar_url: params.avatarUrl,
  })

  if (error) throw error
  const row = data?.[0]
  if (!row) throw new Error('Student profile was not saved.')

  return {
    studentId: row.student_id,
    normalizedPhone: row.student_phone,
  }
}

export async function loginStudentInSupabase(params: {
  schoolId: string
  phone: string
  password: string
}): Promise<{
  studentId: string
  name: string
  phone: string
  email: string
  avatarUrl: string
  assignedBranchId: string
} | null> {
  const { data, error } = await supabase.rpc('public_login_student', {
    p_school_id: params.schoolId,
    p_phone: params.phone,
    p_password: params.password,
  })

  if (error) throw error
  const row = data?.[0]
  if (!row) return null

  return {
    studentId: row.student_id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    avatarUrl: row.avatar_url ?? '',
    assignedBranchId: row.assigned_branch_id ?? '',
  }
}

export async function requestBranchChangeInSupabase(params: {
  schoolId: string
  phone: string
  note: string
}): Promise<void> {
  const { error } = await supabase.rpc('public_request_branch_change', {
    p_school_id: params.schoolId,
    p_phone: params.phone,
    p_note: params.note,
  })

  if (error) throw error
}
