export interface School {
  id: string
  name: string
  slug: string
  description: string
  phone: string
  email: string
  address: string
  createdAt: string
  logoUrl?: string
  primaryColor?: string
  bookingLimitEnabled?: boolean
  maxActiveBookingsPerStudent?: number
  branchSelectionMode?: 'student_choice' | 'fixed_first'
  maxSlotsPerBooking?: number
  defaultLessonDuration?: number
  enabledCategoryCodes?: string[]
  isActive?: boolean
}

export interface Branch {
  id: string
  schoolId: string
  name: string
  address: string
  phone: string
  isActive: boolean
}

export type Transmission = 'manual' | 'auto'

export interface Instructor {
  id: string
  schoolId: string
  branchId: string
  name: string
  phone: string
  email: string
  token: string
  bio: string
  experience: number
  isActive: boolean
  categories: string[]
  avatarInitials: string
  avatarColor: string
  car?: string
  transmission?: Transmission
}

export type SlotStatus = 'available' | 'booked' | 'cancelled'
export type LessonType = 'driving' | 'main' | 'extra' | 'practice_ground' | 'city' | 'exam_route' | 'internal_exam' | 'retake' | 'mistakes'

export interface Slot {
  id: string
  schoolId: string
  instructorId: string
  branchId: string
  date: string
  time: string
  duration: number
  lessonType?: LessonType
  status: SlotStatus
  bookingId?: string
  createdAt?: string
}

export type BookingStatus = 'active' | 'cancelled' | 'completed' | 'no_show'

export interface Booking {
  id: string
  bookingGroupId?: string
  schoolId: string
  slotId: string
  instructorId: string
  branchId: string
  studentId?: string
  studentName: string
  studentPhone: string
  studentEmail: string
  status: BookingStatus
  createdAt: string
  updatedAt?: string
  rescheduledAt?: string
  notes?: string
  comment?: string
  confirmedHours?: number
  cancellationReason?: string
  cancelledBy?: 'student' | 'school' | 'instructor'
}

export interface Student {
  id: string
  schoolId: string
  name: string
  phone: string
  normalizedPhone: string
  email: string
  avatarUrl?: string
  assignedBranchId?: string
  assignedInstructorId?: string
  categoryCodes?: string[]
  trainingStage?: TrainingStage
  groupName?: string
  trainingStartDate?: string
  drivingStartDate?: string
  trainingEndDate?: string
  drivingEndDate?: string
  branchChangeRequestedAt?: string
  branchChangeNote?: string
  hasPassword?: boolean
  notes?: string
  createdAt: string
}

export type TrainingStage =
  | 'new_request'
  | 'awaiting_contract'
  | 'contract_signed'
  | 'theory'
  | 'training_active'
  | 'no_bookings'
  | 'has_debt'
  | 'missing_documents'
  | 'practice_ground'
  | 'city'
  | 'theory_completed'
  | 'practice_active'
  | 'practice_completed'
  | 'exam_prep'
  | 'ready_for_internal_exam'
  | 'internal_exam_passed'
  | 'ready_for_gibdd'
  | 'exam'
  | 'training_completed'
  | 'completed'
  | 'archived'
  | 'refused'
  | 'frozen'

export type StudentDocumentType =
  | 'passport'
  | 'medical_certificate'
  | 'snils'
  | 'contract'
  | 'photo'
  | 'state_fee'
  | 'consent_data_processing'
  | 'application'
  | 'parent_consent'
  | 'internal_certificate'
  | 'gibdd_exam_doc'

export type StudentDocumentStatus = 'missing' | 'pending' | 'provided' | 'approved' | 'rejected'

export interface StudentDocument {
  studentId: string
  type: StudentDocumentType
  status: StudentDocumentStatus
  updatedAt: string
}

export type StudentRequestType = 'reschedule' | 'cancel'
export type StudentRequestStatus = 'new' | 'reviewing' | 'resolved' | 'rejected'

export interface StudentRequest {
  id: string
  schoolId: string
  studentId: string
  bookingId?: string
  type: StudentRequestType
  status: StudentRequestStatus
  reason: string
  preferredTime?: string
  comment?: string
  createdAt: string
  updatedAt: string
}

export interface SlotLock {
  slotId: string
  sessionId: string
  expiresAt: string
}

export interface StudentStats {
  totalBookings: number
  activeFutureBookings: number
  completedBookings: number
  cancelledBookings: number
  cancellationsCount: number
  confirmedHours: number
  lastBooking: Booking | null
  nextBooking: Booking | null
  limitReached: boolean
}

export interface ResolvedBooking {
  booking: Booking
  slot: Slot | null
  branch: Branch | null
  instructor: Instructor | null
  school: School | null
  student: Student | null
}

export interface ResolvedSlot {
  slot: Slot
  branch: Branch | null
  instructor: Instructor | null
  booking: Booking | null
  student: Student | null
}

export interface BulkSlotCreateResult {
  created: Slot[]
  createdCount: number
  skippedDuplicates: number
  skippedPast: number
  skippedInactiveInstructor: number
}

export interface IntegrityIssue {
  id: string
  level: 'warning' | 'error'
  message: string
}

export type ModulePriceType = 'monthly' | 'one_time' | 'usage'
export type ModuleCategory =
  | 'notifications'
  | 'analytics'
  | 'management'
  | 'integrations'
  | 'sales'
  | 'limits'
  | 'one_time'

export interface Module {
  id: string
  name: string
  description: string
  shortDescription?: string
  category: ModuleCategory
  priceType: ModulePriceType
  monthlyPrice?: number
  oneTimePrice?: number
  usageNote?: string
  icon: string
  features: string[]
  isRecommended?: boolean
  isComingSoon?: boolean
}

export interface SchoolModule {
  id: string
  schoolId: string
  moduleId: string
  enabledAt: string
  status: 'enabled' | 'disabled'
}

export interface BillingSummary {
  baseMonthlyPrice: number
  modulesMonthlyTotal: number
  oneTimeTotal: number
  totalMonthlyPrice: number
  enabledModulesCount: number
}

export interface SchoolOverview {
  school: School
  branchCount: number
  instructorCount: number
  studentCount: number
  activeBookingsCount: number
  bookingsLast30Days: number
  freeSlots7Days: number
  enabledModulesCount: number
  billing: BillingSummary
  integrityWarnings: number
}

export interface StudentProgress {
  id: string
  studentId: string
  schoolId: string
  theoryTopicsTotal: number
  theoryTopicsCompleted: number
  drivingHoursTotal: number
  drivingHoursCompleted: number
  confirmedHours: number
  internalExamPassed: boolean
  internalExamDate: string | null
  internalExamStatus?: 'not_scheduled' | 'scheduled' | 'passed' | 'failed'
  gaidExamDate: string | null
  gibddExamStatus?: 'not_scheduled' | 'scheduled' | 'passed' | 'failed'
  notes: string
  updatedAt: string
}

export interface LessonDescription {
  slotId: string
  theme: string
  goals: string[]
  whatToBring: string[]
  notes: string
}

// ===== Машины =====
export type CarStatus = 'working' | 'maintenance' | 'repair' | 'reserved' | 'written_off'
export type CarTransmission = 'manual' | 'auto'

export interface Car {
  id: string
  schoolId: string
  branchId: string
  instructorId?: string
  brand: string
  model: string
  licensePlate: string
  category: string
  transmission: CarTransmission
  status: CarStatus
  color?: string
  year?: number
  insuranceNumber?: string
  insuranceExpiry?: string
  nextServiceDate?: string
  lastServiceDate?: string
  mileage?: number
  notes?: string
  createdAt: string
  updatedAt?: string
}

// ===== Оплаты =====
export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'overdue' | 'refund' | 'frozen' | 'disputed'
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'receipt' | 'other'

export interface Payment {
  id: string
  schoolId: string
  studentId: string
  bookingId?: string
  amount: number
  paidAmount: number
  remainingAmount: number
  status: PaymentStatus
  method?: PaymentMethod
  description: string
  dueDate?: string
  paidAt?: string
  refundAmount?: number
  refundReason?: string
  createdById?: string
  createdAt: string
  updatedAt?: string
}

export interface PricingPlan {
  id: string
  schoolId: string
  name: string
  category: string
  totalPrice: number
  installmentAvailable: boolean
  installmentMonths?: number
  installmentAmount?: number
  discountPercent?: number
  notes?: string
  isActive: boolean
  createdAt: string
}

// ===== Документы =====
export type DocumentStatus = 'not_required' | 'required' | 'missing' | 'pending' | 'uploaded' | 'verified' | 'rejected' | 'expired'
export type DocumentType =
  | 'contract'
  | 'passport'
  | 'medical_certificate'
  | 'consent_data_processing'
  | 'application'
  | 'parent_consent'
  | 'snils'
  | 'state_fee_receipt'
  | 'photo'
  | 'internal_certificate'
  | 'gibdd_exam_doc'

export interface Document {
  id: string
  schoolId: string
  studentId: string
  type: DocumentType
  status: DocumentStatus
  fileUrl?: string
  fileName?: string
  uploadedAt?: string
  verifiedAt?: string
  verifiedById?: string
  rejectionReason?: string
  expiresAt?: string
  notes?: string
  createdAt: string
  updatedAt?: string
}

// ===== Экзамены =====
export type InternalExamStatus = 'not_ready' | 'ready' | 'scheduled' | 'passed' | 'failed'
export type GIBDDExamStatus = 'not_ready' | 'ready' | 'scheduled' | 'passed' | 'failed'

export interface InternalExam {
  id: string
  schoolId: string
  studentId: string
  scheduledDate?: string
  examinerId?: string
  result?: 'passed' | 'failed'
  attemptNumber: number
  comment?: string
  status: InternalExamStatus
  createdAt: string
  updatedAt?: string
}

export interface GIBDDExam {
  id: string
  schoolId: string
  studentId: string
  scheduledDate?: string
  examDate?: string
  result?: 'passed' | 'failed'
  attemptNumber: number
  failureReason?: string
  status: GIBDDExamStatus
  createdAt: string
  updatedAt?: string
}

// ===== Пользователи и роли =====
export type UserRole = 'director' | 'admin' | 'branch_admin' | 'instructor' | 'accountant' | 'superadmin'
export type StaffPermission =
  | 'school.manage'
  | 'branches.manage'
  | 'staff.manage'
  | 'students.manage'
  | 'schedule.manage'
  | 'finance.view'
  | 'finance.manage'
  | 'vehicles.manage'
  | 'documents.manage'
  | 'exams.manage'
  | 'reports.view'
  | 'settings.manage'
  | 'data.delete'

export interface SchoolRoleDefinition {
  id: UserRole
  label: string
  description: string
  permissions: StaffPermission[]
  branchScoped: boolean
}

export interface User {
  id: string
  schoolId?: string
  role: UserRole
  roleId?: UserRole
  name: string
  phone: string
  email?: string
  passwordHash?: string
  isActive: boolean
  branchIds: string[]
  title?: string
  invitedAt?: string
  canViewFinances: boolean
  canManageSettings: boolean
  canDeleteData: boolean
  canManageStaff: boolean
  lastLoginAt?: string
  createdAt: string
  updatedAt?: string
}

// ===== Журнал действий =====
export type AuditAction =
  | 'booking_created'
  | 'booking_cancelled'
  | 'booking_rescheduled'
  | 'booking_completed'
  | 'booking_no_show'
  | 'payment_added'
  | 'payment_refund'
  | 'student_created'
  | 'student_note'
  | 'instructor_created'
  | 'instructor_updated'
  | 'car_created'
  | 'car_status_changed'
  | 'document_uploaded'
  | 'document_verified'
  | 'document_rejected'
  | 'exam_result_set'
  | 'settings_changed'
  | 'user_created'
  | 'user_updated'
  | 'slot_created'
  | 'slot_cancelled'

export interface AuditLogEntry {
  id: string
  schoolId: string
  userId: string
  userName: string
  action: AuditAction
  entityType: string
  entityId: string
  description: string
  oldValue?: string
  newValue?: string
  createdAt: string
}

// ===== Проблемные ситуации =====
export type ProblemType =
  | 'student_no_show'
  | 'student_late'
  | 'instructor_sick'
  | 'car_broken'
  | 'lesson_partial'
  | 'lesson_cancelled_by_school'
  | 'lesson_cancelled_by_student'
  | 'bad_weather'
  | 'student_wants_new_instructor'
  | 'student_wants_freeze'
  | 'student_wants_refund'
  | 'instructor_quit'
  | 'car_unavailable'
  | 'branch_closed'
  | 'exam_rescheduled'
  | 'student_disputes_hours'
  | 'admin_mistake'

export interface ProblemCase {
  id: string
  schoolId: string
  studentId?: string
  instructorId?: string
  carId?: string
  bookingId?: string
  type: ProblemType
  status: 'open' | 'in_progress' | 'resolved'
  description: string
  resolution?: string
  createdById: string
  assignedToId?: string
  createdAt: string
  resolvedAt?: string
}

// ===== Настройки школы =====
export interface SchoolSettings {
  schoolId: string
  defaultLessonDuration: number
  maxDaysAheadForBooking: number
  minHoursBeforeCancel: number
  maxActiveBookingsPerStudent: number
  allowBookingWithDebt: boolean
  allowBookingWithoutMedical: boolean
  allowBookingWithoutContract: boolean
  requireManualModeration: boolean
  allowChangeInstructor: boolean
  allowStudentChooseInstructor: boolean
  allowDifferentInstructors: boolean
  maxLessonsPerDay: number
  maxLessonsPerWeek: number
  breakBetweenLessons: number
  workDays: number[]
  workStartHour: number
  workEndHour: number
  defaultPricingPlans: PricingPlan[]
  blockBookingOnDebt: boolean
  debtGracePeriodDays: number
  notifyAdminOnNoShow: boolean
  notifyAdminOnCancel: boolean
  notifyAdminOnNewBooking: boolean
  notifyAdminOnDebt: boolean
  requiredDocuments: DocumentType[]
  documentExpiryWarningDays: number
}

// ===== Сводка для "Сегодня" =====
export interface TodaySummary {
  lessonsToday: number
  freeSlotsToday: number
  cancelledToday: number
  noShowsToday: number
  debtStudentsCount: number
  studentsWithoutBookingDays: number
  instructorsIdle: number
  instructorsOverloaded: number
  carsInRepair: number
  scheduleConflicts: number
  documentsExpiringSoon: number
  upcomingExams: number
  overdueBookings: number
  openProblemCases: number
}
