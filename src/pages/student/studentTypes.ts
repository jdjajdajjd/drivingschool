import type { Booking, Branch, Instructor, Slot } from '../../types'

export type StudentView = 'home' | 'schedule' | 'theory' | 'chat' | 'profile' | 'driving'
export type LessonFilter = 'all' | 'main' | 'extra'
export type ProfileField = 'name' | 'phone' | 'email'
export type InfoSheet = 'student' | 'profileData' | 'tips' | 'settings' | null

export interface ResolvedStudentBooking {
  booking: Booking
  slot: Slot | null
  instructor: Instructor | null
  branch: Branch | null
}
