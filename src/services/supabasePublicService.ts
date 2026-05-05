import type { Booking, Branch, Instructor, School, Slot, Student, StudentDocument, StudentProgress, StudentRequest, StudentRequestStatus } from '../types'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Database } from '../lib/supabaseTypes'

type SchoolRow = Database['public']['Tables']['schools']['Row']
type BranchRow = Database['public']['Tables']['branches']['Row']
type InstructorRow = Database['public']['Tables']['instructors']['Row']
type SlotRow = Database['public']['Tables']['slots']['Row']
type BookingRow = Database['public']['Tables']['bookings']['Row']
type StudentRow = Database['public']['Tables']['students']['Row']
type UntypedSupabase = {
  from: (table: string) => any
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

function mapBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    bookingGroupId: row.booking_group_id ?? undefined,
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

export async function getAdminSchoolBundle(slug: string): Promise<AdminSchoolBundle | null> {
  const publicBundle = await getPublicSchoolBundle(slug)
  if (!publicBundle) return null

  const [studentsResult, bookingsResult] = await Promise.all([
    supabase.from('students').select('*').eq('school_id', publicBundle.school.id).order('created_at', { ascending: false }),
    supabase.from('bookings').select('*').eq('school_id', publicBundle.school.id).order('created_at', { ascending: false }),
  ])

  if (studentsResult.error) throw studentsResult.error
  if (bookingsResult.error) throw bookingsResult.error

  return {
    ...publicBundle,
    students: studentsResult.data.map(mapStudent),
    bookings: bookingsResult.data.map(mapBooking),
  }
}

export async function getPublicInstructorBundle(token: string): Promise<PublicInstructorBundle | null> {
  const { data: instructorRow, error: instructorError } = await supabase
    .from('instructors')
    .select('*')
    .eq('token', token)
    .maybeSingle()

  if (instructorError) throw instructorError
  if (!instructorRow) return null

  const instructor = mapInstructor(instructorRow)

  const [branchResult, slotsResult, bookingsResult] = await Promise.all([
    supabase.from('branches').select('*').eq('id', instructor.branchId).maybeSingle(),
    supabase.from('slots').select('*').eq('instructor_id', instructor.id).order('date').order('time'),
    supabase.from('bookings').select('*').eq('instructor_id', instructor.id).order('created_at', { ascending: false }),
  ])

  if (branchResult.error) throw branchResult.error
  if (slotsResult.error) throw slotsResult.error
  if (bookingsResult.error) throw bookingsResult.error

  return {
    instructor,
    branch: branchResult.data ? mapBranch(branchResult.data) : null,
    slots: (slotsResult.data ?? []).map(mapSlot),
    bookings: (bookingsResult.data ?? []).map(mapBooking),
  }
}

export async function getStudentProgressFromSupabase(studentId: string): Promise<StudentProgress | null> {
  if (!isSupabaseConfigured()) return null
  const { data, error } = await untypedSupabase.from('student_progress').select('*').eq('student_id', studentId).maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    id: data.id,
    studentId: data.student_id,
    schoolId: data.school_id,
    theoryTopicsTotal: data.theory_topics_total,
    theoryTopicsCompleted: data.theory_topics_completed,
    drivingHoursTotal: data.driving_hours_total,
    drivingHoursCompleted: data.driving_hours_completed,
    internalExamPassed: data.internal_exam_passed,
    internalExamDate: data.internal_exam_date,
    internalExamStatus: data.internal_exam_status,
    gaidExamDate: data.gaid_exam_date,
    gibddExamStatus: data.gibdd_exam_status,
    notes: data.notes,
    updatedAt: data.updated_at,
  }
}

export async function upsertStudentProgressInSupabase(progress: StudentProgress): Promise<void> {
  if (!isSupabaseConfigured()) return
  const { error } = await untypedSupabase.from('student_progress').upsert({
    id: progress.id,
    student_id: progress.studentId,
    school_id: progress.schoolId,
    theory_topics_total: progress.theoryTopicsTotal,
    theory_topics_completed: progress.theoryTopicsCompleted,
    driving_hours_total: progress.drivingHoursTotal,
    driving_hours_completed: progress.drivingHoursCompleted,
    internal_exam_passed: progress.internalExamPassed,
    internal_exam_date: progress.internalExamDate,
    internal_exam_status: progress.internalExamStatus ?? (progress.internalExamPassed ? 'passed' : 'not_scheduled'),
    gaid_exam_date: progress.gaidExamDate,
    gibdd_exam_status: progress.gibddExamStatus ?? 'not_scheduled',
    notes: progress.notes,
    updated_at: progress.updatedAt,
  })
  if (error) throw error
}

export async function getStudentDocumentsFromSupabase(studentId: string): Promise<StudentDocument[]> {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await untypedSupabase.from('student_documents').select('*').eq('student_id', studentId)
  if (error) throw error
  return (data ?? []).map((row: any) => ({ studentId: row.student_id, type: row.type, status: row.status, updatedAt: row.updated_at }))
}

export async function upsertStudentDocumentsInSupabase(documents: StudentDocument[]): Promise<void> {
  if (!isSupabaseConfigured() || documents.length === 0) return
  const { error } = await untypedSupabase.from('student_documents').upsert(documents.map((document) => ({
    student_id: document.studentId,
    type: document.type,
    status: document.status,
    updated_at: document.updatedAt,
  })))
  if (error) throw error
}

export async function getStudentRequestsFromSupabase(schoolId: string): Promise<StudentRequest[]> {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await untypedSupabase.from('student_requests').select('*').eq('school_id', schoolId).order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row: any) => ({
    id: row.id,
    schoolId: row.school_id,
    studentId: row.student_id,
    bookingId: row.booking_id ?? undefined,
    type: row.type,
    status: row.status,
    reason: row.reason,
    preferredTime: row.preferred_time ?? undefined,
    comment: row.comment ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

export async function createStudentRequestInSupabase(request: StudentRequest): Promise<void> {
  if (!isSupabaseConfigured()) return
  const { error } = await untypedSupabase.from('student_requests').insert({
    id: request.id,
    school_id: request.schoolId,
    student_id: request.studentId,
    booking_id: request.bookingId ?? null,
    type: request.type,
    status: request.status,
    reason: request.reason,
    preferred_time: request.preferredTime ?? null,
    comment: request.comment ?? null,
    created_at: request.createdAt,
    updated_at: request.updatedAt,
  })
  if (error) throw error
}

export async function updateStudentRequestStatusInSupabase(schoolId: string, requestId: string, status: StudentRequestStatus): Promise<void> {
  if (!isSupabaseConfigured()) return
  const { error } = await untypedSupabase.from('student_requests').update({ status, updated_at: new Date().toISOString() }).eq('school_id', schoolId).eq('id', requestId)
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

export async function getBookingGroupFromSupabase(bookingId: string): Promise<SupabaseBookingBundle[]> {
  if (!isSupabaseConfigured()) {
    return []
  }

  const first = await getBookingByIdFromSupabase(bookingId)
  if (!first) return []

  const groupId = first.booking.bookingGroupId
  if (!groupId) return [first]

  const { data: bookingRows, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('booking_group_id', groupId)
    .order('created_at', { ascending: true })

  if (error) throw error
  if (!bookingRows || bookingRows.length <= 1) return [first]

  const schoolId = first.booking.schoolId
  const branchIds = [...new Set(bookingRows.map((row) => row.branch_id))]
  const instructorIds = [...new Set(bookingRows.map((row) => row.instructor_id))]
  const slotIds = [...new Set(bookingRows.map((row) => row.slot_id))]
  const studentIds = [...new Set(bookingRows.map((row) => row.student_id))]

  const [schoolResult, branchesResult, instructorsResult, slotsResult, studentsResult] = await Promise.all([
    supabase.from('schools').select('*').eq('id', schoolId).single(),
    supabase.from('branches').select('*').in('id', branchIds),
    supabase.from('instructors').select('*').in('id', instructorIds),
    supabase.from('slots').select('*').in('id', slotIds),
    supabase.from('students').select('*').in('id', studentIds),
  ])

  const school = schoolResult.data ? mapSchool(schoolResult.data) : first.school
  const branches = new Map((branchesResult.data ?? []).map((row) => [row.id, mapBranch(row)]))
  const instructors = new Map((instructorsResult.data ?? []).map((row) => [row.id, mapInstructor(row)]))
  const slots = new Map((slotsResult.data ?? []).map((row) => [row.id, mapSlot(row)]))
  const students = new Map((studentsResult.data ?? []).map((row) => [row.id, mapStudent(row)]))

  return bookingRows
    .map((row) => {
      const booking = mapBooking(row)
      return {
        booking,
        school,
        branch: branches.get(booking.branchId) ?? null,
        instructor: instructors.get(booking.instructorId) ?? null,
        slot: slots.get(booking.slotId) ?? null,
        student: students.get(booking.studentId ?? '') ?? null,
      }
    })
    .sort((left, right) => {
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
