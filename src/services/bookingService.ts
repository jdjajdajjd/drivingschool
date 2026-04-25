import { generateId } from '../lib/utils'
import type { Booking, Slot, Student } from '../types'
import { db } from './storage'

const SLOT_LOCK_TTL_MS = 2 * 60 * 1000

export interface BookingMutationResult {
  ok: boolean
  booking?: Booking
  error?: string
}

export interface CreateBookingParams {
  schoolId: string
  branchId: string
  instructorId: string
  slotId: string
  studentName: string
  studentPhone: string
  sessionId: string
}

function getSlotDateTime(slot: Slot): Date {
  return new Date(`${slot.date}T${slot.time}:00`)
}

function escapeIcsValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

function formatUtcDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function formatLocalDate(date: Date): string {
  const year = String(date.getFullYear())
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}${month}${day}T${hours}${minutes}${seconds}`
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')

  if (digits.length === 11 && digits.startsWith('8')) {
    return `7${digits.slice(1)}`
  }

  if (digits.length === 11 && digits.startsWith('7')) {
    return digits
  }

  if (digits.length === 10 && digits.startsWith('9')) {
    return `7${digits}`
  }

  return digits
}

export function isValidRussianPhone(phone: string): boolean {
  return /^7\d{10}$/.test(normalizePhone(phone))
}

export function getStudentByPhone(schoolId: string, phone: string): Student | null {
  const normalizedPhone = normalizePhone(phone)
  return (
    db.students
      .bySchool(schoolId)
      .find((student) => student.normalizedPhone === normalizedPhone) ?? null
  )
}

export function getOrCreateStudent(
  schoolId: string,
  name: string,
  phone: string,
): Student {
  const normalizedPhone = normalizePhone(phone)
  const existingStudent = getStudentByPhone(schoolId, normalizedPhone)

  if (existingStudent) {
    const nextStudent: Student =
      existingStudent.name !== name.trim() || existingStudent.phone !== normalizedPhone
        ? {
            ...existingStudent,
            name: name.trim(),
            phone: normalizedPhone,
            normalizedPhone,
          }
        : existingStudent

    db.students.upsert(nextStudent)
    return nextStudent
  }

  const student: Student = {
    id: generateId('stu'),
    schoolId,
    name: name.trim(),
    phone: normalizedPhone,
    normalizedPhone,
    email: '',
    createdAt: new Date().toISOString(),
  }

  db.students.upsert(student)
  return student
}

export function getStudentActiveFutureBookingsCount(
  schoolId: string,
  normalizedPhone: string,
): number {
  const now = Date.now()

  return db.bookings
    .bySchool(schoolId)
    .filter((booking) => {
      if (booking.status !== 'active') {
        return false
      }

      if (booking.studentPhone !== normalizedPhone) {
        return false
      }

      const slot = db.slots.byId(booking.slotId)
      return slot ? getSlotDateTime(slot).getTime() > now : false
    }).length
}

export function getSlotLockOwner(slotId: string): string | null {
  db.slotLocks.clearExpired()
  return db.slotLocks.bySlotId(slotId)?.sessionId ?? null
}

export function acquireSlotLock(slotId: string, sessionId: string): { ok: boolean; error?: string } {
  db.slotLocks.clearExpired()

  const slot = db.slots.byId(slotId)
  if (!slot || slot.status === 'booked') {
    return { ok: false, error: 'Этот слот уже недоступен.' }
  }

  const existingLock = db.slotLocks.bySlotId(slotId)
  if (existingLock && existingLock.sessionId !== sessionId) {
    return { ok: false, error: 'Этот слот уже выбирает другой пользователь.' }
  }

  db.slotLocks.upsert({
    slotId,
    sessionId,
    expiresAt: new Date(Date.now() + SLOT_LOCK_TTL_MS).toISOString(),
  })

  return { ok: true }
}

export function releaseSlotLock(slotId: string, sessionId: string): void {
  const lock = db.slotLocks.bySlotId(slotId)
  if (lock?.sessionId === sessionId) {
    db.slotLocks.remove(slotId)
  }
}

export function releaseSessionLocks(sessionId: string): void {
  db.slotLocks.removeBySession(sessionId)
}

export function getAvailableSlots(instructorId: string, date: string, sessionId?: string): Slot[] {
  db.slotLocks.clearExpired()

  return db.slots
    .byInstructorAndDate(instructorId, date)
    .filter((slot) => {
      if (slot.status !== 'available') {
        return false
      }

      const lock = db.slotLocks.bySlotId(slot.id)
      return !lock || lock.sessionId === sessionId
    })
    .sort((left, right) => left.time.localeCompare(right.time))
}

export function createBooking(params: CreateBookingParams): BookingMutationResult {
  const studentName = params.studentName.trim()
  const normalizedPhone = normalizePhone(params.studentPhone)

  if (!params.branchId || !params.instructorId || !params.slotId) {
    return { ok: false, error: 'Выберите филиал, инструктора и слот.' }
  }

  if (!studentName) {
    return { ok: false, error: 'Введите имя ученика.' }
  }

  if (!isValidRussianPhone(normalizedPhone)) {
    return { ok: false, error: 'Введите корректный номер телефона в российском формате.' }
  }

  const school = db.schools.byId(params.schoolId)
  const slot = db.slots.byId(params.slotId)

  if (!school || !slot) {
    return { ok: false, error: 'Не удалось найти данные записи.' }
  }

  if (slot.status === 'booked') {
    return { ok: false, error: 'Этот слот уже занят. Выберите другое время.' }
  }

  const lockOwner = getSlotLockOwner(slot.id)
  if (lockOwner && lockOwner !== params.sessionId) {
    return { ok: false, error: 'Слот уже занят другим пользователем.' }
  }

  const lockResult = acquireSlotLock(slot.id, params.sessionId)
  if (!lockResult.ok) {
    return { ok: false, error: lockResult.error }
  }

  if (school.bookingLimitEnabled && school.maxActiveBookingsPerStudent) {
    const activeBookings = getStudentActiveFutureBookingsCount(params.schoolId, normalizedPhone)
    if (activeBookings >= school.maxActiveBookingsPerStudent) {
      return {
        ok: false,
        error: `Достигнут лимит активных записей: ${school.maxActiveBookingsPerStudent}.`,
      }
    }
  }

  const student = getOrCreateStudent(params.schoolId, studentName, normalizedPhone)

  const booking: Booking = {
    id: generateId('booking'),
    schoolId: params.schoolId,
    branchId: params.branchId,
    instructorId: params.instructorId,
    slotId: params.slotId,
    studentId: student.id,
    studentName: student.name,
    studentPhone: student.normalizedPhone,
    studentEmail: student.email,
    status: 'active',
    createdAt: new Date().toISOString(),
  }

  db.bookings.upsert(booking)
  db.slots.upsert({
    ...slot,
    status: 'booked',
    bookingId: booking.id,
  })
  releaseSlotLock(slot.id, params.sessionId)

  return { ok: true, booking }
}

export function cancelBooking(bookingId: string): BookingMutationResult {
  const booking = db.bookings.byId(bookingId)
  if (!booking) {
    return { ok: false, error: 'Запись не найдена.' }
  }

  if (booking.status !== 'active') {
    return { ok: false, error: 'Отменить можно только активную запись.' }
  }

  const nextBooking: Booking = { ...booking, status: 'cancelled' }
  db.bookings.upsert(nextBooking)

  const slot = db.slots.byId(booking.slotId)
  if (slot) {
    db.slots.upsert({
      ...slot,
      status: 'available',
      bookingId: undefined,
    })
  }

  return { ok: true, booking: nextBooking }
}

export function completeBooking(bookingId: string): BookingMutationResult {
  const booking = db.bookings.byId(bookingId)
  if (!booking) {
    return { ok: false, error: 'Запись не найдена.' }
  }

  if (booking.status !== 'active') {
    return { ok: false, error: 'Провести можно только активную запись.' }
  }

  const nextBooking: Booking = { ...booking, status: 'completed' }
  db.bookings.upsert(nextBooking)

  return { ok: true, booking: nextBooking }
}

export function generateIcs(bookingId: string): string | null {
  const booking = db.bookings.byId(bookingId)
  if (!booking) {
    return null
  }

  const slot = db.slots.byId(booking.slotId)
  const instructor = db.instructors.byId(booking.instructorId)
  const branch = db.branches.byId(booking.branchId)
  const school = db.schools.byId(booking.schoolId)

  if (!slot || !instructor || !branch || !school) {
    return null
  }

  const start = getSlotDateTime(slot)
  const end = new Date(start.getTime() + slot.duration * 60 * 1000)
  const transmission =
    instructor.transmission === 'manual'
      ? 'Механика'
      : instructor.transmission === 'auto'
        ? 'Автомат'
        : ''

  const description = [
    `Автошкола: ${school.name}`,
    `Инструктор: ${instructor.name}`,
    `Ученик: ${booking.studentName}`,
    instructor.car ? `Автомобиль: ${instructor.car}${transmission ? ` (${transmission})` : ''}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DriveDesk//Booking Flow//RU',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${booking.id}@drivedesk.local`,
    `DTSTAMP:${formatUtcDate(new Date())}`,
    `DTSTART:${formatLocalDate(start)}`,
    `DTEND:${formatLocalDate(end)}`,
    `SUMMARY:${escapeIcsValue(`Занятие: ${instructor.name}`)}`,
    `LOCATION:${escapeIcsValue(branch.address)}`,
    `DESCRIPTION:${escapeIcsValue(description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}
