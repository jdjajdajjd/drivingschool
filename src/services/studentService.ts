import { isAfter } from 'date-fns'
import type { ResolvedBooking, Student, StudentStats } from '../types'
import { isWorkspaceSupabaseReady } from '../lib/supabase'
import { normalizePersonName } from '../lib/nameFormat'
import { db } from './storage'
import { getBookingById, getBookingsByStudent, getSlotDateTime, normalizePhone } from './bookingService'
import { updateSupabaseStudentAdmin } from './supabaseAdminService'
import { saveStudentCredentials } from './studentProfile'
import { assertAdminPermission } from './adminAccess'

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
  const confirmedHours = completedBookings.reduce((total, entry) => {
    if (typeof entry.booking.confirmedHours === 'number') return total + entry.booking.confirmedHours
    return total + (entry.slot ? Math.max(1, Math.round(entry.slot.duration / 60)) : 0)
  }, 0)

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
    confirmedHours,
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

export async function updateStudentAdminConfirmed(
  studentId: string,
  patch: Partial<Student>,
  options: { password?: string } = {},
): Promise<{ ok: boolean; student?: Student; error?: string }> {
  const access = assertAdminPermission('students.manage')
  if (!access.ok) return access

  const current = db.students.byId(studentId)
  if (!current) return { ok: false, error: 'Ученик не найден.' }

  const nextStudent: Student = { ...current, ...patch, name: patch.name !== undefined ? normalizePersonName(patch.name) : current.name }
  if (!nextStudent.name.trim()) return { ok: false, error: 'Укажите имя ученика.' }
  if (patch.schoolId && patch.schoolId !== current.schoolId) return { ok: false, error: 'Нельзя перенести ученика в другую автошколу.' }

  if (isWorkspaceSupabaseReady()) {
    try {
      await updateSupabaseStudentAdmin(nextStudent, options.password)
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Не удалось сохранить ученика.' }
    }
  }

  const savedStudent = { ...nextStudent, hasPassword: Boolean(options.password?.trim()) || nextStudent.hasPassword }
  db.students.upsert(savedStudent)
  if (options.password?.trim()) saveStudentCredentials(savedStudent.phone, options.password.trim(), savedStudent.schoolId)
  return { ok: true, student: savedStudent }
}

export async function createStudentAdminConfirmed(
  student: Student,
  options: { password?: string } = {},
): Promise<{ ok: boolean; student?: Student; error?: string }> {
  const access = assertAdminPermission('students.manage')
  if (!access.ok) return access

  const nextStudent: Student = { ...student, name: normalizePersonName(student.name) }
  if (!nextStudent.name.trim()) return { ok: false, error: 'Укажите имя ученика.' }
  if (!nextStudent.normalizedPhone?.trim()) return { ok: false, error: 'Укажите телефон ученика.' }

  const duplicate = db.students
    .bySchool(nextStudent.schoolId)
    .find((item) => item.id !== nextStudent.id && item.normalizedPhone === nextStudent.normalizedPhone)
  if (duplicate) return { ok: false, error: 'Ученик с таким телефоном уже есть.' }

  if (isWorkspaceSupabaseReady()) {
    try {
      await updateSupabaseStudentAdmin(nextStudent, options.password)
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Не удалось сохранить ученика.' }
    }
  }

  db.students.upsert({ ...nextStudent, hasPassword: Boolean(options.password?.trim()) || nextStudent.hasPassword })
  if (options.password?.trim()) saveStudentCredentials(nextStudent.phone, options.password.trim(), nextStudent.schoolId)
  return { ok: true, student: { ...nextStudent, hasPassword: Boolean(options.password?.trim()) || nextStudent.hasPassword } }
}

export function getResolvedStudentBooking(bookingId: string): ResolvedBooking | null {
  return getBookingById(bookingId)
}
