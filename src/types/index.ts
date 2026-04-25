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
  transmission?: 'manual' | 'auto'
}

export type SlotStatus = 'available' | 'booked'

export interface Slot {
  id: string
  instructorId: string
  branchId: string
  date: string   // YYYY-MM-DD
  time: string   // HH:MM
  duration: number // minutes
  status: SlotStatus
  bookingId?: string
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
