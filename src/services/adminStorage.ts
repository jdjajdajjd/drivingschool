/**
 * Admin-level storage — extends the base `db` with admin-specific entities:
 * cars, payments, documents, exams, users, audit log, problem cases, settings.
 * Uses the same namespace as the base db.
 */
import type {
  Car, CarStatus,
  Payment, PaymentStatus, PaymentMethod,
  Document, DocumentStatus, DocumentType,
  InternalExam, GIBDDExam,
  User, UserRole,
  AuditLogEntry, AuditAction,
  ProblemCase, ProblemType,
  SchoolSettings,
  PricingPlan,
} from '../types'

const ADMIN_KEYS = {
  CARS: 'admin:cars',
  PAYMENTS: 'admin:payments',
  DOCUMENTS: 'admin:documents',
  INTERNAL_EXAMS: 'admin:internal_exams',
  GIBDD_EXAMS: 'admin:gibdd_exams',
  USERS: 'admin:users',
  AUDIT_LOG: 'admin:audit_log',
  PROBLEM_CASES: 'admin:problem_cases',
  SETTINGS: 'admin:settings',
  PROGRESS: 'admin:student_progress',
} as const

function getNS(): string {
  if (typeof window === 'undefined') return 'admin'
  return (window as Window & { __VROOM_DATA_NAMESPACE?: string }).__VROOM_DATA_NAMESPACE ?? 'demo'
}

function nsKey(key: string): string {
  return `${getNS()}:${key}`
}

function read<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(nsKey(key))
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch {
    return []
  }
}

function write<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(nsKey(key), JSON.stringify(data))
  } catch {
    // quota exceeded — ignore
  }
}

function upsert<T extends { id: string }>(key: string, item: T): T {
  const items = read<T>(key)
  const idx = items.findIndex((i) => i.id === item.id)
  if (idx >= 0) items[idx] = item
  else items.push(item)
  write(key, items)
  return item
}

function remove(key: string, id: string): void {
  write(key, read<{ id: string }>(key).filter((i) => i.id !== id))
}

// ─── Cars ────────────────────────────────────────────────────────────────────

export const adminCars = {
  all: (schoolId: string) => read<Car>(ADMIN_KEYS.CARS).filter((c) => c.schoolId === schoolId),
  byId: (id: string) => read<Car>(ADMIN_KEYS.CARS).find((c) => c.id === id) ?? null,
  byBranch: (branchId: string) => read<Car>(ADMIN_KEYS.CARS).filter((c) => c.branchId === branchId),
  byInstructor: (instructorId: string) => read<Car>(ADMIN_KEYS.CARS).filter((c) => c.instructorId === instructorId),
  active: (schoolId: string) => read<Car>(ADMIN_KEYS.CARS).filter((c) => c.schoolId === schoolId && c.status !== 'written_off'),
  upsert: (car: Car) => upsert(ADMIN_KEYS.CARS, car),
  remove: (id: string) => remove(ADMIN_KEYS.CARS, id),
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export const adminPayments = {
  all: (schoolId: string) => read<Payment>(ADMIN_KEYS.PAYMENTS).filter((p) => p.schoolId === schoolId),
  byId: (id: string) => read<Payment>(ADMIN_KEYS.PAYMENTS).find((p) => p.id === id) ?? null,
  byStudent: (studentId: string) => read<Payment>(ADMIN_KEYS.PAYMENTS).filter((p) => p.studentId === studentId),
  byStatus: (schoolId: string, status: PaymentStatus) =>
    read<Payment>(ADMIN_KEYS.PAYMENTS).filter((p) => p.schoolId === schoolId && p.status === status),
  overdue: (schoolId: string) =>
    read<Payment>(ADMIN_KEYS.PAYMENTS).filter((p) => p.schoolId === schoolId && p.status === 'overdue'),
  upsert: (payment: Payment) => upsert(ADMIN_KEYS.PAYMENTS, payment),
  remove: (id: string) => remove(ADMIN_KEYS.PAYMENTS, id),
}

// ─── Documents ─────────────────────────────────────────────────────────────────

export const adminDocuments = {
  all: (schoolId: string) => read<Document>(ADMIN_KEYS.DOCUMENTS).filter((d) => d.schoolId === schoolId),
  byId: (id: string) => read<Document>(ADMIN_KEYS.DOCUMENTS).find((d) => d.id === id) ?? null,
  byStudent: (studentId: string) => read<Document>(ADMIN_KEYS.DOCUMENTS).filter((d) => d.studentId === studentId),
  byType: (studentId: string, type: DocumentType) =>
    read<Document>(ADMIN_KEYS.DOCUMENTS).find((d) => d.studentId === studentId && d.type === type) ?? null,
  expiringSoon: (schoolId: string, days: number) => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() + days)
    return read<Document>(ADMIN_KEYS.DOCUMENTS).filter(
      (d) => d.schoolId === schoolId && d.expiresAt && new Date(d.expiresAt) <= cutoff && d.status !== 'expired',
    )
  },
  upsert: (doc: Document) => upsert(ADMIN_KEYS.DOCUMENTS, doc),
  remove: (id: string) => remove(ADMIN_KEYS.DOCUMENTS, id),
}

// ─── Exams ────────────────────────────────────────────────────────────────────

export const adminInternalExams = {
  all: (schoolId: string) => read<InternalExam>(ADMIN_KEYS.INTERNAL_EXAMS).filter((e) => e.schoolId === schoolId),
  byId: (id: string) => read<InternalExam>(ADMIN_KEYS.INTERNAL_EXAMS).find((e) => e.id === id) ?? null,
  byStudent: (studentId: string) => read<InternalExam>(ADMIN_KEYS.INTERNAL_EXAMS).filter((e) => e.studentId === studentId),
  upsert: (exam: InternalExam) => upsert(ADMIN_KEYS.INTERNAL_EXAMS, exam),
  remove: (id: string) => remove(ADMIN_KEYS.INTERNAL_EXAMS, id),
}

export const adminGIBDDExams = {
  all: (schoolId: string) => read<GIBDDExam>(ADMIN_KEYS.GIBDD_EXAMS).filter((e) => e.schoolId === schoolId),
  byId: (id: string) => read<GIBDDExam>(ADMIN_KEYS.GIBDD_EXAMS).find((e) => e.id === id) ?? null,
  byStudent: (studentId: string) => read<GIBDDExam>(ADMIN_KEYS.GIBDD_EXAMS).filter((e) => e.studentId === studentId),
  upsert: (exam: GIBDDExam) => upsert(ADMIN_KEYS.GIBDD_EXAMS, exam),
  remove: (id: string) => remove(ADMIN_KEYS.GIBDD_EXAMS, id),
}

// ─── Users ─────────────────────────────────────────────────────────────────────

export const adminUsers = {
  all: (schoolId: string) => read<User>(ADMIN_KEYS.USERS).filter((u) => u.schoolId === schoolId),
  byId: (id: string) => read<User>(ADMIN_KEYS.USERS).find((u) => u.id === id) ?? null,
  byRole: (schoolId: string, role: UserRole) =>
    read<User>(ADMIN_KEYS.USERS).filter((u) => u.schoolId === schoolId && u.role === role),
  upsert: (user: User) => upsert(ADMIN_KEYS.USERS, user),
  remove: (id: string) => remove(ADMIN_KEYS.USERS, id),
}

// ─── Audit Log ─────────────────────────────────────────────────────────────────

export const auditLog = {
  all: (schoolId: string, limit = 100) =>
    read<AuditLogEntry>(ADMIN_KEYS.AUDIT_LOG)
      .filter((e) => e.schoolId === schoolId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit),

  add: (entry: Omit<AuditLogEntry, 'id' | 'createdAt'>) => {
    const full: AuditLogEntry = {
      ...entry,
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    }
    const entries = read<AuditLogEntry>(ADMIN_KEYS.AUDIT_LOG)
    entries.unshift(full)
    // keep last 2000 entries
    write(ADMIN_KEYS.AUDIT_LOG, entries.slice(0, 2000))
    return full
  },
}

// ─── Problem Cases ─────────────────────────────────────────────────────────────

export const problemCases = {
  all: (schoolId: string) =>
    read<ProblemCase>(ADMIN_KEYS.PROBLEM_CASES)
      .filter((p) => p.schoolId === schoolId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),

  byId: (id: string) => read<ProblemCase>(ADMIN_KEYS.PROBLEM_CASES).find((p) => p.id === id) ?? null,
  open: (schoolId: string) =>
    read<ProblemCase>(ADMIN_KEYS.PROBLEM_CASES).filter((p) => p.schoolId === schoolId && p.status !== 'resolved'),

  upsert: (c: ProblemCase) => upsert(ADMIN_KEYS.PROBLEM_CASES, c),
  remove: (id: string) => remove(ADMIN_KEYS.PROBLEM_CASES, id),
}

// ─── Settings ─────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: Omit<SchoolSettings, 'schoolId'> = {
  defaultLessonDuration: 60,
  maxDaysAheadForBooking: 14,
  minHoursBeforeCancel: 4,
  maxActiveBookingsPerStudent: 3,
  allowBookingWithDebt: false,
  allowBookingWithoutMedical: false,
  allowBookingWithoutContract: false,
  requireManualModeration: false,
  allowChangeInstructor: true,
  allowStudentChooseInstructor: true,
  allowDifferentInstructors: true,
  maxLessonsPerDay: 2,
  maxLessonsPerWeek: 6,
  breakBetweenLessons: 15,
  workDays: [1, 2, 3, 4, 5],
  workStartHour: 8,
  workEndHour: 20,
  defaultPricingPlans: [],
  blockBookingOnDebt: true,
  debtGracePeriodDays: 7,
  notifyAdminOnNoShow: true,
  notifyAdminOnCancel: true,
  notifyAdminOnNewBooking: true,
  notifyAdminOnDebt: true,
  requiredDocuments: ['contract', 'passport', 'medical_certificate', 'consent_data_processing', 'application'],
  documentExpiryWarningDays: 14,
}

export const adminSettings = {
  get: (schoolId: string): SchoolSettings => {
    const stored = read<SchoolSettings & { schoolId: string }>(ADMIN_KEYS.SETTINGS)
      .find((s) => s.schoolId === schoolId)
    return stored ? { ...DEFAULT_SETTINGS, ...stored } : { schoolId, ...DEFAULT_SETTINGS }
  },
  save: (settings: SchoolSettings): void => {
    const all = read<SchoolSettings & { schoolId: string }>(ADMIN_KEYS.SETTINGS)
    const idx = all.findIndex((s) => s.schoolId === settings.schoolId)
    if (idx >= 0) all[idx] = settings
    else all.push(settings)
    write(ADMIN_KEYS.SETTINGS, all)
  },
}

// ─── Student Progress ───────────────────────────────────────────────────────────

export const studentProgress = {
  get: (studentId: string) =>
    read<import('../types').StudentProgress>(ADMIN_KEYS.PROGRESS).find((p) => p.studentId === studentId) ?? null,

  save: (progress: import('../types').StudentProgress): void => {
    const all = read<import('../types').StudentProgress>(ADMIN_KEYS.PROGRESS)
    const idx = all.findIndex((p) => p.studentId === progress.studentId)
    if (idx >= 0) all[idx] = progress
    else all.push(progress)
    write(ADMIN_KEYS.PROGRESS, all)
  },
}

// ─── Utility helpers ────────────────────────────────────────────────────────────

export function getDebtForStudent(studentId: string): number {
  const payments = adminPayments.byStudent(studentId)
  return payments.reduce((total, p) => {
    if (p.status === 'unpaid' || p.status === 'overdue' || p.status === 'partial') {
      return total + p.remainingAmount
    }
    return total
  }, 0)
}

export function getStudentsWithDebt(schoolId: string): string[] {
  const studentsWithDebt = new Set<string>()
  adminPayments.byStatus(schoolId, 'overdue').forEach((p) => studentsWithDebt.add(p.studentId))
  adminPayments.byStatus(schoolId, 'partial').forEach((p) => {
    if (p.remainingAmount > 0) studentsWithDebt.add(p.studentId)
  })
  return [...studentsWithDebt]
}

export function createAuditEntry(
  schoolId: string,
  userId: string,
  userName: string,
  action: AuditAction,
  entityType: string,
  entityId: string,
  description: string,
  oldValue?: string,
  newValue?: string,
): AuditLogEntry {
  return auditLog.add({
    schoolId,
    userId,
    userName,
    action,
    entityType,
    entityId,
    description,
    oldValue,
    newValue,
  })
}
