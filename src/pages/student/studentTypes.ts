import type { Booking, Branch, Instructor, LessonType, Slot } from '../../types'

export type StudentView = 'home' | 'schedule' | 'theory' | 'chat' | 'profile' | 'driving'
export type LessonFilter = 'all' | LessonType
export type ProfileField = 'name' | 'phone' | 'email'
export type InfoSheet = 'student' | 'gosuslugi' | 'offers' | 'settings' | null

export interface ResolvedStudentBooking {
  booking: Booking
  slot: Slot | null
  instructor: Instructor | null
  branch: Branch | null
}
