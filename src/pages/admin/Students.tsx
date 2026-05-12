import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, UserPlus } from 'lucide-react'
import { db } from '../../services/storage'
import { adminDocuments, adminPayments, getDebtForStudent, studentProgress } from '../../services/adminStorage'
import { ADMIN_BASE_PATH } from '../../services/accessControl'
import type { TrainingStage } from '../../types'

type FilterTab = 'all' | 'active' | 'debt' | 'no_docs' | 'ready_exam' | 'inactive'

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

export function AdminStudents() {
  const school = db.schools.all()[0]
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterTab>('all')
  const navigate = useNavigate()

  const data = useMemo(() => {
    if (!school) return { rows: [], debtStudents: new Set<string>(), docs: {} as Record<string, number>, hours: {} as Record<string, number> }

    const debtStudents = new Set<string>()
    adminPayments.all(school.id).forEach((payment) => {
      if ((payment.status === 'overdue' || payment.status === 'partial' || payment.status === 'unpaid') && payment.remainingAmount > 0) {
        debtStudents.add(payment.studentId)
      }
    })

    const docs: Record<string, number> = {}
    const hours: Record<string, number> = {}
    const rows = db.students.bySchool(school.id).map((student) => {
      docs[student.id] = adminDocuments.byStudent(student.id).filter((doc) => doc.status === 'missing' || doc.status === 'rejected').length
      hours[student.id] = studentProgress.get(student.id)?.confirmedHours ?? 0
      return student
    })

    return { rows, debtStudents, docs, hours }
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
    if (filter === 'debt') result = result.filter((student) => data.debtStudents.has(student.id))
    if (filter === 'no_docs') result = result.filter((student) => (data.docs[student.id] ?? 0) > 0)
    if (filter === 'ready_exam') result = result.filter((student) => student.trainingStage === 'ready_for_gibdd' || student.trainingStage === 'ready_for_internal_exam')
    if (filter === 'inactive') result = result.filter((student) => ['no_bookings', 'archived', 'frozen', 'refused'].includes(student.trainingStage ?? ''))
    return result
  }, [data, search, filter])

  const tabs: { id: FilterTab; label: string; count?: number }[] = [
    { id: 'all', label: 'Все', count: data.rows.length },
    { id: 'active', label: 'Активные' },
    { id: 'debt', label: 'С долгом', count: data.debtStudents.size || undefined },
    { id: 'no_docs', label: 'Без документов' },
    { id: 'ready_exam', label: 'К экзамену' },
    { id: 'inactive', label: 'Неактивные' },
  ]

  if (!school) return null

  return (
    <div className="flex h-full flex-col">
      <div className="v-admin-toolbar">
        <div>
          <h1 className="v-admin-heading">Ученики</h1>
          <p className="v-admin-note mt-1">{filtered.length} в списке · долги и документы видны сразу</p>
        </div>
        <div className="ml-auto flex min-w-0 flex-wrap items-center gap-3">
          <label className="relative min-w-[220px] flex-1 sm:w-[320px] sm:flex-none">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8D98A4]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Имя, телефон, email"
              className="v-admin-input w-full pl-9"
            />
          </label>
          <button className="v-admin-button">
            <UserPlus size={16} />
            Добавить ученика
          </button>
        </div>
      </div>

      <div className="v-tab-row">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setFilter(tab.id)} className={`v-tab ${filter === tab.id ? 'v-tab-active' : ''}`}>
            {tab.label}
            {tab.count !== undefined ? <span className="ml-2 rounded-full bg-[#EEF2F5] px-2 py-0.5 text-[11px] text-[#59626D]">{tab.count}</span> : null}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-3 md:p-5">
        {filtered.length === 0 ? (
          <div className="v-admin-empty">
            <strong>Ученики не найдены</strong>
            <span>Сбросьте поиск или выберите другой фильтр.</span>
          </div>
        ) : (
          <div className="v-admin-panel overflow-hidden">
            <table className="v-admin-table min-w-[960px]">
              <thead>
                <tr>
                  <th>Ученик</th>
                  <th>Телефон</th>
                  <th>Этап</th>
                  <th>Практика</th>
                  <th>Долг</th>
                  <th>Документы</th>
                  <th>Инструктор</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((student) => {
                  const debt = getDebtForStudent(student.id)
                  const missingDocs = data.docs[student.id] ?? 0
                  const hours = data.hours[student.id] ?? 0
                  const instructor = db.instructors.byId(student.assignedInstructorId ?? '')
                  const initials = student.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
                  const stage = student.trainingStage

                  return (
                    <tr key={student.id} className="cursor-pointer" onClick={() => navigate(`${ADMIN_BASE_PATH}/students/${student.id}`)}>
                      <td>
                        <div className="flex items-center gap-3">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-[#101418] text-[13px] font-black text-white">{initials}</span>
                          <span className="min-w-0">
                            <span className="block truncate text-[15px] font-black text-[#111418]">{student.name}</span>
                            <span className="mt-0.5 block text-[12px] font-bold text-[#66717D]">
                              {student.categoryCodes?.length ? `Категория ${student.categoryCodes.join(', ')}` : 'Категория не выбрана'}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td>
                        <a href={`tel:${student.phone}`} onClick={(event) => event.stopPropagation()} className="font-black text-[#26313C] hover:text-[#000]">
                          {student.phone}
                        </a>
                      </td>
                      <td><span className={`v-admin-pill ${stageTone(stage)}`}>{STAGE_LABELS[stage ?? 'new_request'] ?? 'Новый'}</span></td>
                      <td>
                        <div className="flex min-w-[110px] items-center gap-2">
                          <span className="h-2 w-20 overflow-hidden rounded-full bg-[#EEF2F5]">
                            <span className="block h-full rounded-full bg-[#2457C5]" style={{ width: `${Math.min((hours / 56) * 100, 100)}%` }} />
                          </span>
                          <span className="font-black tabular-nums text-[#26313C]">{hours}ч</span>
                        </div>
                      </td>
                      <td>
                        {debt > 0 ? <span className="v-admin-pill v-tone-danger">{debt.toLocaleString('ru-RU')} ₽</span> : <span className="v-admin-pill v-tone-ok">нет</span>}
                      </td>
                      <td>
                        {missingDocs > 0 ? <span className="v-admin-pill v-tone-warning">{missingDocs} не хватает</span> : <span className="v-admin-pill v-tone-ok">готово</span>}
                      </td>
                      <td>{instructor?.name ?? <span className="text-[#8D98A4]">не назначен</span>}</td>
                      <td className="text-right text-[#8D98A4]">Открыть</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
