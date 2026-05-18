import { isSupabaseRemoteConfigured, isWorkspaceSupabaseReady, supabase } from '../lib/supabase'
import type { LessonType, School, SlotStatus, Student, StudentDocument, StudentProgress, StudentRequest, StudentRequestStatus } from '../types'
import type { BranchInput } from './branchService'
import type { InstructorInput } from './instructorService'
import { getAccessSecret } from './accessControl'
import type { Database } from '../lib/supabaseTypes'

type StudentProgressRow = {
  id: string
  student_id: string
  school_id: string
  theory_topics_total: number
  theory_topics_completed: number
  driving_hours_total: number
  driving_hours_completed: number
  internal_exam_passed: boolean
  internal_exam_date: string | null
  internal_exam_status: StudentProgress['internalExamStatus']
  gaid_exam_date: string | null
  gibdd_exam_status: StudentProgress['gibddExamStatus']
  notes: string
  updated_at: string
}

type StudentDocumentRow = {
  student_id: string
  type: StudentDocument['type']
  status: StudentDocument['status']
  updated_at: string
}

type StudentRequestRow = {
  id: string
  school_id: string
  student_id: string
  booking_id: string | null
  type: StudentRequest['type']
  status: StudentRequest['status']
  reason: string
  preferred_time: string | null
  comment: string | null
  created_at: string
  updated_at: string
}

export type SupabaseAdminRecordKind =
  | 'cars'
  | 'payments'
  | 'documents'
  | 'internal_exams'
  | 'gibdd_exams'
  | 'users'
  | 'settings'
  | 'audit_log'
  | 'problem_cases'

export type SupabaseAdminRecordRow = {
  id: string
  school_id: string
  kind: SupabaseAdminRecordKind
  branch_id: string | null
  student_id: string | null
  payload: Record<string, unknown>
  updated_at: string
}

type StudentRow = {
  id: string
  school_id: string
  name: string
  phone: string
  normalized_phone: string
  email: string
  password_hash: string | null
  avatar_url: string | null
  assigned_branch_id: string | null
  assigned_instructor_id: string | null
  category_codes: string[] | null
  training_stage: Student['trainingStage'] | null
  group_name: string | null
  training_start_date: string | null
  driving_start_date: string | null
  training_end_date: string | null
  driving_end_date: string | null
  branch_change_requested_at: string | null
  branch_change_note: string | null
  created_at: string
}

type SchoolRow = Database['public']['Tables']['schools']['Row']

function getAdminSecret(options: { requireWorkspaceReady?: boolean } = {}): string {
  if ((options.requireWorkspaceReady ?? true) && !isWorkspaceSupabaseReady()) {
    throw new Error('Workspace Supabase session is not ready.')
  }
  const secret = getAccessSecret('admin')
  if (!secret) {
    throw new Error('Войдите в кабинет школы заново.')
  }
  return secret
}

function getSuperadminSecret(): string {
  const secret = getAccessSecret('superadmin')
  if (!secret) {
    throw new Error('Войдите в операторскую панель заново.')
  }
  return secret
}

async function runAdminMutation<T>(
  request: PromiseLike<{ data: T | null; error: unknown }>,
): Promise<T | null> {
  const { data, error } = await request
  if (error) {
    const message = typeof error === 'object' && error && 'message' in error
      ? String((error as { message?: unknown }).message || 'Ошибка Supabase.')
      : 'Ошибка Supabase.'
    throw new Error(message)
  }
  return data
}

export async function cancelSupabaseBooking(bookingId: string): Promise<void> {
  await runAdminMutation(
    supabase.rpc('public_cancel_booking', {
      p_booking_id: bookingId,
      p_staff_password: getAdminSecret(),
    }),
  )
}

export async function completeSupabaseBooking(bookingId: string): Promise<void> {
  await runAdminMutation(
    supabase.rpc('public_complete_booking', {
      p_booking_id: bookingId,
      p_staff_password: getAdminSecret(),
    }),
  )
}

export async function rescheduleSupabaseBooking(bookingId: string, newSlotId: string): Promise<void> {
  await runAdminMutation(
    supabase.rpc('public_reschedule_booking', {
      p_booking_id: bookingId,
      p_new_slot_id: newSlotId,
      p_staff_password: getAdminSecret(),
    }),
  )
}

export function persistSupabaseMutation(mutation: Promise<void>): void {
  void mutation.catch((error) => {
    console.error('Supabase mutation failed', error)
  })
}

function mapSupabaseSchool(row: SchoolRow): School {
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

export async function createSupabaseSchool(
  school: School,
): Promise<School> {
  if (!isSupabaseRemoteConfigured()) {
    throw new Error('Supabase не подключен.')
  }

  const data = await runAdminMutation<SchoolRow[]>(
    supabase.rpc('public_create_school', {
      p_school_id: school.id,
      p_name: school.name,
      p_slug: school.slug,
      p_description: school.description,
      p_phone: school.phone,
      p_email: school.email,
      p_address: school.address,
      p_primary_color: school.primaryColor ?? '',
      p_logo_url: school.logoUrl ?? '',
      p_booking_limit_enabled: school.bookingLimitEnabled,
      p_max_active_bookings_per_student: school.maxActiveBookingsPerStudent ?? 2,
      p_branch_selection_mode: school.branchSelectionMode ?? 'student_choice',
      p_max_slots_per_booking: school.maxSlotsPerBooking ?? 1,
      p_default_lesson_duration: school.defaultLessonDuration ?? 90,
      p_enabled_category_codes: school.enabledCategoryCodes?.length ? school.enabledCategoryCodes : ['B'],
      p_is_active: school.isActive !== false,
      p_superadmin_password: getSuperadminSecret(),
    }),
  )

  const row = Array.isArray(data) ? data[0] : null
  if (!row) {
    throw new Error('База не вернула созданную автошколу.')
  }

  return mapSupabaseSchool(row)
}

export async function listSupabaseSchools(): Promise<School[]> {
  if (!isSupabaseRemoteConfigured()) return []
  const data = await runAdminMutation<SchoolRow[]>(
    supabase.rpc('public_superadmin_list_schools', {
      p_superadmin_password: getSuperadminSecret(),
    }),
  )

  return (data ?? []).map(mapSupabaseSchool)
}

export async function deleteSupabaseSchool(schoolId: string): Promise<void> {
  if (!isSupabaseRemoteConfigured()) {
    throw new Error('Supabase не подключен.')
  }

  await runAdminMutation(
    supabase.rpc('public_delete_school', {
      p_school_id: schoolId,
      p_superadmin_password: getSuperadminSecret(),
    }),
  )
}

export async function listSupabaseAdminRecords(schoolId: string): Promise<SupabaseAdminRecordRow[]> {
  if (!isWorkspaceSupabaseReady()) return []
  const data = await runAdminMutation<SupabaseAdminRecordRow[]>(
    supabase.rpc('public_admin_list_records', {
      p_school_id: schoolId,
      p_staff_password: getAdminSecret(),
    }),
  )
  return data ?? []
}

export async function upsertSupabaseAdminRecord(params: {
  kind: SupabaseAdminRecordKind
  id: string
  schoolId: string
  branchId?: string | null
  studentId?: string | null
  payload: Record<string, unknown>
}): Promise<void> {
  await runAdminMutation(
    supabase.rpc('public_upsert_admin_record', {
      p_kind: params.kind,
      p_record_id: params.id,
      p_school_id: params.schoolId,
      p_branch_id: params.branchId ?? null,
      p_student_id: params.studentId ?? null,
      p_payload: params.payload,
      p_staff_password: getAdminSecret(),
    }),
  )
}

export async function deleteSupabaseAdminRecord(kind: SupabaseAdminRecordKind, recordId: string): Promise<void> {
  await runAdminMutation(
    supabase.rpc('public_delete_admin_record', {
      p_kind: kind,
      p_record_id: recordId,
      p_staff_password: getAdminSecret(),
    }),
  )
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
    enabledCategoryCodes?: string[]
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
      p_enabled_category_codes: patch.enabledCategoryCodes?.length ? patch.enabledCategoryCodes : ['B'],
      p_staff_password: getAdminSecret(),
    }),
  )
}

export async function updateSupabaseStudentAdmin(student: Student): Promise<void> {
  await runAdminMutation(
    supabase.rpc('public_admin_update_student', {
      p_student_id: student.id,
      p_school_id: student.schoolId,
      p_name: student.name,
      p_phone: student.phone,
      p_normalized_phone: student.normalizedPhone,
      p_email: student.email,
      p_avatar_url: student.avatarUrl ?? null,
      p_assigned_branch_id: student.assignedBranchId ?? null,
      p_assigned_instructor_id: student.assignedInstructorId ?? null,
      p_category_codes: student.categoryCodes ?? ['B'],
      p_training_stage: student.trainingStage ?? null,
      p_group_name: student.groupName ?? null,
      p_training_start_date: student.trainingStartDate ?? null,
      p_driving_start_date: student.drivingStartDate ?? null,
      p_training_end_date: student.trainingEndDate ?? null,
      p_driving_end_date: student.drivingEndDate ?? null,
      p_branch_change_requested_at: student.branchChangeRequestedAt ?? null,
      p_branch_change_note: student.branchChangeNote ?? null,
      p_staff_password: getAdminSecret(),
    }),
  )
}

export async function getSupabaseStudentsAdmin(
  schoolId: string,
  options: { allowBeforeWorkspaceReady?: boolean } = {},
): Promise<Student[]> {
  if (!isWorkspaceSupabaseReady() && !options.allowBeforeWorkspaceReady) return []
  const data = await runAdminMutation<StudentRow[]>(
    supabase.rpc('public_admin_list_students', {
      p_school_id: schoolId,
      p_staff_password: getAdminSecret({ requireWorkspaceReady: !options.allowBeforeWorkspaceReady }),
    }),
  )
  return (data ?? []).map((row) => ({
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
  }))
}

export async function upsertSupabaseStudentProgressAdmin(progress: StudentProgress): Promise<void> {
  await runAdminMutation(
    supabase.rpc('public_upsert_student_progress', {
      p_progress_id: progress.id,
      p_student_id: progress.studentId,
      p_school_id: progress.schoolId,
      p_theory_topics_total: progress.theoryTopicsTotal,
      p_theory_topics_completed: progress.theoryTopicsCompleted,
      p_driving_hours_total: progress.drivingHoursTotal,
      p_driving_hours_completed: progress.drivingHoursCompleted,
      p_internal_exam_passed: progress.internalExamPassed,
      p_internal_exam_date: progress.internalExamDate,
      p_internal_exam_status: progress.internalExamStatus ?? (progress.internalExamPassed ? 'passed' : 'not_scheduled'),
      p_gaid_exam_date: progress.gaidExamDate,
      p_gibdd_exam_status: progress.gibddExamStatus ?? 'not_scheduled',
      p_notes: progress.notes,
      p_updated_at: progress.updatedAt,
      p_staff_password: getAdminSecret(),
    }),
  )
}

export async function getSupabaseStudentProgressAdmin(studentId: string): Promise<StudentProgress | null> {
  if (!isWorkspaceSupabaseReady()) return null
  const data = await runAdminMutation<StudentProgressRow[]>(
    supabase.rpc('public_get_student_progress', {
      p_student_id: studentId,
      p_staff_password: getAdminSecret(),
    }),
  )
  const row = Array.isArray(data) ? data[0] : null
  if (!row) return null
  return {
    id: row.id,
    studentId: row.student_id,
    schoolId: row.school_id,
    theoryTopicsTotal: row.theory_topics_total,
    theoryTopicsCompleted: row.theory_topics_completed,
    drivingHoursTotal: row.driving_hours_total,
    drivingHoursCompleted: row.driving_hours_completed,
    confirmedHours: row.driving_hours_completed,
    internalExamPassed: row.internal_exam_passed,
    internalExamDate: row.internal_exam_date,
    internalExamStatus: row.internal_exam_status,
    gaidExamDate: row.gaid_exam_date,
    gibddExamStatus: row.gibdd_exam_status,
    notes: row.notes,
    updatedAt: row.updated_at,
  }
}

export async function upsertSupabaseStudentDocumentsAdmin(documents: StudentDocument[]): Promise<void> {
  if (documents.length === 0) return
  await runAdminMutation(
    supabase.rpc('public_upsert_student_documents', {
      p_documents: documents.map((document) => ({
        student_id: document.studentId,
        type: document.type,
        status: document.status,
        updated_at: document.updatedAt,
      })),
      p_staff_password: getAdminSecret(),
    }),
  )
}

export async function getSupabaseStudentDocumentsAdmin(studentId: string): Promise<StudentDocument[]> {
  if (!isWorkspaceSupabaseReady()) return []
  const data = await runAdminMutation<StudentDocumentRow[]>(
    supabase.rpc('public_get_student_documents', {
      p_student_id: studentId,
      p_staff_password: getAdminSecret(),
    }),
  )
  return (data ?? []).map((row) => ({
    studentId: row.student_id,
    type: row.type,
    status: row.status,
    updatedAt: row.updated_at,
  }))
}

export async function updateSupabaseStudentRequestStatusAdmin(
  schoolId: string,
  requestId: string,
  status: StudentRequestStatus,
  updatedAt: string,
): Promise<void> {
  await runAdminMutation(
    supabase.rpc('public_update_student_request_status', {
      p_school_id: schoolId,
      p_request_id: requestId,
      p_status: status,
      p_updated_at: updatedAt,
      p_staff_password: getAdminSecret(),
    }),
  )
}

export async function getSupabaseStudentRequestsAdmin(schoolId: string): Promise<StudentRequest[]> {
  if (!isWorkspaceSupabaseReady()) return []
  const data = await runAdminMutation<StudentRequestRow[]>(
    supabase.rpc('public_admin_list_student_requests', {
      p_school_id: schoolId,
      p_staff_password: getAdminSecret(),
    }),
  )
  return (data ?? []).map((row) => ({
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

export async function upsertSupabaseBranch(branchId: string, input: BranchInput): Promise<void> {
  await runAdminMutation(
    supabase.rpc('public_upsert_branch', {
      p_branch_id: branchId,
      p_school_id: input.schoolId,
      p_name: input.name,
      p_address: input.address ?? '',
      p_phone: input.phone ?? '',
      p_is_active: input.isActive,
      p_staff_password: getAdminSecret(),
    }),
  )
}

export async function deleteSupabaseBranch(branchId: string): Promise<void> {
  await runAdminMutation(
    supabase.rpc('public_delete_branch', {
      p_branch_id: branchId,
      p_staff_password: getAdminSecret(),
    }),
  )
}

export async function upsertSupabaseInstructor(instructorId: string, input: InstructorInput, token: string): Promise<void> {
  await runAdminMutation(
    supabase.rpc('public_upsert_instructor', {
      p_instructor_id: instructorId,
      p_school_id: input.schoolId,
      p_branch_id: input.branchId,
      p_name: input.name,
      p_phone: input.phone ?? '',
      p_email: input.email ?? '',
      p_token: token,
      p_bio: input.bio ?? '',
      p_is_active: input.isActive,
      p_car: input.car ?? '',
      p_transmission: input.transmission ?? null,
      p_categories: input.categories?.length ? input.categories : ['B'],
      p_staff_password: getAdminSecret(),
    }),
  )
}

export async function updateSupabaseInstructorActive(instructorId: string, isActive: boolean): Promise<void> {
  await runAdminMutation(
    supabase.rpc('public_update_instructor_active', {
      p_instructor_id: instructorId,
      p_is_active: isActive,
      p_staff_password: getAdminSecret(),
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
  lessonType: LessonType
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
      p_lesson_type: params.lessonType,
      p_staff_password: getAdminSecret(),
    }),
  )
}

export async function updateSupabaseSlotStatus(slotId: string, status: SlotStatus): Promise<void> {
  await runAdminMutation(
    supabase.rpc('public_update_slot_status', {
      p_slot_id: slotId,
      p_status: status,
      p_staff_password: getAdminSecret(),
    }),
  )
}

export async function deleteSupabaseSlot(slotId: string): Promise<void> {
  await runAdminMutation(
    supabase.rpc('public_delete_slot', {
      p_slot_id: slotId,
      p_staff_password: getAdminSecret(),
    }),
  )
}
