import type { Booking, Instructor, Slot } from '../types'
import { db } from './storage'

export type ScheduleConflictResource = 'student' | 'instructor' | 'car'

export interface ScheduleConflict {
  resource: ScheduleConflictResource
  booking?: Booking
  slot: Slot
  instructor?: Instructor | null
  message: string
}

export function minutesFromTime(value: string): number {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

export function rangesOverlap(startA: number, durationA: number, startB: number, durationB: number): boolean {
  return startA < startB + durationB && startB < startA + durationA
}

export function slotsOverlap(left: Pick<Slot, 'date' | 'time' | 'duration'>, right: Pick<Slot, 'date' | 'time' | 'duration'>): boolean {
  if (left.date !== right.date) return false
  return rangesOverlap(minutesFromTime(left.time), left.duration, minutesFromTime(right.time), right.duration)
}

function cleanCar(value?: string): string {
  return (value ?? '').trim().toLowerCase()
}

function lessonLabel(slot: Pick<Slot, 'date' | 'time'>): string {
  return `${slot.date} в ${slot.time}`
}

export function findInstructorSlotConflict(params: {
  instructorId: string
  date: string
  startTime: string
  duration: number
  excludeSlotId?: string
}): Slot | null {
  const target = { date: params.date, time: params.startTime, duration: params.duration }
  return db.slots
    .byInstructorAndDate(params.instructorId, params.date)
    .filter((slot) => slot.id !== params.excludeSlotId && slot.status !== 'cancelled')
    .find((slot) => slotsOverlap(target, slot)) ?? null
}

export function findCarSlotConflict(params: {
  schoolId: string
  instructorId: string
  date: string
  startTime: string
  duration: number
  excludeSlotId?: string
}): { slot: Slot; instructor: Instructor | null } | null {
  const targetInstructor = db.instructors.byId(params.instructorId)
  const targetCar = cleanCar(targetInstructor?.car)
  if (!targetCar) return null

  const target = { date: params.date, time: params.startTime, duration: params.duration }
  const instructorsById = new Map(db.instructors.bySchool(params.schoolId).map((instructor) => [instructor.id, instructor]))

  for (const slot of db.slots.bySchool(params.schoolId)) {
    if (slot.id === params.excludeSlotId || slot.status === 'cancelled' || slot.date !== params.date) continue
    const slotInstructor = instructorsById.get(slot.instructorId) ?? null
    if (!slotInstructor || slotInstructor.id === params.instructorId) continue
    if (cleanCar(slotInstructor.car) !== targetCar) continue
    if (slotsOverlap(target, slot)) return { slot, instructor: slotInstructor }
  }

  return null
}

export function getSlotCreationConflictError(params: {
  schoolId: string
  instructorId: string
  date: string
  startTime: string
  duration: number
  excludeSlotId?: string
  formatDuration: (duration: number) => string
}): string | null {
  const instructorConflict = findInstructorSlotConflict(params)
  if (instructorConflict) {
    return `У инструктора уже есть окно ${instructorConflict.time} на ${params.formatDuration(instructorConflict.duration)}.`
  }

  const carConflict = findCarSlotConflict(params)
  if (carConflict) {
    const instructorName = carConflict.instructor?.name ? ` у ${carConflict.instructor.name}` : ''
    return `Машина уже занята ${lessonLabel(carConflict.slot)}${instructorName}. Выберите другое время или другую машину.`
  }

  return null
}

export function findActiveBookingResourceConflict(targetSlot: Slot, options: {
  excludeBookingId?: string
  studentId?: string
  studentPhone?: string
} = {}): ScheduleConflict | null {
  const targetInstructor = db.instructors.byId(targetSlot.instructorId)
  const targetCar = cleanCar(targetInstructor?.car)
  const instructorsById = new Map(db.instructors.bySchool(targetSlot.schoolId).map((instructor) => [instructor.id, instructor]))

  for (const booking of db.bookings.bySchool(targetSlot.schoolId)) {
    if (booking.id === options.excludeBookingId || booking.status !== 'active') continue
    const slot = db.slots.byId(booking.slotId)
    if (!slot || slot.id === targetSlot.id || !slotsOverlap(targetSlot, slot)) continue

    const sameStudent = Boolean(
      (options.studentId && booking.studentId === options.studentId) ||
      (options.studentPhone && booking.studentPhone === options.studentPhone),
    )
    if (sameStudent) {
      return {
        resource: 'student',
        booking,
        slot,
        instructor: instructorsById.get(slot.instructorId) ?? null,
        message: `У ученика уже есть занятие ${lessonLabel(slot)}. Выберите другое время.`,
      }
    }

    if (booking.instructorId === targetSlot.instructorId || slot.instructorId === targetSlot.instructorId) {
      return {
        resource: 'instructor',
        booking,
        slot,
        instructor: targetInstructor,
        message: `У инструктора уже есть занятие ${lessonLabel(slot)}. Выберите другое время.`,
      }
    }

    const bookingInstructor = instructorsById.get(slot.instructorId) ?? null
    if (targetCar && cleanCar(bookingInstructor?.car) === targetCar) {
      return {
        resource: 'car',
        booking,
        slot,
        instructor: bookingInstructor,
        message: `Машина уже занята ${lessonLabel(slot)}${bookingInstructor?.name ? ` у ${bookingInstructor.name}` : ''}. Выберите другое время или другую машину.`,
      }
    }
  }

  return null
}
