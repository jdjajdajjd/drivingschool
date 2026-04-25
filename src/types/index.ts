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

export type ModulePriceType = 'monthly' | 'one-time' | 'usage'
export type ModuleCategory =
  | 'notifications'
  | 'branding'
  | 'analytics'
  | 'management'
  | 'integrations'

export interface Module {
  id: string
  name: string
  description: string
  shortDescription: string
  price: number
  priceType: ModulePriceType
  usageNote?: string
  features: string[]
  icon: string
  category: ModuleCategory
  isPopular?: boolean
}

export interface SubscriptionModule {
  id: string
  schoolId: string
  moduleId: string
  activatedAt: string
  status: 'active' | 'paused'
}
