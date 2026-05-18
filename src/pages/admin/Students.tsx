import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Archive, NavArrowRight as ChevronRight, Search, UserPlus } from 'iconoir-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { db } from '../../services/storage'
import { adminDocuments, adminPayments, createCurrentStaffAuditEntry, getDebtForStudent, studentProgress } from '../../services/adminStorage'
import { ADMIN_BASE_PATH } from '../../services/accessControl'
import { Modal } from '../../components/ui/Modal'
import type { Student, TrainingStage } from '../../types'
import { filterStudents } from '../../services/staffScope'
import { assertAdminPermission, canUseAdminPermission } from '../../services/adminAccess'
import { getSlotDateTime } from '../../services/bookingService'
import { createStudentAdminConfirmed, updateStudentAdminConfirmed } from '../../services/studentService'
import { normalizePersonName } from '../../lib/nameFormat'
import { formatRussianPhoneInput } from '../../lib/phoneFormat'

type FilterTab = 'all' | 'active' | 'problem' | 'debt' | 'no_docs' | 'no_instructor' | 'no_group' | 'ready_exam' | 'inactive'

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

export function AdminStudents() {
  const school = db.schools.currentAdmin()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterTab>(() => {
    if (typeof window === 'undefined') return 'all'
    return (localStorage.getItem('dd:admin_students_filter') as FilterTab | null) ?? 'all'
  })
  const [showAdd, setShowAdd] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkStage, setBulkStage] = useState<TrainingStage>('training_active')
  const [bulkInstructorId, setBulkInstructorId] = useState('')
  const [bulkGroupName, setBulkGroupName] = useState('')
  const [compactTable, setCompactTable] = useState(() => localStorage.getItem('dd:admin_students_compact') === 'true')
  const navigate = useNavigate()
  const canManageStudents = canUseAdminPermission('students.manage')

  const data = useMemo(() => {
    if (!school) return { rows: [], debtStudents: new Set<string>(), docs: {} as Record<string, number>, hours: {} as Record<string, number>, next: {} as Record<string, string>, last: {} as Record<string, string> }

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

    return { rows, debtStudents, docs, hours, next, last }
  }, [school?.id])

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
    localStorage.setItem('dd:admin_students_filter', value)
  }

  const problemCount = data.rows.filter((student) =>
    data.debtStudents.has(student.id) ||
    (data.docs[student.id] ?? 0) > 0 ||
    isIdleStudent(data.last[student.id], data.next[student.id]) ||
    ['no_bookings', 'frozen', 'refused'].includes(student.trainingStage ?? ''),
  ).length
  const instructors = school ? db.instructors.bySchool(school.id).filter((item) => item.isActive) : []
  const selectedStudents = data.rows.filter((student) => selectedIds.includes(student.id))
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
      localStorage.setItem('dd:admin_students_compact', String(!current))
      return !current
    })
  }

  const updateSelectedStudents = (patch: Partial<Student>, action: string) => {
    const access = assertAdminPermission('students.manage')
    if (!access.ok || !school || selectedStudents.length === 0) return
    selectedStudents.forEach((student) => {
      void updateStudentAdminConfirmed(student.id, patch)
    })
    createCurrentStaffAuditEntry(school.id, 'student_note', 'student', 'bulk', `${action}: ${selectedStudents.length}`)
    setSelectedIds([])
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
      <div className="v-admin-toolbar">
        <div>
          <h1 className="v-admin-heading">Ученики</h1>
          <p className="v-admin-note mt-1">{filtered.length} в списке</p>
        </div>
        <div className="ml-auto flex min-w-0 flex-wrap items-center gap-3">
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
          <button onClick={() => setShowAdd(true)} className="v-admin-button">
            <UserPlus width={16} height={16} />
            Добавить ученика
          </button>
        </div>
      </div>

      <div className="v-tab-row">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setFilterPersisted(tab.id)} className={`v-tab ${filter === tab.id ? 'v-tab-active' : ''}`}>
            {tab.label}
            {tab.count !== undefined ? <span className="ml-2 rounded-full bg-[#EEF2F5] px-2 py-0.5 text-[11px] text-[#59626D]">{tab.count}</span> : null}
          </button>
        ))}
        <div className="ml-auto flex shrink-0 items-center gap-2 py-2">
          {selectedIds.length > 0 ? <span className="rounded-full bg-[#111827] px-3 py-1 text-[11px] font-medium text-white">Выбрано {selectedIds.length}</span> : null}
          <button type="button" onClick={toggleCompactTable} className={`rounded-full px-3 py-1 text-[11px] font-medium ${compactTable ? 'bg-[#111827] text-white' : 'bg-[#F2F6FA] text-[#667381]'}`}>
            Плотно
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 md:p-5">
        {selectedIds.length > 0 ? (
          <div className="mb-3 rounded-[14px] border border-[#DCE2E8] bg-white p-3 shadow-[0_10px_24px_rgba(16,20,24,0.05)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <strong className="text-[14px] font-black text-[#111418]">Выбрано: {selectedIds.length}</strong>
              <button type="button" onClick={() => setSelectedIds([])} className="text-[12px] font-black text-[#66717D] hover:text-[#111418]">Снять</button>
            </div>
            <div className="grid gap-2 lg:grid-cols-[minmax(150px,1fr)_auto_minmax(160px,1fr)_auto_minmax(140px,1fr)_auto_auto] lg:items-center">
              <select value={bulkStage} onChange={(event) => setBulkStage(event.target.value as TrainingStage)} disabled={!canManageStudents} className="v-admin-input w-full">
                {Object.entries(STAGE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <button type="button" disabled={!canManageStudents} onClick={() => updateSelectedStudents({ trainingStage: bulkStage }, 'Изменен этап')} className="v-admin-button-secondary disabled:opacity-50">Применить</button>
              <select value={bulkInstructorId} onChange={(event) => setBulkInstructorId(event.target.value)} disabled={!canManageStudents} className="v-admin-input w-full">
                <option value="">Инструктор</option>
                {instructors.map((instructor) => <option key={instructor.id} value={instructor.id}>{instructor.name}</option>)}
              </select>
              <button type="button" disabled={!canManageStudents || !bulkInstructorId} onClick={() => updateSelectedStudents({ assignedInstructorId: bulkInstructorId }, 'Назначен инструктор')} className="v-admin-button-secondary disabled:opacity-50">Назначить</button>
              <input value={bulkGroupName} onChange={(event) => setBulkGroupName(event.target.value)} disabled={!canManageStudents} placeholder="Группа" className="v-admin-input w-full" />
              <button type="button" disabled={!canManageStudents || !bulkGroupName.trim()} onClick={() => updateSelectedStudents({ groupName: bulkGroupName.trim() }, 'Назначена группа')} className="v-admin-button-secondary disabled:opacity-50">Группа</button>
              <button type="button" disabled={!canManageStudents} onClick={() => updateSelectedStudents({ trainingStage: 'archived' }, 'Перенесены в архив')} className="v-admin-button-secondary disabled:opacity-50"><Archive width={15} height={15} /> Архив</button>
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
                  onClick={() => navigate(`${ADMIN_BASE_PATH}/students/${student.id}`)}
                  className="v-human-card w-full min-w-0 overflow-hidden p-3 text-left"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(student.id)}
                      onChange={(event) => { event.stopPropagation(); toggleSelected(student.id) }}
                      onClick={(event) => event.stopPropagation()}
                      className="mt-3 h-4 w-4 accent-[#0A84FF]"
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

          <div className="v-admin-panel v-admin-table-sticky v-admin-table-compact hidden overflow-hidden md:block">
            <div className="grid grid-cols-[40px_minmax(240px,1.2fr)_minmax(150px,.75fr)_minmax(160px,.8fr)_minmax(150px,.7fr)_minmax(130px,.55fr)_40px] items-center gap-14 border-b border-[rgba(15,23,42,0.07)] bg-[#F8FAFC] px-4 py-3 text-[11px] font-semibold uppercase text-[#98A2B3]">
              <span className="text-center"><input type="checkbox" checked={allVisibleSelected} onChange={toggleVisible} className="accent-[#0A84FF]" /></span>
              <span>Ученик</span>
              <span>Статус</span>
              <span>Ближайшее</span>
              <span>Деньги</span>
              <span>Практика</span>
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
                    <button key={student.id} className="grid w-full grid-cols-[40px_minmax(240px,1.2fr)_minmax(150px,.75fr)_minmax(160px,.8fr)_minmax(150px,.7fr)_minmax(130px,.55fr)_40px] items-center gap-4 border-b border-[rgba(15,23,42,0.06)] px-4 py-4 text-left transition last:border-b-0 hover:bg-[#F8FAFC]" onClick={() => navigate(`${ADMIN_BASE_PATH}/students/${student.id}`)}>
                      <span className="text-center" onClick={(event) => event.stopPropagation()}>
                        <input type="checkbox" checked={selectedIds.includes(student.id)} onChange={() => toggleSelected(student.id)} className="accent-[#0A84FF]" />
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
                        <span className="mt-1 block text-[12px] font-medium text-[#667085]">{missingDocs > 0 ? `${missingDocs} док. проверить` : 'документы готовы'}</span>
                      </span>
                      <span>
                        <span className="flex min-w-[110px] items-center gap-2">
                          <span className="h-2 w-20 overflow-hidden rounded-full bg-[#F2F4F7]">
                            <span className="block h-full rounded-full bg-[#0A84FF]" style={{ width: `${Math.min((hours / 56) * 100, 100)}%` }} />
                          </span>
                          <span className="font-semibold tabular-nums text-[#111827]">{hours}ч</span>
                        </span>
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
            navigate(`${ADMIN_BASE_PATH}/students/${studentId}`)
          }}
        />
      </Modal>
    </div>
  )
}

function StudentForm({ schoolId, onClose, onCreated }: { schoolId: string; onClose: () => void; onCreated: (studentId: string) => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [category, setCategory] = useState('B')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const submit = async () => {
    const access = assertAdminPermission('students.manage')
    if (!access.ok) { setError(access.error ?? 'Недостаточно прав.'); return }
    if (pending) return

    const normalizedPhone = phone.replace(/\D/g, '')
    const normalizedName = normalizePersonName(name)
    setError('')
    if (!normalizedName || normalizedPhone.length < 10) {
      setError('Проверьте ФИО и телефон.')
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
    const result = await createStudentAdminConfirmed(student)
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
        <span className="mb-1.5 block text-[13px] font-black text-[#38424D]">Категория</span>
        <select value={category} onChange={(event) => setCategory(event.target.value)} className="v-admin-input w-full">
          <option value="B">B</option>
          <option value="A">A</option>
          <option value="C">C</option>
          <option value="D">D</option>
        </select>
      </label>
      {error ? <p className="rounded-[10px] bg-[#EAF3FF] px-3 py-2 text-[13px] font-bold text-[#315A7C]">{error}</p> : null}
      <div className="flex gap-2 pt-2">
        <button onClick={onClose} disabled={pending} className="v-admin-button-secondary flex-1 disabled:opacity-50">Отмена</button>
        <button onClick={submit} disabled={pending} className="v-admin-button flex-1 disabled:opacity-50">{pending ? 'Сохраняем...' : 'Сохранить'}</button>
      </div>
    </div>
  )
}
