import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../../services/storage'
import { adminPayments, adminDocuments, studentProgress, getDebtForStudent } from '../../services/adminStorage'
import { ADMIN_BASE_PATH } from '../../services/accessControl'
import type { Student, TrainingStage } from '../../types'
import { motion, AnimatePresence } from 'framer-motion'

type FilterTab = 'all' | 'active' | 'debt' | 'no_docs' | 'ready_exam' | 'inactive'

const STAGE_LABELS: Record<TrainingStage, string> = {
  new_request: 'Новая заявка',
  awaiting_contract: 'Ожидает договора',
  contract_signed: 'Договор подписан',
  training_active: 'Обучение идёт',
  no_bookings: 'Нет записей',
  has_debt: 'Есть долг',
  missing_documents: 'Не хватает док-в',
  theory_completed: 'Теория завершена',
  practice_active: 'Практика идёт',
  practice_completed: 'Практика завершена',
  ready_for_internal_exam: 'Готов к внутр. экзамену',
  internal_exam_passed: 'Внутр. экзамен сдан',
  ready_for_gibdd: 'Готов к ГИБДД',
  training_completed: 'Обучение завершено',
  archived: 'Архив',
  refused: 'Отказ',
  frozen: 'Заморозка',
}

const STAGE_COLORS: Record<string, string> = {
  new_request: 'bg-amber-50 text-amber-600',
  awaiting_contract: 'bg-amber-50 text-amber-600',
  contract_signed: 'bg-blue-50 text-blue-600',
  training_active: 'bg-green-50 text-green-600',
  no_bookings: 'bg-gray-100 text-gray-500',
  has_debt: 'bg-red-50 text-red-500',
  missing_documents: 'bg-orange-50 text-orange-600',
  theory_completed: 'bg-blue-50 text-blue-600',
  practice_active: 'bg-green-50 text-green-600',
  practice_completed: 'bg-green-50 text-green-600',
  ready_for_internal_exam: 'bg-purple-50 text-purple-600',
  internal_exam_passed: 'bg-purple-50 text-purple-600',
  ready_for_gibdd: 'bg-purple-50 text-purple-700',
  training_completed: 'bg-gray-100 text-gray-600',
  archived: 'bg-gray-100 text-gray-400',
  refused: 'bg-red-50 text-red-400',
  frozen: 'bg-blue-50 text-blue-400',
}

export function AdminStudents() {
  const school = db.schools.all()[0]
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterTab>('all')
  const navigate = useNavigate()

  const data = useMemo(() => {
    if (!school) return { students: [], debtStudents: new Set<string>(), docs: {}, hours: {} }
    const students = db.students.bySchool(school.id)
    const debtStudents = new Set<string>()
    adminPayments.byStatus(school.id, 'overdue').forEach((p) => debtStudents.add(p.studentId))

    const docs: Record<string, number> = {}
    const hours: Record<string, number> = {}
    students.forEach((s) => {
      const docList = adminDocuments.byStudent(s.id)
      docs[s.id] = docList.filter((d) => d.status === 'missing' || d.status === 'rejected').length
      const progress = studentProgress.get(s.id)
      hours[s.id] = progress?.confirmedHours ?? 0
    })

    return { students, debtStudents, docs, hours }
  }, [school?.id])

  const filtered = useMemo(() => {
    let result = data.students

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        s.email.toLowerCase().includes(q)
      )
    }

    // Filter tab
    switch (filter) {
      case 'active':
        result = result.filter((s) =>
          (s.trainingStage === 'training_active' || s.trainingStage === 'practice_active') &&
          !data.debtStudents.has(s.id)
        )
        break
      case 'debt':
        result = result.filter((s) => data.debtStudents.has(s.id))
        break
      case 'no_docs':
        result = result.filter((s) => (data.docs[s.id] ?? 0) > 0)
        break
      case 'ready_exam':
        result = result.filter((s) =>
          s.trainingStage === 'ready_for_gibdd' ||
          s.trainingStage === 'ready_for_internal_exam'
        )
        break
      case 'inactive':
        result = result.filter((s) =>
          s.trainingStage === 'no_bookings' ||
          s.trainingStage === 'archived' ||
          s.trainingStage === 'frozen'
        )
        break
    }

    return result
  }, [data, search, filter])

  const tabs: { id: FilterTab; label: string; count?: number }[] = [
    { id: 'all', label: 'Все' },
    { id: 'active', label: 'Активные' },
    { id: 'debt', label: 'С долгом', count: data.debtStudents.size || undefined },
    { id: 'no_docs', label: 'Без документов' },
    { id: 'ready_exam', label: 'К экзамену' },
    { id: 'inactive', label: 'Неактивные' },
  ]

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex flex-shrink-0 flex-wrap items-center gap-3 border-b border-gray-100 bg-white px-4 py-4 md:px-6">
        <h1 className="text-[24px] font-black text-gray-900">Ученики</h1>
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[12px] font-bold text-gray-500">{filtered.length}</span>
        <div className="ml-auto flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по имени, телефону..."
              className="h-10 w-[260px] rounded-xl border border-gray-200 bg-gray-50 px-4 pr-9 text-[14px] font-semibold text-gray-900 placeholder-gray-300 transition focus:border-gray-900 focus:bg-white focus:outline-none"
            />
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300" width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <button className="h-10 rounded-xl bg-gray-900 px-4 text-[13px] font-bold text-white">
            + Добавить ученика
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-shrink-0 gap-1 border-b border-gray-100 bg-white px-4 md:px-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`relative flex items-center gap-1.5 border-b-2 px-3 py-3 text-[13px] font-semibold transition ${
              filter === tab.id
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                filter === tab.id ? 'bg-gray-900 text-white' : 'bg-red-100 text-red-500'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-[15px] font-semibold text-gray-400">Ничего не найдено</p>
              {search && (
                <button onClick={() => setSearch('')} className="mt-2 text-[13px] font-bold text-gray-600 underline">
                  Сбросить поиск
                </button>
              )}
            </div>
          </div>
        ) : (
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-left text-[12px] font-bold uppercase tracking-wider text-gray-400">
                <th className="px-4 py-3">Ученик</th>
                <th className="px-4 py-3">Телефон</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Часы</th>
                <th className="px-4 py-3">Долг</th>
                <th className="px-4 py-3">Документы</th>
                <th className="px-4 py-3">Инструктор</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((student) => {
                const hasDebt = data.debtStudents.has(student.id)
                const missingDocs = data.docs[student.id] ?? 0
                const debt = getDebtForStudent(student.id)
                const instructor = db.instructors.byId(student.assignedInstructorId ?? '')
                const hours = data.hours[student.id] ?? 0
                const stage = student.trainingStage ?? 'new_request'

                return (
                  <motion.tr
                    key={student.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="cursor-pointer border-b border-gray-50 transition hover:bg-gray-50/50"
                    onClick={() => navigate(`${ADMIN_BASE_PATH}/students/${student.id}`)}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-[13px] font-bold text-gray-600">
                          {student.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{student.name}</p>
                          {student.categoryCodes?.[0] && (
                            <p className="text-[12px] font-semibold text-gray-400">Категория {student.categoryCodes[0]}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <a
                        href={`tel:${student.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[13px] font-semibold text-gray-600 hover:text-gray-900"
                      >
                        {student.phone}
                      </a>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`rounded-lg px-2.5 py-1 text-[12px] font-bold ${STAGE_COLORS[stage] ?? 'bg-gray-100 text-gray-500'}`}>
                        {STAGE_LABELS[stage] ?? stage}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-[60px] overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-blue-400"
                            style={{ width: `${Math.min((hours / 56) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-[12px] font-semibold text-gray-500">{hours}ч</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {hasDebt ? (
                        <span className="rounded-lg bg-red-50 px-2.5 py-1 text-[12px] font-bold text-red-500">
                          {debt.toLocaleString('ru-RU')} ₽
                        </span>
                      ) : (
                        <span className="text-[13px] font-semibold text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {missingDocs > 0 ? (
                        <span className="rounded-lg bg-orange-50 px-2.5 py-1 text-[12px] font-bold text-orange-500">
                          {missingDocs} не хватает
                        </span>
                      ) : (
                        <span className="text-[13px] font-semibold text-green-500">✓</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[13px] font-semibold text-gray-600">
                        {instructor?.name ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-300">
                        <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
