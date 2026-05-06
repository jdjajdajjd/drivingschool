import type { Booking, Branch, Instructor, School, Slot, Student, StudentRequest } from '../types'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Database } from '../lib/supabaseTypes'
import { getAccessPassword } from './accessControl'

type SchoolRow = Database['public']['Tables']['schools']['Row']
type BranchRow = Database['public']['Tables']['branches']['Row']
type InstructorRow = Database['public']['Tables']['instructors']['Row']
type SlotRow = Database['public']['Tables']['slots']['Row']
type StudentRow = Database['public']['Tables']['students']['Row']
type UntypedSupabase = {
  from: (table: string) => any
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: any; error: unknown }>
}

const untypedSupabase = supabase as unknown as UntypedSupabase

export interface PublicSchoolBundle {
  school: School
  branches: Branch[]
  instructors: Instructor[]
  slots: Slot[]
  students?: Student[]
  bookings?: Booking[]
}

export interface AdminSchoolBundle extends PublicSchoolBundle {
  students: Student[]
  bookings: Booking[]
}

export interface PublicInstructorBundle {
  instructor: Instructor
  branch: Branch | null
  slots: Slot[]
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
    enabledCategoryCodes: row.enabled_category_codes?.length ? row.enabled_category_codes : undefined,
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
    lessonType: row.lesson_type ?? undefined,
    status: row.status,
    bookingId: row.booking_id ?? undefined,
    createdAt: row.created_at,
  }
}

export interface SupabaseBookingBundle {
  booking: Booking
  school: School | null
  branch: Branch | null
  instructor: Instructor | null
  slot: Slot | null
  student: Student | null
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
    categoryCodes: row.category_codes?.length ? row.category_codes : undefined,
    trainingStage: row.training_stage ?? undefined,
    groupName: row.group_name ?? undefined,
    trainingStartDate: row.training_start_date ?? undefined,
    drivingStartDate: row.driving_start_date ?? undefined,
    trainingEndDate: row.training_end_date ?? undefined,
    drivingEndDate: row.driving_end_date ?? undefined,
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

  const [branchesResult, instructorsResult, slotsResult] = await Promise.all([
    supabase.from('branches').select('*').eq('school_id', school.id).eq('is_active', true).order('name'),
    supabase.from('instructors').select('*').eq('school_id', school.id).eq('is_active', true).order('name'),
    supabase.from('slots').select('*').eq('school_id', school.id).order('date').order('time'),
  ])

  if (branchesResult.error) throw branchesResult.error
  if (instructorsResult.error) throw instructorsResult.error
  if (slotsResult.error) throw slotsResult.error

  return {
    school,
    branches: branchesResult.data.map(mapBranch),
    instructors: instructorsResult.data.map(mapInstructor),
    slots: slotsResult.data.map(mapSlot),
  }
}

function mapBookingLike(row: any): Booking {
  return {
    id: row.id,
    bookingGroupId: row.booking_group_id ?? undefined,
    schoolId: row.school_id,
    slotId: row.slot_id,
    instructorId: row.instructor_id,
    branchId: row.branch_id,
    studentId: row.student_id,
    studentName: row.student_name,
    studentPhone: row.student_phone ?? '',
    studentEmail: row.student_email ?? '',
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    rescheduledAt: row.rescheduled_at ?? undefined,
    notes: row.notes ?? undefined,
    comment: row.comment ?? undefined,
  }
}

export async function getAdminSchoolBundle(slug: string): Promise<AdminSchoolBundle | null> {
  const publicBundle = await getPublicSchoolBundle(slug)
  if (!publicBundle) return null

  const adminPassword = getAccessPassword('admin')
  if (!adminPassword) throw new Error('Войдите в админку заново.')

  const [studentsResult, bookingsResult] = await Promise.all([
    supabase.from('students').select('*').eq('school_id', publicBundle.school.id).order('created_at', { ascending: false }),
    untypedSupabase.rpc('public_admin_list_bookings', { p_school_id: publicBundle.school.id, p_staff_password: adminPassword }),
  ])

  if (studentsResult.error) throw studentsResult.error
  if (bookingsResult.error) throw bookingsResult.error

  return {
    ...publicBundle,
    students: studentsResult.data.map(mapStudent),
    bookings: (bookingsResult.data ?? []).map(mapBookingLike),
  }
}

export async function getPublicInstructorBundle(token: string): Promise<PublicInstructorBundle | null> {
  const { data, error } = await untypedSupabase.rpc('public_get_instructor_schedule', { p_token: token })
  if (error) throw error
  const rows = data ?? []
  const first = rows[0]
  if (!first) return null

  const instructor = mapInstructor({
    id: first.instructor_id,
    school_id: first.instructor_school_id,
    branch_id: first.instructor_branch_id,
    name: first.instructor_name,
    phone: first.instructor_phone,
    email: '',
    token,
    bio: first.instructor_bio,
    experience: first.instructor_experience,
    is_active: first.instructor_is_active,
    categories: first.instructor_categories,
    avatar_initials: first.instructor_avatar_initials,
    avatar_color: first.instructor_avatar_color,
    car: first.instructor_car,
    transmission: first.instructor_transmission,
    created_at: '',
    updated_at: '',
  })

  const branch = first.branch_id ? mapBranch({ id: first.branch_id, school_id: first.branch_school_id, name: first.branch_name, address: first.branch_address, phone: first.branch_phone, is_active: first.branch_is_active, created_at: '', updated_at: '' }) : null
  const slots = rows.filter((row: any) => row.slot_id).map((row: any) => mapSlot({ id: row.slot_id, school_id: row.slot_school_id, instructor_id: row.slot_instructor_id, branch_id: row.slot_branch_id, date: row.slot_date, time: row.slot_time, duration: row.slot_duration, lesson_type: row.slot_lesson_type, status: row.slot_status, booking_id: row.slot_booking_id, created_at: row.slot_created_at, updated_at: '' }))
  const bookings = rows.filter((row: any) => row.booking_id).map((row: any) => mapBookingLike({
    id: row.booking_id,
    booking_group_id: row.booking_group_id,
    school_id: row.booking_school_id,
    slot_id: row.booking_slot_id,
    instructor_id: row.booking_instructor_id,
    branch_id: row.booking_branch_id,
    student_id: row.booking_student_id,
    student_name: row.booking_student_name,
    student_phone: '',
    student_email: '',
    status: row.booking_status,
    created_at: row.booking_created_at,
    updated_at: row.booking_updated_at,
    rescheduled_at: row.booking_rescheduled_at,
    notes: null,
    comment: null,
  }))

  return {
    instructor,
    branch,
    slots,
    bookings,
  }
}

export async function createStudentRequestInSupabase(request: StudentRequest): Promise<void> {
  if (!isSupabaseConfigured()) return
  const { error } = await supabase.rpc('public_create_student_request', {
    p_request_id: request.id,
    p_school_id: request.schoolId,
    p_student_id: request.studentId,
    p_booking_id: request.bookingId ?? null,
    p_type: request.type,
    p_reason: request.reason,
    p_preferred_time: request.preferredTime ?? null,
    p_comment: request.comment ?? null,
    p_created_at: request.createdAt,
    p_updated_at: request.updatedAt,
  })
  if (error) throw error
}

export async function getPublicSlots(schoolId: string): Promise<Slot[]> {
  const { data, error } = await supabase
    .from('slots')
    .select('*')
    .eq('school_id', schoolId)
    .order('date')
    .order('time')

  if (error) throw error
  return (data ?? []).map(mapSlot)
}

export async function createSupabaseBooking(params: {
  schoolId: string
  studentName: string
  studentPhone: string
  slotIds: string[]
}): Promise<SupabaseBookingResult> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured.')
  }

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
    bookingIds: rows.map((row: any) => row.booking_id),
    slotIds: rows.map((row: any) => row.slot_id),
  }
}

export async function getBookingByIdFromSupabase(bookingId: string): Promise<SupabaseBookingBundle | null> {
  if (!isSupabaseConfigured()) {
    return null
  }

  const group = await getBookingGroupFromSupabase(bookingId)
  return group[0] ?? null
}

function mapBookingBundleRow(row: any): SupabaseBookingBundle {
  return {
    booking: mapBookingLike(row),
    school: row.school_id ? mapSchool({ id: row.school_id, name: row.school_name, slug: row.school_slug, description: row.school_description, phone: row.school_phone, email: row.school_email, address: row.school_address, logo_url: row.school_logo_url, primary_color: row.school_primary_color, booking_limit_enabled: row.school_booking_limit_enabled, max_active_bookings_per_student: row.school_max_active_bookings_per_student, branch_selection_mode: row.school_branch_selection_mode, max_slots_per_booking: row.school_max_slots_per_booking, default_lesson_duration: row.school_default_lesson_duration, enabled_category_codes: row.school_enabled_category_codes, is_active: row.school_is_active, created_at: row.school_created_at, updated_at: row.school_updated_at }) : null,
    branch: row.branch_id ? mapBranch({ id: row.branch_id, school_id: row.branch_school_id, name: row.branch_name, address: row.branch_address, phone: row.branch_phone, is_active: row.branch_is_active, created_at: '', updated_at: '' }) : null,
    instructor: row.instructor_id ? mapInstructor({ id: row.instructor_id, school_id: row.instructor_school_id, branch_id: row.instructor_branch_id, name: row.instructor_name, phone: row.instructor_phone, email: row.instructor_email, token: '', bio: row.instructor_bio, experience: row.instructor_experience, is_active: row.instructor_is_active, categories: row.instructor_categories, avatar_initials: row.instructor_avatar_initials, avatar_color: row.instructor_avatar_color, car: row.instructor_car, transmission: row.instructor_transmission, created_at: '', updated_at: '' }) : null,
    slot: row.slot_id ? mapSlot({ id: row.slot_id, school_id: row.slot_school_id, instructor_id: row.slot_instructor_id, branch_id: row.slot_branch_id, date: row.slot_date, time: row.slot_time, duration: row.slot_duration, lesson_type: row.slot_lesson_type, status: row.slot_status, booking_id: row.slot_booking_id, created_at: row.slot_created_at, updated_at: '' }) : null,
    student: row.student_id ? mapStudent({ id: row.student_id, school_id: row.student_school_id, name: row.student_name, phone: row.student_phone, normalized_phone: row.student_phone, email: row.student_email, password_hash: null, avatar_url: null, assigned_branch_id: null, assigned_instructor_id: null, category_codes: null, training_stage: null, group_name: null, training_start_date: null, driving_start_date: null, training_end_date: null, driving_end_date: null, branch_change_requested_at: null, branch_change_note: null, created_at: row.created_at, updated_at: row.updated_at }) : null,
  }
}

export async function getBookingGroupFromSupabase(bookingId: string): Promise<SupabaseBookingBundle[]> {
  if (!isSupabaseConfigured()) {
    return []
  }

  const { data, error } = await untypedSupabase.rpc('public_get_booking_group', { p_booking_id: bookingId })
  if (error) throw error
  return (data ?? [])
    .map(mapBookingBundleRow)
    .sort((left: SupabaseBookingBundle, right: SupabaseBookingBundle) => {
      const leftTime = left.slot ? new Date(`${left.slot.date}T${left.slot.time}:00`).getTime() : 0
      const rightTime = right.slot ? new Date(`${right.slot.date}T${right.slot.time}:00`).getTime() : 0
      return leftTime - rightTime
    })
}

export async function updateStudentProfileInSupabase(params: {
  schoolId: string
  name: string
  phone: string
  email: string
  password: string
  avatarUrl: string
  categoryCodes?: string[]
  trainingStage?: Student['trainingStage']
  groupName?: string
  trainingStartDate?: string
  drivingStartDate?: string
  trainingEndDate?: string
  drivingEndDate?: string
}): Promise<{ studentId: string; normalizedPhone: string }> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured.')
  }

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

  const studentPatch = {
    category_codes: params.categoryCodes?.length ? params.categoryCodes : null,
    training_stage: params.trainingStage ?? null,
    group_name: params.groupName ?? null,
    training_start_date: params.trainingStartDate ?? null,
    driving_start_date: params.drivingStartDate ?? null,
    training_end_date: params.trainingEndDate ?? null,
    driving_end_date: params.drivingEndDate ?? null,
  }
  if (Object.values(studentPatch).some((value) => value !== null)) {
    const { error: updateError } = await untypedSupabase.from('students').update(studentPatch).eq('id', row.student_id)
    if (updateError) throw updateError
  }

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
