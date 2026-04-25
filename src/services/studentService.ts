import { isAfter } from 'date-fns'
import type { ResolvedBooking, Student, StudentStats } from '../types'
import { db } from './storage'
import { getBookingById, getBookingsByStudent, getSlotDateTime, normalizePhone } from './bookingService'

export function getStudentById(studentId: string): Student | null {
  return db.students.byId(studentId)
}

export function getStudentByNormalizedPhone(schoolId: string, normalizedPhone: string): Student | null {
  return db.students.byNormalizedPhone(schoolId, normalizedPhone)
}

export function getStudentsBySchool(schoolId: string): Student[] {
  return [...db.students.bySchool(schoolId)].sort((left, right) => left.name.localeCompare(right.name, 'ru'))
}

export function getStudentStats(studentId: string): StudentStats {
  const student = getStudentById(studentId)
  const school = student ? db.schools.byId(student.schoolId) : null
  const bookings = student ? getBookingsByStudent(student.id) : []
  const now = new Date()

  const activeFutureBookings = bookings.filter((entry) =>
    entry.booking.status === 'active' && entry.slot ? isAfter(getSlotDateTime(entry.slot), now) : false,
  )
  const completedBookings = bookings.filter((entry) => entry.booking.status === 'completed')
  const cancelledBookings = bookings.filter((entry) => entry.booking.status === 'cancelled')

  const sortedByDate = [...bookings].sort((left, right) => {
    const leftTime = left.slot ? getSlotDateTime(left.slot).getTime() : 0
    const rightTime = right.slot ? getSlotDateTime(right.slot).getTime() : 0
    return leftTime - rightTime
  })

  const lastBooking = [...sortedByDate]
    .reverse()
    .find((entry) => entry.slot ? getSlotDateTime(entry.slot).getTime() <= now.getTime() : false)?.booking ?? null

  const nextBooking = sortedByDate.find((entry) =>
    entry.booking.status === 'active' && entry.slot ? isAfter(getSlotDateTime(entry.slot), now) : false,
  )?.booking ?? null

  return {
    totalBookings: bookings.length,
    activeFutureBookings: activeFutureBookings.length,
    completedBookings: completedBookings.length,
    cancelledBookings: cancelledBookings.length,
    cancellationsCount: cancelledBookings.length,
    lastBooking,
    nextBooking,
    limitReached:
      Boolean(
        school?.bookingLimitEnabled &&
          school.maxActiveBookingsPerStudent &&
          activeFutureBookings.length >= school.maxActiveBookingsPerStudent,
      ),
  }
}

export function getStudentActiveFutureBookingsCount(studentId: string): number {
  return getStudentStats(studentId).activeFutureBookings
}

export function getStudentHistory(studentId: string): ResolvedBooking[] {
  return getBookingsByStudent(studentId)
}

export function getStudentByPhone(schoolId: string, phone: string): Student | null {
  return getStudentByNormalizedPhone(schoolId, normalizePhone(phone))
}

export function getResolvedStudentBooking(bookingId: string): ResolvedBooking | null {
  return getBookingById(bookingId)
}
