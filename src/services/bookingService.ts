import { addMinutes, endOfDay, format, isAfter, isBefore, isSameDay, parseISO, startOfDay } from 'date-fns'
import { ru } from 'date-fns/locale'
import { generateId } from '../lib/utils'
import type { Booking, ResolvedBooking, School, Slot, Student } from '../types'
import { db } from './storage'

const SLOT_LOCK_TTL_MS = 2 * 60 * 1000

export interface BookingMutationResult {
  ok: boolean
  booking?: Booking
  error?: string
  warning?: string
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

export interface RescheduleBookingParams {
  bookingId: string
  newSlotId: string
  ignoreLimits?: boolean
}

export function formatDate(dateValue: string): string {
  return format(parseISO(dateValue), 'd MMMM', { locale: ru })
}

export function formatTime(timeValue: string): string {
  return timeValue.slice(0, 5)
}

export function getSlotDateTime(slot: Pick<Slot, 'date' | 'time'>): Date {
  return new Date(`${slot.date}T${slot.time}:00`)
}

export function isSlotInPast(slot: Pick<Slot, 'date' | 'time'>): boolean {
  return getSlotDateTime(slot).getTime() < Date.now()
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
  return format(date, "yyyyMMdd'T'HHmmss")
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

export function validateRussianPhone(phone: string): boolean {
  return /^7\d{10}$/.test(normalizePhone(phone))
}

export const isValidRussianPhone = validateRussianPhone

export function getStudentByNormalizedPhone(schoolId: string, normalizedPhone: string): Student | null {
  return db.students.byNormalizedPhone(schoolId, normalizedPhone)
}

export function getStudentByPhone(schoolId: string, phone: string): Student | null {
  return getStudentByNormalizedPhone(schoolId, normalizePhone(phone))
}

export function getOrCreateStudent(
  schoolId: string,
  name: string,
  phone: string,
): Student {
  const normalizedPhone = normalizePhone(phone)
  const existingStudent = getStudentByNormalizedPhone(schoolId, normalizedPhone)

  if (existingStudent) {
    const nextStudent: Student = {
      ...existingStudent,
      name: name.trim() || existingStudent.name,
      phone: normalizedPhone,
      normalizedPhone,
    }
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
  return db.bookings
    .bySchool(schoolId)
    .filter((booking) => booking.status === 'active' && booking.studentPhone === normalizedPhone)
    .filter((booking) => {
      const slot = db.slots.byId(booking.slotId)
      return slot ? isAfter(getSlotDateTime(slot), new Date()) : false
    }).length
}

export function getSlotLockOwner(slotId: string): string | null {
  db.slotLocks.clearExpired()
  return db.slotLocks.bySlotId(slotId)?.sessionId ?? null
}

export function acquireSlotLock(slotId: string, sessionId: string): { ok: boolean; error?: string } {
  db.slotLocks.clearExpired()

  const slot = db.slots.byId(slotId)
  if (!slot) {
    return { ok: false, error: 'Слот не найден.' }
  }

  if (slot.status !== 'available') {
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

export function getAvailableSlots(
  instructorId: string,
  date: string,
  sessionId?: string,
): Slot[] {
  db.slotLocks.clearExpired()

  return db.slots
    .byInstructorAndDate(instructorId, date)
    .filter((slot) => slot.status === 'available')
    .filter((slot) => {
      const lock = db.slotLocks.bySlotId(slot.id)
      return !lock || lock.sessionId === sessionId
    })
    .sort((left, right) => left.time.localeCompare(right.time))
}

function checkBookingLimit(school: School, normalizedPhone: string): string | null {
  if (!school.bookingLimitEnabled || !school.maxActiveBookingsPerStudent) {
    return null
  }

  const activeBookings = getStudentActiveFutureBookingsCount(school.id, normalizedPhone)
  if (activeBookings >= school.maxActiveBookingsPerStudent) {
    return `У вас уже есть ${school.maxActiveBookingsPerStudent} активные записи. Чтобы выбрать другое время, отмените одну из текущих записей или обратитесь в автошколу.`
  }

  return null
}

function saveBookingAndSlot(booking: Booking, slot: Slot): BookingMutationResult {
  db.bookings.upsert(booking)
  db.slots.upsert(slot)
  return { ok: true, booking }
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

  if (!validateRussianPhone(normalizedPhone)) {
    return { ok: false, error: 'Введите корректный номер телефона в российском формате.' }
  }

  const school = db.schools.byId(params.schoolId)
  const slot = db.slots.byId(params.slotId)
  const instructor = db.instructors.byId(params.instructorId)
  const branch = db.branches.byId(params.branchId)

  if (!school || !slot || !instructor || !branch) {
    return { ok: false, error: 'Не удалось найти данные для записи.' }
  }

  if (slot.status !== 'available') {
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

  const limitError = checkBookingLimit(school, normalizedPhone)
  if (limitError) {
    releaseSlotLock(slot.id, params.sessionId)
    return { ok: false, error: limitError }
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
    updatedAt: new Date().toISOString(),
  }

  const nextSlot: Slot = {
    ...slot,
    status: 'booked',
    bookingId: booking.id,
  }

  const result = saveBookingAndSlot(booking, nextSlot)
  releaseSlotLock(slot.id, params.sessionId)
  return result
}

export function cancelBooking(bookingId: string): BookingMutationResult {
  const booking = db.bookings.byId(bookingId)
  if (!booking) {
    return { ok: false, error: 'Запись не найдена.' }
  }

  if (booking.status !== 'active') {
    return { ok: false, error: 'Отменить можно только активную запись.' }
  }

  const nextBooking: Booking = {
    ...booking,
    status: 'cancelled',
    updatedAt: new Date().toISOString(),
  }

  const slot = db.slots.byId(booking.slotId)
  if (!slot) {
    db.bookings.upsert(nextBooking)
    return { ok: true, booking: nextBooking }
  }

  const nextSlot: Slot = {
    ...slot,
    status: 'available',
    bookingId: undefined,
  }

  return saveBookingAndSlot(nextBooking, nextSlot)
}

export function completeBooking(bookingId: string): BookingMutationResult {
  const booking = db.bookings.byId(bookingId)
  if (!booking) {
    return { ok: false, error: 'Запись не найдена.' }
  }

  if (booking.status !== 'active') {
    return { ok: false, error: 'Провести можно только активную запись.' }
  }

  const nextBooking: Booking = {
    ...booking,
    status: 'completed',
    updatedAt: new Date().toISOString(),
  }

  db.bookings.upsert(nextBooking)
  return { ok: true, booking: nextBooking }
}

export function rescheduleBooking(params: RescheduleBookingParams): BookingMutationResult {
  const booking = db.bookings.byId(params.bookingId)
  if (!booking) {
    return { ok: false, error: 'Запись не найдена.' }
  }

  if (booking.status !== 'active') {
    return { ok: false, error: 'Перенести можно только активную запись.' }
  }

  const currentSlot = db.slots.byId(booking.slotId)
  const nextSlot = db.slots.byId(params.newSlotId)

  if (!nextSlot) {
    return { ok: false, error: 'Новый слот не найден.' }
  }

  if (nextSlot.status !== 'available') {
    return { ok: false, error: 'Новый слот уже занят.' }
  }

  if (isSlotInPast(nextSlot)) {
    return { ok: false, error: 'Нельзя перенести запись на слот в прошлом.' }
  }

  const school = db.schools.byId(booking.schoolId)
  if (school && !params.ignoreLimits && school.bookingLimitEnabled && school.maxActiveBookingsPerStudent) {
    const futureCount = getStudentActiveFutureBookingsCount(booking.schoolId, booking.studentPhone)
    const currentSlotIsFuture = currentSlot ? isAfter(getSlotDateTime(currentSlot), new Date()) : false
    if (!currentSlotIsFuture && futureCount >= school.maxActiveBookingsPerStudent) {
      return {
        ok: false,
        error: `У ученика уже есть ${school.maxActiveBookingsPerStudent} активные записи. Чтобы выбрать другое время, отмените одну из текущих записей или обратитесь в автошколу.`,
      }
    }
  }

  const nextBooking: Booking = {
    ...booking,
    slotId: nextSlot.id,
    branchId: nextSlot.branchId,
    instructorId: nextSlot.instructorId,
    updatedAt: new Date().toISOString(),
    rescheduledAt: new Date().toISOString(),
  }

  db.bookings.upsert(nextBooking)

  if (currentSlot) {
    db.slots.upsert({
      ...currentSlot,
      status: 'available',
      bookingId: undefined,
    })
  }

  db.slots.upsert({
    ...nextSlot,
    status: 'booked',
    bookingId: booking.id,
  })

  return {
    ok: true,
    booking: nextBooking,
    warning:
      school && school.bookingLimitEnabled && school.maxActiveBookingsPerStudent
        ? 'Перенос выполнен. Администратор может обходить лимит будущих записей.'
        : undefined,
  }
}

export function getBookingById(bookingId: string): ResolvedBooking | null {
  const booking = db.bookings.byId(bookingId)
  if (!booking) {
    return null
  }

  return {
    booking,
    slot: db.slots.byId(booking.slotId),
    branch: db.branches.byId(booking.branchId),
    instructor: db.instructors.byId(booking.instructorId),
    school: db.schools.byId(booking.schoolId),
    student: booking.studentId ? db.students.byId(booking.studentId) : getStudentByPhone(booking.schoolId, booking.studentPhone),
  }
}

function sortBookingsBySlotDate(bookings: Booking[]): Booking[] {
  return [...bookings].sort((left, right) => {
    const leftSlot = db.slots.byId(left.slotId)
    const rightSlot = db.slots.byId(right.slotId)
    const leftTime = leftSlot ? getSlotDateTime(leftSlot).getTime() : 0
    const rightTime = rightSlot ? getSlotDateTime(rightSlot).getTime() : 0
    return leftTime - rightTime
  })
}

export function getBookingsBySchool(schoolId: string): ResolvedBooking[] {
  return sortBookingsBySlotDate(db.bookings.bySchool(schoolId)).map((booking) => getBookingById(booking.id)).filter((entry): entry is ResolvedBooking => Boolean(entry))
}

export function getBookingsByInstructor(instructorId: string): ResolvedBooking[] {
  return sortBookingsBySlotDate(db.bookings.byInstructor(instructorId)).map((booking) => getBookingById(booking.id)).filter((entry): entry is ResolvedBooking => Boolean(entry))
}

export function getBookingsByStudent(studentId: string): ResolvedBooking[] {
  const bookings = db.bookings.all().filter((booking) => booking.studentId === studentId)
  return sortBookingsBySlotDate(bookings).map((booking) => getBookingById(booking.id)).filter((entry): entry is ResolvedBooking => Boolean(entry))
}

export function getUpcomingBookings(schoolId: string): ResolvedBooking[] {
  const now = new Date()
  return getBookingsBySchool(schoolId).filter((entry) =>
    entry.slot ? isAfter(getSlotDateTime(entry.slot), now) || isSameDay(getSlotDateTime(entry.slot), now) : false,
  )
}

export function getPastBookings(schoolId: string): ResolvedBooking[] {
  const now = new Date()
  return getBookingsBySchool(schoolId).filter((entry) =>
    entry.slot ? isBefore(getSlotDateTime(entry.slot), startOfDay(now)) : false,
  )
}

export function getTodayBookings(schoolId: string): ResolvedBooking[] {
  const today = new Date()
  return getBookingsBySchool(schoolId).filter((entry) => entry.slot ? isSameDay(getSlotDateTime(entry.slot), today) : false)
}

export function getTomorrowBookings(schoolId: string): ResolvedBooking[] {
  const tomorrowStart = startOfDay(addMinutes(new Date(), 24 * 60))
  const tomorrowEnd = endOfDay(tomorrowStart)

  return getBookingsBySchool(schoolId).filter((entry) => {
    if (!entry.slot) {
      return false
    }

    const date = getSlotDateTime(entry.slot)
    return !isBefore(date, tomorrowStart) && !isAfter(date, tomorrowEnd)
  })
}

export function generateIcsFile(bookingId: string): string | null {
  const resolved = getBookingById(bookingId)
  if (!resolved || !resolved.slot || !resolved.instructor || !resolved.branch || !resolved.school) {
    return null
  }

  const { booking, slot, instructor, branch, school } = resolved
  const start = getSlotDateTime(slot)
  const end = addMinutes(start, slot.duration)
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

export const generateIcs = generateIcsFile
