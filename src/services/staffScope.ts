import type { Booking, Branch, Car, Document, GIBDDExam, Instructor, InternalExam, Payment, Slot, Student } from '../types'
import { canAccessBranch, getWorkspaceStaffContext, isBranchAdminContext } from './accessControl'
import { db } from './storage'

export function isBranchScoped(): boolean {
  return isBranchAdminContext()
}

export function getAllowedBranchIds(): string[] {
  return getWorkspaceStaffContext().branchIds
}

export function filterBranches<T extends Pick<Branch, 'id'>>(branches: T[]): T[] {
  if (!isBranchScoped()) return branches
  return branches.filter((branch) => canAccessBranch(branch.id))
}

export function filterInstructors<T extends Pick<Instructor, 'branchId'>>(instructors: T[]): T[] {
  if (!isBranchScoped()) return instructors
  return instructors.filter((instructor) => canAccessBranch(instructor.branchId))
}

export function filterSlots<T extends Pick<Slot, 'branchId'>>(slots: T[]): T[] {
  if (!isBranchScoped()) return slots
  return slots.filter((slot) => canAccessBranch(slot.branchId))
}

export function filterBookings<T extends Pick<Booking, 'branchId'>>(bookings: T[]): T[] {
  if (!isBranchScoped()) return bookings
  return bookings.filter((booking) => canAccessBranch(booking.branchId))
}

export function filterStudents<T extends Pick<Student, 'id' | 'assignedBranchId' | 'assignedInstructorId'>>(students: T[]): T[] {
  if (!isBranchScoped()) return students
  return students.filter((student) => {
    if (canAccessBranch(student.assignedBranchId)) return true
    const instructor = student.assignedInstructorId ? db.instructors.byId(student.assignedInstructorId) : null
    if (canAccessBranch(instructor?.branchId)) return true
    return db.bookings.all().some((booking) => booking.studentId === student.id && canAccessBranch(booking.branchId))
  })
}

export function filterCars<T extends Pick<Car, 'branchId'>>(cars: T[]): T[] {
  if (!isBranchScoped()) return cars
  return cars.filter((car) => canAccessBranch(car.branchId))
}

export function filterPayments<T extends Pick<Payment, 'studentId'>>(payments: T[]): T[] {
  if (!isBranchScoped()) return payments
  const visibleStudents = new Set(filterStudents(db.students.all()).map((student) => student.id))
  return payments.filter((payment) => visibleStudents.has(payment.studentId))
}

export function filterDocuments<T extends Pick<Document, 'studentId'>>(documents: T[]): T[] {
  if (!isBranchScoped()) return documents
  const visibleStudents = new Set(filterStudents(db.students.all()).map((student) => student.id))
  return documents.filter((document) => visibleStudents.has(document.studentId))
}

export function filterInternalExams<T extends Pick<InternalExam, 'studentId'>>(exams: T[]): T[] {
  if (!isBranchScoped()) return exams
  const visibleStudents = new Set(filterStudents(db.students.all()).map((student) => student.id))
  return exams.filter((exam) => visibleStudents.has(exam.studentId))
}

export function filterGIBDDExams<T extends Pick<GIBDDExam, 'studentId'>>(exams: T[]): T[] {
  if (!isBranchScoped()) return exams
  const visibleStudents = new Set(filterStudents(db.students.all()).map((student) => student.id))
  return exams.filter((exam) => visibleStudents.has(exam.studentId))
}
