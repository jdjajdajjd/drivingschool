import { db } from './storage'

export function validateBranchBelongsToSchool(schoolId: string, branchId: string): string | null {
  const branch = db.branches.byId(branchId)
  if (!branch) return 'Филиал не найден.'
  return branch.schoolId === schoolId ? null : 'Филиал относится к другой автошколе.'
}

export function validateInstructorBelongsToSchool(schoolId: string, instructorId: string): string | null {
  const instructor = db.instructors.byId(instructorId)
  if (!instructor) return 'Инструктор не найден.'
  return instructor.schoolId === schoolId ? null : 'Инструктор относится к другой автошколе.'
}

export function validateStudentBelongsToSchool(schoolId: string, studentId: string): string | null {
  const student = db.students.byId(studentId)
  if (!student) return 'Ученик не найден.'
  return student.schoolId === schoolId ? null : 'Ученик относится к другой автошколе.'
}

export function validateSlotBelongsToSchool(schoolId: string, slotId: string): string | null {
  const slot = db.slots.byId(slotId)
  if (!slot) return 'Время не найдено.'
  return slot.schoolId === schoolId ? null : 'Время относится к другой автошколе.'
}
