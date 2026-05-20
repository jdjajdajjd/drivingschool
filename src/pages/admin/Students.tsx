import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Archive, Download, NavArrowRight as ChevronRight, Search, Upload, UserPlus } from 'iconoir-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { db } from '../../services/storage'
import { adminDocuments, adminPayments, createCurrentStaffAuditEntry, getDebtForStudent, studentProgress } from '../../services/adminStorage'
import { getAdminBasePathForLocation, getAccessSecret, getWorkspaceStaffContext } from '../../services/accessControl'
import { Modal } from '../../components/ui/Modal'
import type { Payment, Student, StudentProgress, StudentRequestStatus, TrainingStage } from '../../types'
import { filterStudents } from '../../services/staffScope'
import { assertAdminPermission, canUseAdminPermission } from '../../services/adminAccess'
import { getSlotDateTime, normalizePhone, validateRussianPhone } from '../../services/bookingService'
import { createStudentAdminConfirmed, updateStudentAdminConfirmed } from '../../services/studentService'
import { normalizePersonName } from '../../lib/nameFormat'
import { formatRussianPhoneInput } from '../../lib/phoneFormat'
import { getPreference, setPreference } from '../../services/preferenceStorage'
import { loadStudentRequests, refreshStudentRequestsFromSupabase, saveStudentProgressAdminConfirmed, studentRequestStatusLabels, updateStudentRequestStatusAdminConfirmed } from '../../services/studentProfile'

type FilterTab = 'all' | 'active' | 'problem' | 'debt' | 'no_docs' | 'no_instructor' | 'no_group' | 'ready_exam' | 'inactive'
type ImportSource = 'ai' | 'manual'

type ImportPreview = {
  fileName: string
  rows: Record<string, string>[]
  source: ImportSource
  mapping: Record<string, ImportField> | null
  headers: string[]
}

const STAGE_LABELS: Partial<Record<TrainingStage, string>> = {
  new_request: 'Новая заявка',
  awaiting_contract: 'Ждёт договор',
  contract_signed: 'Договор есть',
  theory: 'Теория',
  training_active: 'Обучается',
  practice_ground: 'Площадка',
  city: 'Город',
  exam_prep: 'Подготовка',
  no_bookings: 'Нет записей',
  has_debt: 'Есть долг',
  missing_documents: 'Нет документов',
  theory_completed: 'Теория сдана',
  practice_active: 'Практика',
  practice_completed: 'Практика готова',
  ready_for_internal_exam: 'К внутреннему',
  internal_exam_passed: 'Внутренний сдан',
  ready_for_gibdd: 'К ГИБДД',
  exam: 'Экзамен',
  training_completed: 'Завершил',
  completed: 'Завершил',
  archived: 'Архив',
  refused: 'Отказ',
  frozen: 'Пауза',
}

function stageTone(stage?: TrainingStage) {
  if (!stage) return 'v-tone-muted'
  if (stage === 'has_debt' || stage === 'missing_documents' || stage === 'refused') return 'v-tone-danger'
  if (stage === 'new_request' || stage === 'awaiting_contract' || stage === 'no_bookings' || stage === 'frozen') return 'v-tone-warning'
  if (stage === 'ready_for_internal_exam' || stage === 'ready_for_gibdd' || stage === 'exam') return 'v-tone-info'
  if (stage === 'training_completed' || stage === 'completed' || stage === 'archived') return 'v-tone-muted'
  return 'v-tone-ok'
}

function formatStudentDate(value: string): string {
  return format(new Date(value), 'dd.MM HH:mm', { locale: ru })
}

function isIdleStudent(lastLesson?: string, nextLesson?: string): boolean {
  if (nextLesson || !lastLesson) return false
  return Date.now() - new Date(lastLesson).getTime() > 14 * 24 * 60 * 60 * 1000
}

const IMPORT_HEADERS: Record<string, string> = {
  name: 'name',
  fio: 'name',
  фио: 'name',
  имя: 'name',
  phone: 'phone',
  телефон: 'phone',
  email: 'email',
  почта: 'email',
  category: 'category',
  категория: 'category',
  group: 'groupName',
  группа: 'groupName',
  instructor: 'instructorName',
  инструктор: 'instructorName',
  branch: 'branchName',
  филиал: 'branchName',
  stage: 'trainingStage',
  этап: 'trainingStage',
  debt: 'debt',
  долг: 'debt',
  остаток: 'debt',
  paid: 'paidAmount',
  оплачено: 'paidAmount',
  практика: 'confirmedHours',
  часы: 'confirmedHours',
  откатано: 'confirmedHours',
  подтверждено: 'confirmedHours',
  планчасов: 'drivingHoursTotal',
  купленочасов: 'drivingHoursTotal',
  всегочасов: 'drivingHoursTotal',
  темвсего: 'theoryTopicsTotal',
  темпройдено: 'theoryTopicsCompleted',
  теория: 'theoryTopicsCompleted',
  внутренний: 'internalExamPassed',
  notes: 'notes',
  комментарий: 'notes',
}

const IMPORT_FIELDS = ['name', 'phone', 'email', 'category', 'groupName', 'instructorName', 'branchName', 'trainingStage', 'debt', 'paidAmount', 'drivingHoursTotal', 'drivingHoursCompleted', 'confirmedHours', 'theoryTopicsTotal', 'theoryTopicsCompleted', 'internalExamPassed', 'notes', 'ignore'] as const
type ImportField = typeof IMPORT_FIELDS[number]

function splitCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = []
  let current = ''
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]
    if (char === '"' && quoted && next === '"') {
      current += '"'
      index += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === delimiter && !quoted) {
      cells.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  cells.push(current.trim())
  return cells
}

function parseStudentCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (lines.length < 2) return []
  const delimiter = (lines[0].match(/;/g)?.length ?? 0) >= (lines[0].match(/,/g)?.length ?? 0) ? ';' : ','
  const headers = splitCsvLine(lines[0], delimiter).map((header) => IMPORT_HEADERS[header.trim().toLowerCase()] ?? header.trim())
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line, delimiter)
    return headers.reduce<Record<string, string>>((row, header, index) => {
      row[header] = cells[index] ?? ''
      return row
    }, {})
  })
}

function normalizeHeader(header: string): string {
  const normalized = header.trim().toLowerCase().replace(/ё/g, 'е')
  return IMPORT_HEADERS[normalized] ?? IMPORT_HEADERS[normalized.replace(/\s+/g, '')] ?? header.trim()
}

function rowsToObjects(headers: string[], rows: string[][], mapping?: Record<string, ImportField>): Record<string, string>[] {
  return rows.map((cells) => headers.reduce<Record<string, string>>((row, header, index) => {
    const mapped = mapping?.[header] ?? normalizeHeader(header)
    if (mapped && mapped !== 'ignore') row[mapped] = cells[index] ?? ''
    return row
  }, {}))
}

function looksLikeImportHeader(value: string): boolean {
  const normalized = value.trim().toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, '')
  return Boolean(IMPORT_HEADERS[normalized] || IMPORT_HEADERS[value.trim().toLowerCase().replace(/ё/g, 'е')])
}

function normalizeImportMatrix(matrix: string[][]): { headers: string[]; rows: string[][] } {
  const rows = matrix
    .map((row) => row.map((cell) => String(cell ?? '').trim()))
    .filter((row) => row.some(Boolean))
  if (!rows.length) return { headers: [], rows: [] }

  let headerIndex = rows.findIndex((row) => row.filter(looksLikeImportHeader).length >= 2)
  if (headerIndex < 0) headerIndex = rows[0].filter(looksLikeImportHeader).length >= 1 ? 0 : -1
  const widest = Math.max(...rows.map((row) => row.length), 1)
  const sourceHeaders = headerIndex >= 0 ? rows[headerIndex] : Array.from({ length: widest }, (_, index) => `Колонка ${index + 1}`)
  const headers = Array.from({ length: widest }, (_, index) => sourceHeaders[index]?.trim() || `Колонка ${index + 1}`)
  const dataRows = rows.slice(headerIndex >= 0 ? headerIndex + 1 : 0).map((row) => headers.map((_, index) => row[index] ?? '')).filter((row) => row.some(Boolean))
  return { headers, rows: dataRows }
}

async function readStudentImportFile(file: File): Promise<{ headers: string[]; rows: string[][]; manualRows: Record<string, string>[] }> {
  const isExcel = /\.(xlsx|xls)$/i.test(file.name) || file.type.includes('spreadsheet') || file.type.includes('excel')
  if (isExcel) {
    const { readSheet } = await import('read-excel-file/browser')
    const sheetRows = await readSheet(file)
    const normalizedRows = sheetRows.map((row: unknown[]) => row.map((cell: unknown) => cell == null ? '' : String(cell).trim()))
    const { headers, rows } = normalizeImportMatrix(normalizedRows)
    return { headers, rows, manualRows: rowsToObjects(headers, rows) }
  }

  const text = await file.text()
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (lines.length < 2) return { headers: [], rows: [], manualRows: [] }
  const delimiter = (lines[0].match(/;/g)?.length ?? 0) >= (lines[0].match(/,/g)?.length ?? 0) ? ';' : ','
  const matrix = lines.map((line) => splitCsvLine(line, delimiter))
  const { headers, rows } = normalizeImportMatrix(matrix)
  return { headers, rows, manualRows: rowsToObjects(headers, rows) }
}

async function getAiImportMapping(headers: string[], rows: string[][]): Promise<Record<string, ImportField> | null> {
  const token = getAccessSecret('admin')
  const role = getWorkspaceStaffContext().role
  const response = await fetch('/api/import-map', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-vroom-staff-token': token,
      'x-vroom-staff-role': role,
    },
    body: JSON.stringify({ headers, sampleRows: rows.slice(0, 20) }),
  })
  if (!response.ok) return null
  const data = await response.json() as { mapping?: Record<string, string> }
  const mapping: Record<string, ImportField> = {}
  headers.forEach((header) => {
    const field = data.mapping?.[header]
    mapping[header] = IMPORT_FIELDS.includes(field as ImportField) ? field as ImportField : 'ignore'
  })
  return mapping
}

function parseMoney(value: string): number {
  const normalized = String(value ?? '').replace(/\s/g, '').replace(',', '.').replace(/[^0-9.-]/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0
}

function parseImportNumber(value: string): number {
  const normalized = String(value ?? '').replace(/\s/g, '').replace(',', '.').replace(/[^0-9.-]/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function parseImportBoolean(value: string): boolean {
  const source = String(value ?? '').trim().toLowerCase()
  return /^(1|да|yes|true|сдан|сдала|зачет|зачёт|passed)$/.test(source)
}

function hasPracticeImportData(row: Record<string, string>): boolean {
  return ['drivingHoursTotal', 'drivingHoursCompleted', 'confirmedHours', 'theoryTopicsTotal', 'theoryTopicsCompleted', 'internalExamPassed']
    .some((field) => String(row[field] ?? '').trim().length > 0)
}

function resolveStage(value: string): TrainingStage {
  const source = String(value ?? '').trim().toLowerCase()
  const byKey = Object.keys(STAGE_LABELS).find((key) => key.toLowerCase() === source)
  if (byKey) return byKey as TrainingStage
  const byLabel = Object.entries(STAGE_LABELS).find(([, label]) => label?.toLowerCase() === source)
  if (byLabel) return byLabel[0] as TrainingStage
  if (/долг/.test(source)) return 'has_debt'
  if (/док/.test(source)) return 'missing_documents'
  if (/экзамен|гибдд/.test(source)) return 'ready_for_gibdd'
  if (/практи|вожд|город|площад/.test(source)) return 'practice_active'
  if (/теор/.test(source)) return 'theory'
  if (/архив|заверш/.test(source)) return 'archived'
  return 'new_request'
}

function escapeCsvCell(value: string | number | undefined): string {
  const text = String(value ?? '')
  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function getImportPreviewStats(rows: Record<string, string>[], schoolId: string) {
  const existingPhones = new Set(db.students.bySchool(schoolId).map((student) => student.normalizedPhone).filter(Boolean))
  let created = 0
  let updated = 0
  let skipped = 0
  let debtRows = 0
  let practiceRows = 0
  let paidRows = 0
  const seenPhones = new Set<string>()
  const duplicatePhones = new Set<string>()
  const invalidRows: number[] = []

  rows.forEach((row, index) => {
    const name = normalizePersonName(row.name ?? '')
    const normalizedPhone = normalizePhone(row.phone ?? '')
    if (!name || !validateRussianPhone(normalizedPhone)) {
      skipped += 1
      invalidRows.push(index + 1)
      return
    }
    if (seenPhones.has(normalizedPhone)) {
      duplicatePhones.add(normalizedPhone)
      return
    }
    seenPhones.add(normalizedPhone)
    if (existingPhones.has(normalizedPhone)) updated += 1
    else created += 1
    if (parseMoney(row.debt ?? '') > 0) debtRows += 1
    if (parseMoney(row.paidAmount ?? '') > 0) paidRows += 1
    if (hasPracticeImportData(row)) practiceRows += 1
  })

  return { created, updated, skipped, debtRows, paidRows, practiceRows, total: rows.length, duplicateRows: duplicatePhones.size, invalidRows }
}

export function AdminStudents() {
  const school = db.schools.currentAdmin()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterTab>(() => {
    if (typeof window === 'undefined') return 'all'
    return (getPreference('dd:admin_students_filter') as FilterTab | null) ?? 'all'
  })
  const [showAdd, setShowAdd] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkStage, setBulkStage] = useState<TrainingStage>('training_active')
  const [bulkInstructorId, setBulkInstructorId] = useState('')
  const [bulkGroupName, setBulkGroupName] = useState('')
  const [importSummary, setImportSummary] = useState('')
  const [importing, setImporting] = useState(false)
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [bulkPending, setBulkPending] = useState(false)
  const [compactTable, setCompactTable] = useState(() => getPreference('dd:admin_students_compact') === 'true')
  const [requestVersion, setRequestVersion] = useState(0)
  const [requestPendingId, setRequestPendingId] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const navigate = useNavigate()
  const canManageStudents = canUseAdminPermission('students.manage')

  useEffect(() => {
    if (!school) return
    void refreshStudentRequestsFromSupabase(school.id).then(() => setRequestVersion((value) => value + 1)).catch(() => undefined)
  }, [school?.id])

  const data = useMemo(() => {
    if (!school) return { rows: [], debtStudents: new Set<string>(), docs: {} as Record<string, number>, hours: {} as Record<string, number>, next: {} as Record<string, string>, last: {} as Record<string, string>, requests: [] }

    const debtStudents = new Set<string>()
    adminPayments.all(school.id).forEach((payment) => {
      if ((payment.status === 'overdue' || payment.status === 'partial' || payment.status === 'unpaid') && payment.remainingAmount > 0) {
        debtStudents.add(payment.studentId)
      }
    })

    const docs: Record<string, number> = {}
    const hours: Record<string, number> = {}
    const next: Record<string, string> = {}
    const last: Record<string, string> = {}
    const now = new Date()
    const rows = filterStudents(db.students.bySchool(school.id)).map((student) => {
      docs[student.id] = adminDocuments.byStudent(student.id).filter((doc) => doc.status === 'missing' || doc.status === 'rejected').length
      hours[student.id] = studentProgress.get(student.id)?.confirmedHours ?? 0
      const dates = db.bookings.bySchool(school.id)
        .filter((booking) => booking.studentId === student.id && booking.status !== 'cancelled')
        .map((booking) => db.slots.byId(booking.slotId))
        .filter((slot): slot is NonNullable<typeof slot> => Boolean(slot))
        .map((slot) => getSlotDateTime(slot))
        .sort((left, right) => left.getTime() - right.getTime())
      next[student.id] = dates.find((date) => date > now)?.toISOString() ?? ''
      const pastDates = dates.filter((date) => date <= now)
      last[student.id] = pastDates[pastDates.length - 1]?.toISOString() ?? ''
      return student
    })

    return { rows, debtStudents, docs, hours, next, last, requests: loadStudentRequests(school.id) }
  }, [school?.id, requestVersion])

  const openRequests = data.requests.filter((request) => request.status === 'new' || request.status === 'reviewing')

  const patchStudentRequest = async (requestId: string, status: StudentRequestStatus) => {
    if (!school || requestPendingId) return
    setRequestPendingId(requestId)
    const result = await updateStudentRequestStatusAdminConfirmed(school.id, requestId, status)
    setRequestPendingId('')
    if (!result.ok) {
      setImportSummary(result.error ?? 'Не удалось сохранить статус запроса.')
      return
    }
    setRequestVersion((value) => value + 1)
    createCurrentStaffAuditEntry(school.id, 'student_note', 'student', requestId, `Запрос ученика: ${studentRequestStatusLabels[status]}`)
  }

  const filtered = useMemo(() => {
    let result = data.rows
    const query = search.trim().toLowerCase()
    if (query) {
      result = result.filter((student) =>
        student.name.toLowerCase().includes(query) ||
        student.phone.includes(query) ||
        student.email.toLowerCase().includes(query),
      )
    }

    if (filter === 'active') {
      result = result.filter((student) =>
        ['training_active', 'practice_active', 'practice_ground', 'city', 'theory'].includes(student.trainingStage ?? '') &&
        !data.debtStudents.has(student.id),
      )
    }
    if (filter === 'problem') {
      result = result.filter((student) =>
        data.debtStudents.has(student.id) ||
        (data.docs[student.id] ?? 0) > 0 ||
        isIdleStudent(data.last[student.id], data.next[student.id]) ||
        ['no_bookings', 'frozen', 'refused'].includes(student.trainingStage ?? ''),
      )
    }
    if (filter === 'debt') result = result.filter((student) => data.debtStudents.has(student.id))
    if (filter === 'no_docs') result = result.filter((student) => (data.docs[student.id] ?? 0) > 0)
    if (filter === 'no_instructor') result = result.filter((student) => !student.assignedInstructorId)
    if (filter === 'no_group') result = result.filter((student) => !student.groupName)
    if (filter === 'ready_exam') result = result.filter((student) => student.trainingStage === 'ready_for_gibdd' || student.trainingStage === 'ready_for_internal_exam')
    if (filter === 'inactive') result = result.filter((student) => ['no_bookings', 'archived', 'frozen', 'refused'].includes(student.trainingStage ?? ''))
    return result
  }, [data, search, filter])

  const setFilterPersisted = (value: FilterTab) => {
    setFilter(value)
    setPreference('dd:admin_students_filter', value)
  }

  const problemCount = data.rows.filter((student) =>
    data.debtStudents.has(student.id) ||
    (data.docs[student.id] ?? 0) > 0 ||
    isIdleStudent(data.last[student.id], data.next[student.id]) ||
    ['no_bookings', 'frozen', 'refused'].includes(student.trainingStage ?? ''),
  ).length
  const studentStats = [
    {
      label: 'Активные',
      value: data.rows.filter((student) => ['training_active', 'practice_active', 'practice_ground', 'city', 'theory'].includes(student.trainingStage ?? '')).length,
      caption: 'в обучении',
      filter: 'active' as FilterTab,
      tone: 'ok',
    },
    { label: 'Проблемы', value: problemCount, caption: 'нужно внимание', filter: 'problem' as FilterTab, tone: problemCount ? 'danger' : 'ok' },
    { label: 'Долги', value: data.debtStudents.size, caption: 'по оплатам', filter: 'debt' as FilterTab, tone: data.debtStudents.size ? 'danger' : 'ok' },
    { label: 'Документы', value: data.rows.filter((student) => (data.docs[student.id] ?? 0) > 0).length, caption: 'проверить', filter: 'no_docs' as FilterTab, tone: 'warning' },
  ]
  const instructors = school ? db.instructors.bySchool(school.id).filter((item) => item.isActive) : []
  const selectedStudents = data.rows.filter((student) => selectedIds.includes(student.id))
  const selectedBulkInstructor = instructors.find((instructor) => instructor.id === bulkInstructorId) ?? null
  const visibleIds = filtered.map((student) => student.id)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id))

  const toggleSelected = (studentId: string) => {
    setSelectedIds((current) => current.includes(studentId) ? current.filter((id) => id !== studentId) : [...current, studentId])
  }

  const toggleVisible = () => {
    setSelectedIds((current) => {
      if (allVisibleSelected) return current.filter((id) => !visibleIds.includes(id))
      return Array.from(new Set([...current, ...visibleIds]))
    })
  }

  const toggleCompactTable = () => {
    setCompactTable((current) => {
      setPreference('dd:admin_students_compact', String(!current))
      return !current
    })
  }

  const updateSelectedStudents = async (patch: Partial<Student>, action: string) => {
    const access = assertAdminPermission('students.manage')
    if (!access.ok || !school || selectedStudents.length === 0 || bulkPending) return
    setBulkPending(true)
    let updated = 0
    let failed = 0
    for (const student of selectedStudents) {
      const result = await updateStudentAdminConfirmed(student.id, patch)
      if (result.ok) updated += 1
      else failed += 1
    }
    setBulkPending(false)
    createCurrentStaffAuditEntry(school.id, 'student_note', 'student', 'bulk', `${action}: ${updated}`)
    setSelectedIds([])
    setImportSummary(failed ? `${action}: обновлено ${updated}, не сохранено ${failed}.` : `${action}: обновлено ${updated}.`)
  }

  const exportStudentsCsv = () => {
    const header = ['ФИО', 'Телефон', 'Email', 'Категория', 'Группа', 'Этап', 'Инструктор', 'Ближайшее', 'Долг']
    const rows = filtered.map((student) => {
      const instructor = db.instructors.byId(student.assignedInstructorId ?? '')
      const debt = getDebtForStudent(student.id)
      return [
        student.name,
        student.phone,
        student.email,
        student.categoryCodes?.join(', ') ?? '',
        student.groupName ?? '',
        STAGE_LABELS[student.trainingStage ?? 'new_request'] ?? student.trainingStage ?? '',
        instructor?.name ?? '',
        data.next[student.id] ? formatStudentDate(data.next[student.id]) : '',
        debt > 0 ? debt : 0,
      ]
    })
    const csv = [header, ...rows].map((row) => row.map(escapeCsvCell).join(';')).join('\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `vroom-students-${school?.slug ?? 'school'}-${format(new Date(), 'yyyy-MM-dd')}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    setImportSummary(`Экспортировано ${rows.length} учеников.`)
  }

  const applyStudentImportRows = async (rows: Record<string, string>[], source: ImportSource) => {
    if (!school) return
    let created = 0
    let updated = 0
    let skipped = 0
    let paymentsCreated = 0
    let progressUpdated = 0
    const activeInstructors = db.instructors.bySchool(school.id)
    const branches = db.branches.bySchool(school.id)
    const seenPhones = new Set<string>()

    for (const row of rows) {
      const name = normalizePersonName(row.name ?? '')
      const normalizedPhone = normalizePhone(row.phone ?? '')
      if (!name || !validateRussianPhone(normalizedPhone)) {
        skipped += 1
        continue
      }
      if (seenPhones.has(normalizedPhone)) {
        skipped += 1
        continue
      }
      seenPhones.add(normalizedPhone)

      const category = (row.category ?? '').split(/[,. ]+/).map((item) => item.trim().toUpperCase()).filter(Boolean)
      const instructor = activeInstructors.find((item) => item.name.toLowerCase() === (row.instructorName ?? '').trim().toLowerCase())
      const branch = branches.find((item) => item.name.toLowerCase() === (row.branchName ?? '').trim().toLowerCase())
      const stage = resolveStage(row.trainingStage ?? '')
      const debt = parseMoney(row.debt ?? '')
      const paidAmount = parseMoney(row.paidAmount ?? '')
      const duplicate = db.students.bySchool(school.id).find((student) => student.normalizedPhone === normalizedPhone)
      let studentId = duplicate?.id ?? `stu_${Date.now()}_${created}_${updated}_${skipped}`

      if (duplicate) {
        const result = await updateStudentAdminConfirmed(duplicate.id, {
          name,
          phone: row.phone?.trim() || duplicate.phone,
          normalizedPhone,
          email: row.email?.trim() ?? duplicate.email,
          categoryCodes: category.length ? category : duplicate.categoryCodes,
          groupName: row.groupName?.trim() || duplicate.groupName,
          assignedInstructorId: instructor?.id ?? duplicate.assignedInstructorId,
          assignedBranchId: branch?.id ?? duplicate.assignedBranchId,
          trainingStage: debt > 0 ? 'has_debt' : stage,
          notes: row.notes?.trim() || duplicate.notes,
        })
        if (result.ok) {
          updated += 1
          studentId = result.student?.id ?? duplicate.id
        } else {
          skipped += 1
          continue
        }
      } else {
        const student: Student = {
          id: studentId,
          schoolId: school.id,
          name,
          phone: row.phone?.trim() || normalizedPhone,
          normalizedPhone,
          email: row.email?.trim() ?? '',
          categoryCodes: category.length ? category : ['B'],
          groupName: row.groupName?.trim() || undefined,
          assignedInstructorId: instructor?.id,
          assignedBranchId: branch?.id,
          trainingStage: debt > 0 ? 'has_debt' : stage,
          notes: row.notes?.trim() || undefined,
          createdAt: new Date().toISOString(),
        }
        const result = await createStudentAdminConfirmed(student)
        if (result.ok) {
          created += 1
          studentId = result.student?.id ?? student.id
        } else {
          skipped += 1
          continue
        }
      }

      if (debt > 0) {
        const payment: Payment = {
          id: `pay_import_${Date.now()}_${paymentsCreated}`,
          schoolId: school.id,
          studentId,
          amount: debt,
          paidAmount: 0,
          remainingAmount: debt,
          status: 'unpaid',
          description: 'Остаток по импорту',
          createdAt: new Date().toISOString(),
        }
        try {
          await adminPayments.upsertConfirmed(payment)
          paymentsCreated += 1
        } catch {
          // Student import should not fail because a debt row could not be saved.
        }
      }

      if (paidAmount > 0) {
        const payment: Payment = {
          id: `pay_import_paid_${Date.now()}_${paymentsCreated}`,
          schoolId: school.id,
          studentId,
          amount: paidAmount,
          paidAmount,
          remainingAmount: 0,
          status: 'paid',
          method: 'transfer',
          description: 'Оплата по импорту',
          paidAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        }
        try {
          await adminPayments.upsertConfirmed(payment)
          paymentsCreated += 1
        } catch {
          // Student import should not fail because a payment row could not be saved.
        }
      }

      if (hasPracticeImportData(row)) {
        const current = studentProgress.get(studentId)
        const confirmed = parseImportNumber(row.confirmedHours ?? '') || parseImportNumber(row.drivingHoursCompleted ?? '') || current?.confirmedHours || 0
        const completed = parseImportNumber(row.drivingHoursCompleted ?? '') || confirmed || current?.drivingHoursCompleted || 0
        const total = parseImportNumber(row.drivingHoursTotal ?? '') || current?.drivingHoursTotal || Math.max(56, confirmed, completed)
        const theoryDone = parseImportNumber(row.theoryTopicsCompleted ?? '') || current?.theoryTopicsCompleted || 0
        const theoryTotal = parseImportNumber(row.theoryTopicsTotal ?? '') || current?.theoryTopicsTotal || Math.max(theoryDone, 0)
        const progress: StudentProgress = {
          id: current?.id ?? `progress_${studentId}`,
          schoolId: school.id,
          studentId,
          theoryTopicsTotal: theoryTotal,
          theoryTopicsCompleted: Math.min(theoryDone, theoryTotal || theoryDone),
          drivingHoursTotal: total,
          drivingHoursCompleted: completed,
          confirmedHours: confirmed,
          internalExamPassed: parseImportBoolean(row.internalExamPassed ?? '') || current?.internalExamPassed || false,
          internalExamDate: current?.internalExamDate ?? null,
          internalExamStatus: parseImportBoolean(row.internalExamPassed ?? '') ? 'passed' : current?.internalExamStatus ?? 'not_scheduled',
          gaidExamDate: current?.gaidExamDate ?? null,
          gibddExamStatus: current?.gibddExamStatus ?? 'not_scheduled',
          notes: current?.notes ?? '',
          updatedAt: new Date().toISOString(),
        }
        const result = await saveStudentProgressAdminConfirmed(progress)
        if (result.ok) {
          studentProgress.save(progress)
          progressUpdated += 1
        }
      }
    }

    createCurrentStaffAuditEntry(school.id, 'student_note', 'student', 'import', `Импорт учеников (${source}): +${created}, обновлено ${updated}, пропущено ${skipped}, оплат ${paymentsCreated}, практики ${progressUpdated}`)
    setImportSummary(`Импорт завершён: добавлено ${created}, обновлено ${updated}, пропущено ${skipped}, оплат создано ${paymentsCreated}, практику обновили ${progressUpdated}.`)
  }

  const importStudentsCsv = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !school) return
    const access = assertAdminPermission('students.manage')
    if (!access.ok) {
      setImportSummary(access.error ?? 'Недостаточно прав для импорта.')
      return
    }

    setImporting(true)
    setImportSummary('')
    try {
      const parsed = await readStudentImportFile(file)
      if (!parsed.rows.length) {
        setImportSummary('В файле не нашлось строк для импорта.')
        return
      }
      const aiMapping = await getAiImportMapping(parsed.headers, parsed.rows).catch(() => null)
      const rows = aiMapping ? rowsToObjects(parsed.headers, parsed.rows, aiMapping) : parsed.manualRows.length ? parsed.manualRows : parseStudentCsv(await file.text())
      setImportPreview({ fileName: file.name, rows, source: aiMapping ? 'ai' : 'manual', mapping: aiMapping, headers: parsed.headers })
      setImportSummary('Проверьте предпросмотр импорта перед сохранением.')
    } catch (error) {
      setImportSummary(error instanceof Error ? error.message : 'Не удалось импортировать файл.')
    } finally {
      setImporting(false)
    }
  }

  const confirmImportPreview = async () => {
    if (!school || !importPreview || importing) return
    setImporting(true)
    try {
      await applyStudentImportRows(importPreview.rows, importPreview.source)
      if (importPreview.mapping) {
        const used = Object.entries(importPreview.mapping).filter(([, field]) => field !== 'ignore').map(([header, field]) => `${header} → ${field}`).join(', ')
        setImportSummary((current) => `${current} Нейронка сопоставила колонки: ${used || 'ничего не выбрано'}.`)
      }
      setImportPreview(null)
    } catch (error) {
      setImportSummary(error instanceof Error ? error.message : 'Не удалось сохранить импорт.')
    } finally {
      setImporting(false)
    }
  }

  const tabs: { id: FilterTab; label: string; count?: number }[] = [
    { id: 'all', label: 'Все', count: data.rows.length },
    { id: 'active', label: 'Активные' },
    { id: 'problem', label: 'Проблемные', count: problemCount || undefined },
    { id: 'debt', label: 'С долгом', count: data.debtStudents.size || undefined },
    { id: 'no_docs', label: 'Без документов' },
    { id: 'no_instructor', label: 'Без инструктора' },
    { id: 'no_group', label: 'Без группы' },
    { id: 'ready_exam', label: 'К экзамену' },
    { id: 'inactive', label: 'Неактивные' },
  ]

  if (!school) return null

  return (
    <div className="flex h-full flex-col">
      <div className="v-admin-toolbar v-action-toolbar">
        <div>
          <h1 className="v-admin-heading">Ученики</h1>
          <p className="v-admin-note mt-1">{filtered.length} в списке</p>
        </div>
        <div className="v-toolbar-actions v-students-actions ml-auto flex min-w-0 flex-wrap items-center gap-3">
          <label className="relative min-w-[220px] flex-1 sm:w-[320px] sm:flex-none">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8D98A4]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Имя, телефон, email"
              className="v-admin-input w-full pl-9 pr-9"
            />
            {search ? (
              <button type="button" onClick={() => setSearch('')} className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-[#8D98A4] hover:bg-[#EEF2F5] hover:text-[#111418]">×</button>
            ) : null}
          </label>
          <button onClick={() => setShowAdd(true)} className="v-admin-button v-toolbar-primary-action">
            <UserPlus width={16} height={16} />
            Добавить ученика
          </button>
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" className="hidden" onChange={(event) => void importStudentsCsv(event)} />
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={!canManageStudents || importing || bulkPending} className="v-admin-button-secondary disabled:opacity-50">
            <Upload width={16} height={16} />
            {importing ? 'Импорт...' : bulkPending ? 'Сохраняем...' : 'Умный импорт'}
          </button>
          <button type="button" onClick={exportStudentsCsv} className="v-admin-button-secondary">
            <Download width={16} height={16} />
            Экспорт
          </button>
        </div>
      </div>

      <div className="v-tab-row v-tab-row-wrap">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setFilterPersisted(tab.id)} className={`v-tab ${filter === tab.id ? 'v-tab-active' : ''}`}>
            {tab.label}
            {tab.count !== undefined ? <span className="ml-2 rounded-full bg-[#EEF2F5] px-2 py-0.5 text-[11px] text-[#59626D]">{tab.count}</span> : null}
          </button>
        ))}
        <div className="v-tab-tools ml-auto flex shrink-0 items-center gap-2 py-2">
          {selectedIds.length > 0 ? <span className="rounded-full bg-[#111827] px-3 py-1 text-[11px] font-medium text-white">Выбрано {selectedIds.length}</span> : null}
          <button type="button" onClick={toggleCompactTable} className={`rounded-full px-3 py-1 text-[11px] font-medium ${compactTable ? 'bg-[#111827] text-white' : 'bg-[#F2F6FA] text-[#667381]'}`}>
            Плотно
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 md:p-5">
        <div className="mb-3 hidden gap-3 rounded-[18px] border border-[#D7E2EC] bg-white p-4 shadow-[0_10px_24px_rgba(16,20,24,0.04)] md:grid lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-[14px] font-black text-[#111827]">Умный импорт для таблиц автошкол</p>
            <p className="mt-1 text-[13px] font-semibold leading-5 text-[#667085]">
              Загружайте CSV/XLS/XLSX даже с лишними строками сверху: vroom найдет шапку, нейронка сопоставит колонки, долги сразу попадут в оплаты.
            </p>
          </div>
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={!canManageStudents || importing} className="v-admin-button-secondary justify-center disabled:opacity-50">
            <Upload width={16} height={16} />
            {importing ? 'Разбираем файл...' : 'Загрузить таблицу'}
          </button>
        </div>
        {importSummary ? (
          <div className="mb-3 rounded-[14px] border border-[#D7E2EC] bg-[#F8FBFE] px-4 py-3 text-[13px] font-semibold text-[#38424D] shadow-[0_10px_24px_rgba(16,20,24,0.04)]">
            {importSummary}
          </div>
        ) : null}
        {openRequests.length > 0 ? (
          <section className="mb-3 rounded-[18px] border border-[#D7E2EC] bg-white p-3 shadow-[0_10px_24px_rgba(16,20,24,0.04)]">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[14px] font-black text-[#111827]">Запросы учеников</p>
                <p className="mt-0.5 text-[12px] font-semibold text-[#667085]">Переносы и отмены, которые нельзя потерять администратору.</p>
              </div>
              <span className="v-admin-pill v-tone-warning">{openRequests.length} ждут ответа</span>
            </div>
            <div className="grid gap-2 xl:grid-cols-2">
              {openRequests.slice(0, 4).map((request) => {
                const student = db.students.byId(request.studentId)
                return (
                  <div key={request.id} className="rounded-[14px] border border-[#E4E7EC] bg-[#FBFCFE] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-black text-[#111827]">{request.type === 'reschedule' ? 'Перенос занятия' : 'Отмена занятия'} · {student?.name ?? 'ученик'}</p>
                        <p className="mt-1 text-[12px] font-semibold leading-5 text-[#667085]">{request.reason || request.comment || 'Без причины'}{request.preferredTime ? ` · хочет: ${request.preferredTime}` : ''}</p>
                      </div>
                      <span className={`v-admin-pill ${request.status === 'reviewing' ? 'v-tone-info' : 'v-tone-warning'}`}>{studentRequestStatusLabels[request.status]}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <button type="button" disabled={requestPendingId === request.id} onClick={() => void patchStudentRequest(request.id, 'reviewing')} className="min-h-10 rounded-[10px] border border-[#D7E2EC] bg-white text-[12px] font-black text-[#344054] disabled:opacity-50">В работу</button>
                      <button type="button" disabled={requestPendingId === request.id} onClick={() => void patchStudentRequest(request.id, 'resolved')} className="min-h-10 rounded-[10px] bg-[#111827] text-[12px] font-black text-white disabled:opacity-50">Решено</button>
                      <button type="button" disabled={requestPendingId === request.id} onClick={() => void patchStudentRequest(request.id, 'rejected')} className="min-h-10 rounded-[10px] border border-[#FAD1D1] bg-[#FFF7F7] text-[12px] font-black text-[#B42318] disabled:opacity-50">Отклонить</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ) : null}
        <section className="v-students-summary mb-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {studentStats.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => setFilterPersisted(item.filter)}
              className={`v-student-stat is-${item.tone} ${filter === item.filter ? 'is-active' : ''}`}
            >
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-semibold text-[#667085]">{item.label}</span>
                <strong className="mt-1 block text-[28px] font-semibold leading-none text-[#111827] tabular-nums">{item.value}</strong>
              </span>
              <span className="truncate text-right text-[12px] font-medium text-[#667085]">{item.caption}</span>
            </button>
          ))}
        </section>

        {selectedIds.length > 0 ? (
          <div className="mb-3 rounded-[14px] border border-[#DCE2E8] bg-white p-3 shadow-[0_10px_24px_rgba(16,20,24,0.05)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <strong className="text-[14px] font-black text-[#111418]">Выбрано: {selectedIds.length}</strong>
              <button type="button" onClick={() => setSelectedIds([])} className="text-[12px] font-black text-[#66717D] hover:text-[#111418]">Снять</button>
            </div>
            <div className="grid gap-2 lg:grid-cols-[minmax(150px,1fr)_auto_minmax(160px,1fr)_auto_minmax(140px,1fr)_auto_auto] lg:items-center">
              <select value={bulkStage} onChange={(event) => setBulkStage(event.target.value as TrainingStage)} disabled={!canManageStudents || bulkPending} className="v-admin-input w-full">
                {Object.entries(STAGE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <button type="button" disabled={!canManageStudents || bulkPending} onClick={() => void updateSelectedStudents({ trainingStage: bulkStage }, 'Изменен этап')} className="v-admin-button-secondary disabled:opacity-50">Применить</button>
              <select value={bulkInstructorId} onChange={(event) => setBulkInstructorId(event.target.value)} disabled={!canManageStudents || bulkPending} className="v-admin-input w-full">
                <option value="">Инструктор</option>
                {instructors.map((instructor) => <option key={instructor.id} value={instructor.id}>{instructor.name}</option>)}
              </select>
              <button type="button" disabled={!canManageStudents || bulkPending || !bulkInstructorId} onClick={() => void updateSelectedStudents({ assignedInstructorId: bulkInstructorId, assignedBranchId: selectedBulkInstructor?.branchId }, 'Назначен инструктор')} className="v-admin-button-secondary disabled:opacity-50">Назначить</button>
              <input value={bulkGroupName} onChange={(event) => setBulkGroupName(event.target.value)} disabled={!canManageStudents || bulkPending} placeholder="Группа" className="v-admin-input w-full" />
              <button type="button" disabled={!canManageStudents || bulkPending || !bulkGroupName.trim()} onClick={() => void updateSelectedStudents({ groupName: bulkGroupName.trim() }, 'Назначена группа')} className="v-admin-button-secondary disabled:opacity-50">Группа</button>
              <button type="button" disabled={!canManageStudents || bulkPending} onClick={() => void updateSelectedStudents({ trainingStage: 'archived' }, 'Перенесены в архив')} className="v-admin-button-secondary disabled:opacity-50"><Archive width={15} height={15} /> Архив</button>
            </div>
          </div>
        ) : null}
        {filtered.length === 0 ? (
          <div className="v-admin-empty">
            <strong>Ученики не найдены</strong>
            <span>Сбросьте поиск или выберите другой фильтр.</span>
          </div>
        ) : (
          <>
          <div className="grid gap-3 md:hidden">
            {filtered.map((student) => {
              const debt = getDebtForStudent(student.id)
              const missingDocs = data.docs[student.id] ?? 0
              const hours = data.hours[student.id] ?? 0
              const instructor = db.instructors.byId(student.assignedInstructorId ?? '')
              const initials = student.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
              const stage = student.trainingStage
              return (
                <button
                  key={student.id}
                  onClick={() => navigate(`${getAdminBasePathForLocation()}/students/${student.id}`)}
                  className="v-human-card w-full min-w-0 overflow-hidden p-3 text-left"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(student.id)}
                      onChange={(event) => { event.stopPropagation(); toggleSelected(student.id) }}
                      onClick={(event) => event.stopPropagation()}
                      className="mt-2 h-5 w-5 shrink-0 accent-[#0A84FF]"
                    />
                    <span className="v-person-avatar shrink-0">{initials}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-[#111827]">{student.name}</span>
                      <span className="mt-0.5 block truncate text-[12px] font-medium text-[#667085]">{student.phone}</span>
                    </span>
                    <span className={`v-admin-pill max-w-[118px] shrink-0 truncate ${stageTone(stage)}`}>{STAGE_LABELS[stage ?? 'new_request'] ?? 'Новый'}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <span className="rounded-[16px] bg-[#F8FAFC] p-2 text-center">
                      <strong className="block text-[16px] font-semibold text-[#111827]">{hours}ч</strong>
                      <span className="text-[11px] font-medium text-[#667085]">практика</span>
                    </span>
                    <span className="rounded-[16px] bg-[#F8FAFC] p-2 text-center">
                      <strong className={`block text-[16px] font-semibold ${debt > 0 ? 'text-[#C92820]' : 'text-[#1F8F3F]'}`}>{debt > 0 ? debt.toLocaleString('ru-RU') : 'нет'}</strong>
                      <span className="text-[11px] font-medium text-[#667085]">долг</span>
                    </span>
                    <span className="rounded-[16px] bg-[#F8FAFC] p-2 text-center">
                      <strong className={`block text-[16px] font-semibold ${missingDocs > 0 ? 'text-[#315A7C]' : 'text-[#1F8F3F]'}`}>{missingDocs || 'ок'}</strong>
                      <span className="text-[11px] font-medium text-[#667085]">доки</span>
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-[12px] font-medium text-[#667085]">
                    {instructor ? <span className="truncate">{instructor.name}</span> : <span className="v-admin-pill v-tone-warning">нет инструктора</span>}
                    <ChevronRight className="shrink-0 text-[#98A2B3]" width={17} height={17} />
                  </div>
                </button>
              )
            })}
          </div>

          <div className="v-admin-panel v-students-list hidden overflow-hidden md:block">
            <div className="v-students-list-head grid grid-cols-[40px_minmax(280px,1.35fr)_minmax(150px,.7fr)_minmax(210px,.95fr)_minmax(180px,.8fr)_40px] items-center gap-4 px-4 py-3 text-[11px] font-semibold uppercase text-[#98A2B3]">
              <span className="text-center"><input type="checkbox" checked={allVisibleSelected} onChange={toggleVisible} className="h-5 w-5 accent-[#0A84FF]" /></span>
              <span>Ученик</span>
              <span>Статус</span>
              <span>Ближайшее</span>
              <span>Деньги</span>
              <span />
            </div>
            <div>
                {filtered.map((student) => {
                  const debt = getDebtForStudent(student.id)
                  const missingDocs = data.docs[student.id] ?? 0
                  const hours = data.hours[student.id] ?? 0
                  const instructor = db.instructors.byId(student.assignedInstructorId ?? '')
                  const initials = student.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
                  const stage = student.trainingStage

                  return (
                    <button key={student.id} className="v-student-row grid w-full grid-cols-[40px_minmax(280px,1.35fr)_minmax(150px,.7fr)_minmax(210px,.95fr)_minmax(180px,.8fr)_40px] items-center gap-4 px-4 py-4 text-left transition" onClick={() => navigate(`${getAdminBasePathForLocation()}/students/${student.id}`)}>
                      <span className="text-center" onClick={(event) => event.stopPropagation()}>
                        <input type="checkbox" checked={selectedIds.includes(student.id)} onChange={() => toggleSelected(student.id)} className="h-5 w-5 accent-[#0A84FF]" />
                      </span>
                      <span>
                        <div className="flex items-center gap-3">
                          <span className="v-person-avatar shrink-0">{initials}</span>
                          <span className="min-w-0">
                            <span className="block truncate text-[15px] font-semibold text-[#111827]">{student.name}</span>
                            <span className="mt-0.5 block truncate text-[12px] font-medium text-[#667085]">
                              {student.categoryCodes?.length ? `Категория ${student.categoryCodes.join(', ')}` : 'Категория не выбрана'}
                            </span>
                          </span>
                        </div>
                      </span>
                      <span><span className={`v-admin-pill ${stageTone(stage)}`}>{STAGE_LABELS[stage ?? 'new_request'] ?? 'Новый'}</span></span>
                      <span>
                        <span className="block truncate text-[13px] font-semibold text-[#111827]">{data.next[student.id] ? formatStudentDate(data.next[student.id]) : 'нет записи'}</span>
                        <span className="mt-1 block truncate text-[12px] font-medium text-[#667085]">{instructor?.name ?? 'инструктор не назначен'}</span>
                      </span>
                      <span>
                        {debt > 0 ? <span className="v-admin-pill v-tone-danger">{debt.toLocaleString('ru-RU')} ₽</span> : <span className="v-admin-pill v-tone-ok">баланс ок</span>}
                        <span className="mt-1 block text-[12px] font-medium text-[#667085]">{missingDocs > 0 ? `${missingDocs} док. проверить` : `${hours}ч практики · документы готовы`}</span>
                      </span>
                      <ChevronRight className="justify-self-end text-[#98A2B3]" width={18} height={18} />
                    </button>
                  )
                })}
            </div>
          </div>
          </>
        )}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Добавить ученика" size="md">
        <StudentForm
          schoolId={school.id}
          onClose={() => setShowAdd(false)}
          onCreated={(studentId) => {
            setShowAdd(false)
            navigate(`${getAdminBasePathForLocation()}/students/${studentId}`)
          }}
        />
      </Modal>

      <Modal open={Boolean(importPreview)} onClose={() => !importing && setImportPreview(null)} title="Проверка импорта" size="lg">
        {importPreview ? (
          <ImportPreviewModal
            schoolId={school.id}
            preview={importPreview}
            pending={importing}
            onCancel={() => setImportPreview(null)}
            onConfirm={() => void confirmImportPreview()}
          />
        ) : null}
      </Modal>
    </div>
  )
}

function ImportPreviewModal({ schoolId, preview, pending, onCancel, onConfirm }: { schoolId: string; preview: ImportPreview; pending: boolean; onCancel: () => void; onConfirm: () => void }) {
  const stats = getImportPreviewStats(preview.rows, schoolId)
  const sample = preview.rows.slice(0, 6)
  const mappingRows = preview.mapping ? Object.entries(preview.mapping).filter(([, field]) => field !== 'ignore') : []

  return (
    <div className="p-5">
      <div className="rounded-[18px] border border-[#D7E2EC] bg-[#F8FBFE] p-4">
        <p className="text-[12px] font-black uppercase tracking-[0.08em] text-[#667085]">{preview.fileName}</p>
        <h3 className="mt-2 text-[20px] font-black text-[#111827]">Перед сохранением проверьте, что попадёт в базу</h3>
        <p className="mt-2 text-[13px] font-semibold leading-5 text-[#667085]">
          {preview.source === 'ai' ? 'Колонки сопоставлены нейронкой. Если цифры выглядят странно, отмените импорт и поправьте файл.' : 'Использовано локальное сопоставление колонок без нейронки.'}
        </p>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ['Создать', stats.created, 'text-[#188447]'],
          ['Обновить', stats.updated, 'text-[#075EBC]'],
          ['Пропустить', stats.skipped, 'text-[#C92820]'],
          ['Долги', stats.debtRows, 'text-[#8A5A00]'],
          ['Оплаты', stats.paidRows, 'text-[#188447]'],
          ['Практика', stats.practiceRows, 'text-[#075EBC]'],
        ].map(([label, value, color]) => (
          <div key={label} className="rounded-[16px] border border-[#E5EAF1] bg-white p-3">
            <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#667085]">{label}</p>
            <p className={`mt-1 text-[24px] font-black tabular-nums ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {(stats.duplicateRows > 0 || stats.invalidRows.length > 0) ? (
        <div className="mt-4 rounded-[16px] border border-[#FFD6A3] bg-[#FFF8EC] p-4">
          <p className="text-[13px] font-black text-[#8A5A00]">Нужно проверить перед сохранением</p>
          <p className="mt-1 text-[13px] font-semibold leading-5 text-[#8A5A00]">
            {stats.duplicateRows > 0 ? `Повторы телефонов в файле: ${stats.duplicateRows}. Повторные строки не будут сохранены. ` : ''}
            {stats.invalidRows.length > 0 ? `Строки без имени или телефона: ${stats.invalidRows.slice(0, 8).join(', ')}${stats.invalidRows.length > 8 ? '...' : ''}.` : ''}
          </p>
        </div>
      ) : null}

      {mappingRows.length ? (
        <div className="mt-4 rounded-[16px] border border-[#E5EAF1] bg-white p-4">
          <p className="text-[13px] font-black text-[#111827]">Как распознаны колонки</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {mappingRows.map(([header, field]) => <span key={header} className="rounded-full bg-[#F2F6FA] px-3 py-1 text-[12px] font-bold text-[#38424D]">{header} → {field}</span>)}
          </div>
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto rounded-[16px] border border-[#E5EAF1] bg-white">
        <div className="grid min-w-[760px] grid-cols-[minmax(170px,1fr)_120px_90px_90px_90px_110px] gap-3 border-b border-[#E5EAF1] bg-[#F8FAFC] px-4 py-3 text-[11px] font-black uppercase tracking-[0.08em] text-[#667085]">
          <span>Ученик</span><span>Телефон</span><span>Группа</span><span>Долг</span><span>Оплата</span><span>Практика</span>
        </div>
        {sample.map((row, index) => {
          const normalizedPhone = normalizePhone(row.phone ?? '')
          const valid = Boolean(normalizePersonName(row.name ?? '') && validateRussianPhone(normalizedPhone))
          return (
            <div key={`${row.name}-${index}`} className="grid min-w-[760px] grid-cols-[minmax(170px,1fr)_120px_90px_90px_90px_110px] gap-3 border-b border-[#EEF2F5] px-4 py-3 text-[13px] font-semibold last:border-b-0">
              <span className={valid ? 'text-[#111827]' : 'text-[#C92820]'}>{row.name || 'без имени'}</span>
              <span className="truncate text-[#667085]">{row.phone || '—'}</span>
              <span className="truncate text-[#667085]">{row.groupName || '—'}</span>
              <span className={parseMoney(row.debt ?? '') > 0 ? 'text-[#C92820]' : 'text-[#667085]'}>{parseMoney(row.debt ?? '') || '—'}</span>
              <span className={parseMoney(row.paidAmount ?? '') > 0 ? 'text-[#188447]' : 'text-[#667085]'}>{parseMoney(row.paidAmount ?? '') || '—'}</span>
              <span className={hasPracticeImportData(row) ? 'text-[#075EBC]' : 'text-[#667085]'}>{parseImportNumber(row.confirmedHours ?? '') || parseImportNumber(row.drivingHoursCompleted ?? '') || '—'}</span>
            </div>
          )
        })}
      </div>

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row">
        <button type="button" onClick={onCancel} disabled={pending} className="v-admin-button-secondary flex-1 disabled:opacity-50">Отмена</button>
        <button type="button" onClick={onConfirm} disabled={pending || stats.created + stats.updated === 0} className="v-admin-button flex-1 disabled:opacity-50">
          {pending ? 'Сохраняем...' : `Сохранить ${stats.created + stats.updated} строк`}
        </button>
      </div>
    </div>
  )
}

function StudentForm({ schoolId, onClose, onCreated }: { schoolId: string; onClose: () => void; onCreated: (studentId: string) => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [category, setCategory] = useState('B')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const submit = async () => {
    const access = assertAdminPermission('students.manage')
    if (!access.ok) { setError(access.error ?? 'Недостаточно прав.'); return }
    if (pending) return

    const normalizedPhone = normalizePhone(phone)
    const normalizedName = normalizePersonName(name)
    setError('')
    if (!normalizedName || !validateRussianPhone(normalizedPhone)) {
      setError('Проверьте ФИО и телефон.')
      return
    }
    if (password.trim() && password.trim().length < 6) {
      setError('Пароль ученика должен быть не короче 6 символов.')
      return
    }
    const duplicate = db.students.bySchool(schoolId).find((student) => student.normalizedPhone === normalizedPhone)
    if (duplicate) {
      setError('Ученик с таким телефоном уже есть.')
      return
    }
    const student: Student = {
      id: `stu_${Date.now()}`,
      schoolId,
      name: normalizedName,
      phone: phone.trim(),
      normalizedPhone,
      email: email.trim(),
      categoryCodes: category ? [category] : [],
      trainingStage: 'new_request',
      createdAt: new Date().toISOString(),
    }
    setPending(true)
    const result = await createStudentAdminConfirmed(student, { password: password.trim() || undefined })
    setPending(false)
    if (!result.ok) {
      setError(result.error ?? 'Не удалось сохранить ученика.')
      return
    }
    createCurrentStaffAuditEntry(schoolId, 'student_created', 'student', student.id, `Добавлен ученик ${student.name}`)
    onCreated(result.student?.id ?? student.id)
  }

  return (
    <div className="space-y-4 p-5">
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-black text-[#38424D]">ФИО</span>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Иванова Анна" className="v-admin-input w-full" autoFocus />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-black text-[#38424D]">Телефон</span>
        <input value={phone} onChange={(event) => setPhone(event.target.value)} onBlur={() => setPhone((value) => formatRussianPhoneInput(value))} placeholder="+7 999 123-45-67" className="v-admin-input w-full" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-black text-[#38424D]">Email</span>
        <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="student@mail.ru" className="v-admin-input w-full" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-black text-[#38424D]">Пароль для входа ученика</span>
        <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Можно оставить пустым и выдать позже" className="v-admin-input w-full" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-black text-[#38424D]">Категория</span>
        <select value={category} onChange={(event) => setCategory(event.target.value)} className="v-admin-input w-full">
          <option value="B">B</option>
          <option value="A">A</option>
          <option value="C">C</option>
          <option value="D">D</option>
        </select>
      </label>
      {error ? <p className="rounded-[10px] bg-[#EAF3FF] px-3 py-2 text-[13px] font-bold text-[#315A7C]">{error}</p> : null}
      <div className="v-modal-actions">
        <button onClick={onClose} disabled={pending} className="v-admin-button-secondary flex-1 disabled:opacity-50">Отмена</button>
        <button onClick={submit} disabled={pending} className="v-admin-button flex-1 disabled:opacity-50">{pending ? 'Сохраняем...' : 'Сохранить'}</button>
      </div>
    </div>
  )
}
