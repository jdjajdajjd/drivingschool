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

export interface Slot {
  id: string
  schoolId: string
  instructorId: string
  branchId: string
  date: string
  time: string
  duration: number
  status: SlotStatus
  bookingId?: string
  createdAt?: string
}

export type BookingStatus = 'active' | 'cancelled' | 'completed'

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
  branchChangeRequestedAt?: string
  branchChangeNote?: string
  hasPassword?: boolean
  createdAt: string
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
