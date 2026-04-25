import { isAfter } from 'date-fns'
import type { IntegrityIssue } from '../types'
import { getSlotDateTime } from './bookingService'
import { db } from './storage'

export function validateDataIntegrity(schoolId: string): IntegrityIssue[] {
  const issues: IntegrityIssue[] = []
  const bookings = db.bookings.bySchool(schoolId)
  const slots = db.slots.bySchool(schoolId)
  const instructors = db.instructors.bySchool(schoolId)
  const branches = db.branches.bySchool(schoolId)
  const now = new Date()

  for (const booking of bookings) {
    const slot = db.slots.byId(booking.slotId)
    if (!slot) {
      issues.push({
        id: `booking-slot-${booking.id}`,
        level: 'error',
        message: `У записи ${booking.studentName} не найден слот.`,
      })
      continue
    }

    if (!db.instructors.byId(booking.instructorId)) {
      issues.push({
        id: `booking-inst-${booking.id}`,
        level: 'error',
        message: `У записи ${booking.studentName} не найден инструктор.`,
      })
    }

    if (!db.branches.byId(booking.branchId)) {
      issues.push({
        id: `booking-branch-${booking.id}`,
        level: 'error',
        message: `У записи ${booking.studentName} не найден филиал.`,
      })
    }

    if (booking.studentId && !db.students.byId(booking.studentId)) {
      issues.push({
        id: `booking-student-${booking.id}`,
        level: 'warning',
        message: `У записи ${booking.studentName} потеряна ссылка на ученика.`,
      })
    }

    if (booking.status === 'active' && isAfter(now, getSlotDateTime(slot))) {
      issues.push({
        id: `booking-past-${booking.id}`,
        level: 'warning',
        message: `Есть активная запись в прошлом: ${booking.studentName}.`,
      })
    }
  }

  for (const slot of slots) {
    if (!db.instructors.byId(slot.instructorId)) {
      issues.push({
        id: `slot-inst-${slot.id}`,
        level: 'error',
        message: `У слота ${slot.date} ${slot.time} не найден инструктор.`,
      })
    }

    if (!db.branches.byId(slot.branchId)) {
      issues.push({
        id: `slot-branch-${slot.id}`,
        level: 'error',
        message: `У слота ${slot.date} ${slot.time} не найден филиал.`,
      })
    }
  }

  const instructorsWithoutSlots = instructors.filter(
    (instructor) =>
      instructor.isActive &&
      slots.filter((slot) => slot.instructorId === instructor.id && slot.status === 'available').length === 0,
  )

  if (instructorsWithoutSlots.length > 0) {
    issues.push({
      id: 'instructors-no-slots',
      level: 'warning',
      message: `Есть инструкторы без свободных слотов: ${instructorsWithoutSlots
        .slice(0, 3)
        .map((item) => item.name)
        .join(', ')}.`,
    })
  }

  const branchesWithoutInstructors = branches.filter(
    (branch) => instructors.filter((instructor) => instructor.branchId === branch.id).length === 0,
  )

  if (branchesWithoutInstructors.length > 0) {
    issues.push({
      id: 'branches-no-instructors',
      level: 'warning',
      message: `Есть филиалы без инструкторов: ${branchesWithoutInstructors
        .slice(0, 3)
        .map((item) => item.name)
        .join(', ')}.`,
    })
  }

  return issues
}
