import { isAfter } from 'date-fns'
import type { IntegrityIssue } from '../types'
import { getSlotDateTime } from './bookingService'
import { formatDuration } from '../lib/utils'
import { db } from './storage'

function minutesFromTime(value: string): number {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

function slotsOverlap(left: { time: string; duration: number }, right: { time: string; duration: number }): boolean {
  const leftStart = minutesFromTime(left.time)
  const rightStart = minutesFromTime(right.time)
  return leftStart < rightStart + right.duration && rightStart < leftStart + left.duration
}

export function validateDataIntegrity(schoolId: string): IntegrityIssue[] {
  const issues: IntegrityIssue[] = []
  const bookings = db.bookings.bySchool(schoolId)
  const slots = db.slots.bySchool(schoolId)
  const instructors = db.instructors.bySchool(schoolId)
  const branches = db.branches.bySchool(schoolId)
  const students = db.students.bySchool(schoolId)
  const now = new Date()

  for (const booking of bookings) {
    const slot = db.slots.byId(booking.slotId)
    const instructor = db.instructors.byId(booking.instructorId)
    const branch = db.branches.byId(booking.branchId)
    const student = booking.studentId ? db.students.byId(booking.studentId) : null

    if (!slot) {
      issues.push({
        id: `booking-slot-${booking.id}`,
        level: 'error',
        message: `У записи ${booking.studentName} не найдено время.`,
      })
      continue
    }

    if (slot.schoolId !== schoolId) {
      issues.push({
        id: `booking-slot-school-${booking.id}`,
        level: 'error',
        message: `Запись ${booking.studentName} связана со временем другой школы.`,
      })
    }

    if (!instructor) {
      issues.push({
        id: `booking-inst-${booking.id}`,
        level: 'error',
        message: `У записи ${booking.studentName} не найден инструктор.`,
      })
    } else if (instructor.schoolId !== schoolId) {
      issues.push({
        id: `booking-inst-school-${booking.id}`,
        level: 'error',
        message: `Запись ${booking.studentName} связана с инструктором другой школы.`,
      })
    }

    if (!branch) {
      issues.push({
        id: `booking-branch-${booking.id}`,
        level: 'error',
        message: `У записи ${booking.studentName} не найден филиал.`,
      })
    } else if (branch.schoolId !== schoolId) {
      issues.push({
        id: `booking-branch-school-${booking.id}`,
        level: 'error',
        message: `Запись ${booking.studentName} связана с филиалом другой школы.`,
      })
    }

    if (booking.studentId && !student) {
      issues.push({
        id: `booking-student-${booking.id}`,
        level: 'warning',
        message: `У записи ${booking.studentName} потеряна ссылка на ученика.`,
      })
    } else if (student && student.schoolId !== schoolId) {
      issues.push({
        id: `booking-student-school-${booking.id}`,
        level: 'error',
        message: `Запись ${booking.studentName} связана с учеником другой школы.`,
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
    const instructor = db.instructors.byId(slot.instructorId)
    const branch = db.branches.byId(slot.branchId)

    if (!instructor) {
      issues.push({
        id: `slot-inst-${slot.id}`,
        level: 'error',
        message: `У времени ${slot.date} ${slot.time} не найден инструктор.`,
      })
    } else if (instructor.schoolId !== schoolId) {
      issues.push({
        id: `slot-inst-school-${slot.id}`,
        level: 'error',
        message: `Время ${slot.date} ${slot.time} связано с инструктором другой школы.`,
      })
    } else if (instructor.branchId !== slot.branchId) {
      issues.push({
        id: `slot-inst-branch-${slot.id}`,
        level: 'warning',
        message: `Время ${slot.date} ${slot.time} связано с филиалом, отличным от филиала инструктора.`,
      })
    }

    if (!branch) {
      issues.push({
        id: `slot-branch-${slot.id}`,
        level: 'error',
        message: `У времени ${slot.date} ${slot.time} не найден филиал.`,
      })
    } else if (branch.schoolId !== schoolId) {
      issues.push({
        id: `slot-branch-school-${slot.id}`,
        level: 'error',
        message: `Время ${slot.date} ${slot.time} связано с филиалом другой школы.`,
      })
    }
  }

  const activeSlots = slots
    .filter((slot) => slot.status !== 'cancelled')
    .sort((left, right) => `${left.instructorId}:${left.date}:${left.time}`.localeCompare(`${right.instructorId}:${right.date}:${right.time}`))
  for (let index = 0; index < activeSlots.length; index += 1) {
    const current = activeSlots[index]
    const conflict = activeSlots.slice(index + 1).find((slot) =>
      slot.instructorId === current.instructorId &&
      slot.date === current.date &&
      slotsOverlap(current, slot),
    )
    if (conflict) {
      const instructor = db.instructors.byId(current.instructorId)
      issues.push({
        id: `slot-overlap-${current.id}-${conflict.id}`,
        level: 'error',
        message: `Пересечение расписания: ${instructor?.name ?? 'инструктор'} ${current.date} ${current.time} (${formatDuration(current.duration)}) и ${conflict.time} (${formatDuration(conflict.duration)}).`,
      })
    }
  }

  for (const instructor of instructors) {
    const branch = db.branches.byId(instructor.branchId)
    if (branch && branch.schoolId !== schoolId) {
      issues.push({
        id: `instructor-branch-school-${instructor.id}`,
        level: 'error',
        message: `Инструктор ${instructor.name} привязан к филиалу другой школы.`,
      })
    }
  }

  for (const student of students) {
    const branch = student.assignedBranchId ? db.branches.byId(student.assignedBranchId) : null
    const instructor = student.assignedInstructorId ? db.instructors.byId(student.assignedInstructorId) : null

    if (branch && branch.schoolId !== schoolId) {
      issues.push({
        id: `student-branch-school-${student.id}`,
        level: 'error',
        message: `Ученик ${student.name} привязан к филиалу другой школы.`,
      })
    }

    if (instructor && instructor.schoolId !== schoolId) {
      issues.push({
        id: `student-instructor-school-${student.id}`,
        level: 'error',
        message: `Ученик ${student.name} привязан к инструктору другой школы.`,
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
      message: `Есть инструкторы без свободного времени: ${instructorsWithoutSlots
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
