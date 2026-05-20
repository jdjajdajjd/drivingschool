import { isAfter } from 'date-fns'
import type { DocumentType, Student } from '../types'
import { adminDocuments, adminGIBDDExams, adminInternalExams, adminSettings, getDebtForStudent, studentProgress } from './adminStorage'
import { getSlotDateTime } from './bookingService'
import { db } from './storage'

export interface StudentLifecycleStep {
  id: string
  label: string
  done: boolean
  active: boolean
  problem?: boolean
}

export interface StudentLifecycleState {
  student: Student
  readiness: number
  currentStep: string
  nextAction: string
  blockers: string[]
  steps: StudentLifecycleStep[]
  debt: number
  completedLessons: number
  futureLessons: number
  missingDocuments: DocumentType[]
}

const DOC_LABELS: Record<DocumentType, string> = {
  contract: 'договор',
  passport: 'паспорт',
  medical_certificate: 'медсправка',
  consent_data_processing: 'согласие на данные',
  application: 'заявление',
  parent_consent: 'согласие родителя',
  snils: 'СНИЛС',
  state_fee_receipt: 'госпошлина',
  photo: 'фото',
  internal_certificate: 'свидетельство',
  gibdd_exam_doc: 'документ ГИБДД',
}

function isDocumentOk(studentId: string, type: DocumentType): boolean {
  const doc = adminDocuments.byType(studentId, type)
  if (!doc) return false
  return ['uploaded', 'verified', 'not_required'].includes(doc.status) && (!doc.expiresAt || new Date(`${doc.expiresAt}T23:59:59`) >= new Date())
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function getStudentLifecycleState(student: Student): StudentLifecycleState {
  const settings = adminSettings.get(student.schoolId)
  const bookings = db.bookings.bySchool(student.schoolId).filter((booking) => booking.studentId === student.id || booking.studentPhone === student.normalizedPhone)
  const now = new Date()
  const completedLessons = bookings.filter((booking) => booking.status === 'completed').length
  const futureLessons = bookings.filter((booking) => {
    const slot = db.slots.byId(booking.slotId)
    return booking.status === 'active' && slot !== null && isAfter(getSlotDateTime(slot), now)
  }).length
  const debt = getDebtForStudent(student.id)
  const progress = studentProgress.get(student.id)
  const drivingTotal = Math.max(progress?.drivingHoursTotal ?? 0, 0)
  const drivingDone = Math.max(progress?.drivingHoursCompleted ?? progress?.confirmedHours ?? 0, completedLessons)
  const fallbackDocuments: DocumentType[] = ['contract', 'passport', 'medical_certificate', 'consent_data_processing', 'application']
  const requiredDocuments: DocumentType[] = settings.requiredDocuments.length ? settings.requiredDocuments : fallbackDocuments
  const missingDocuments: DocumentType[] = requiredDocuments.filter((type) => !isDocumentOk(student.id, type))
  const internalExam = adminInternalExams.byStudent(student.id).find((exam) => exam.status === 'passed' || exam.result === 'passed')
  const gibddExam = adminGIBDDExams.byStudent(student.id).find((exam) => exam.status === 'passed' || exam.result === 'passed')
  const hasLead = true
  const hasTraining = Boolean(student.trainingStartDate || progress || completedLessons > 0)
  const hasPractice = completedLessons > 0 || drivingDone > 0
  const hasPaymentOk = debt <= 0
  const hasDocsOk = missingDocuments.length === 0
  const hasInternalExam = Boolean(internalExam || progress?.internalExamPassed)
  const hasGibdd = Boolean(gibddExam)
  const graduated = Boolean(student.trainingEndDate || student.trainingStage === 'completed' || student.trainingStage === 'training_completed' || hasGibdd)

  const blockers: string[] = []
  if (!student.assignedBranchId) blockers.push('не назначен филиал')
  if (!student.assignedInstructorId) blockers.push('не назначен инструктор')
  if (debt > 0) blockers.push(`долг ${debt.toLocaleString('ru-RU')} ₽`)
  if (missingDocuments.length) blockers.push(`не хватает: ${missingDocuments.map((type) => DOC_LABELS[type] ?? type).join(', ')}`)
  if (futureLessons === 0 && !graduated) blockers.push('нет будущей записи')
  if (drivingTotal > 0 && drivingDone < drivingTotal) blockers.push(`практика ${drivingDone}/${drivingTotal} ч`)
  if (hasPractice && !hasInternalExam && (drivingTotal === 0 || drivingDone >= drivingTotal)) blockers.push('не сдан внутренний экзамен')
  if (hasInternalExam && !hasGibdd) blockers.push('не закрыт экзамен ГИБДД')

  const stepSpecs = [
    { id: 'lead', label: 'Заявка', done: hasLead },
    { id: 'docs', label: 'Документы', done: hasDocsOk, problem: !hasDocsOk },
    { id: 'payments', label: 'Оплаты', done: hasPaymentOk, problem: !hasPaymentOk },
    { id: 'training', label: 'Теория', done: hasTraining || hasPractice },
    { id: 'practice', label: 'Практика', done: hasPractice && (drivingTotal === 0 || drivingDone >= drivingTotal) },
    { id: 'internal_exam', label: 'Внутренний', done: hasInternalExam },
    { id: 'gibdd', label: 'ГИБДД', done: hasGibdd },
    { id: 'graduation', label: 'Выпуск', done: graduated },
  ]
  const activeIndex = stepSpecs.findIndex((step) => !step.done || step.problem)
  const steps = stepSpecs.map((step, index) => ({ ...step, active: index === (activeIndex === -1 ? stepSpecs.length - 1 : activeIndex) }))

  const nextAction = (() => {
    if (!student.assignedBranchId || !student.assignedInstructorId) return 'Назначить филиал и инструктора'
    if (missingDocuments.length) return `Запросить ${DOC_LABELS[missingDocuments[0]] ?? 'документ'}`
    if (debt > 0) return 'Связаться по оплате'
    if (futureLessons === 0 && !graduated) return 'Поставить ближайшее занятие'
    if (drivingTotal > 0 && drivingDone < drivingTotal) return 'Довести практику до нормы'
    if (!hasInternalExam) return 'Назначить внутренний экзамен'
    if (!hasGibdd) return 'Записать на ГИБДД'
    if (!graduated) return 'Закрыть выпуск'
    return 'Путь закрыт'
  })()

  const readiness = clampPercent(
    (hasDocsOk ? 18 : 0) +
    (hasPaymentOk ? 16 : 0) +
    (student.assignedBranchId ? 8 : 0) +
    (student.assignedInstructorId ? 8 : 0) +
    (futureLessons > 0 || graduated ? 10 : 0) +
    (hasTraining ? 10 : 0) +
    (hasPractice ? 12 : 0) +
    (hasInternalExam ? 8 : 0) +
    (hasGibdd ? 6 : 0) +
    (graduated ? 4 : 0),
  )

  return {
    student,
    readiness,
    currentStep: steps.find((step) => step.active)?.label ?? 'Выпуск',
    nextAction,
    blockers,
    steps,
    debt,
    completedLessons,
    futureLessons,
    missingDocuments,
  }
}

export function getSchoolLifecycleStates(schoolId: string): StudentLifecycleState[] {
  return db.students.bySchool(schoolId).map(getStudentLifecycleState).sort((left, right) => left.readiness - right.readiness)
}
