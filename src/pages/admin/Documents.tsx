import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { db } from '../../services/storage'
import { adminDocuments, getDebtForStudent, studentProgress } from '../../services/adminStorage'
import { getAdminBasePathForLocation } from '../../services/accessControl'
import type { DocumentStatus } from '../../types'

const DOC_LABELS: Record<string, string> = {
  contract: 'Договор', passport: 'Паспорт', medical_certificate: 'Медсправка',
  consent_data_processing: 'Согласие', application: 'Заявление', parent_consent: 'Согласие родителей',
  snils: 'СНИЛС', state_fee_receipt: 'Госпошлина', photo: 'Фото',
  internal_certificate: 'Сертификат', gibdd_exam_doc: 'Документы ГИБДД',
}

const STATUS_LABELS: Record<DocumentStatus, string> = {
  missing: 'Не загружен',
  pending: 'На проверке',
  uploaded: 'Загружен',
  verified: 'Проверен',
  rejected: 'Отклонен',
  expired: 'Просрочен',
  not_required: 'Не требуется',
  required: 'Требуется',
}

function statusTone(status: DocumentStatus) {
  if (status === 'verified') return 'v-tone-ok'
  if (status === 'pending' || status === 'uploaded' || status === 'required') return 'v-tone-warning'
  if (status === 'not_required') return 'v-tone-muted'
  return 'v-tone-danger'
}

type FilterTab = 'all' | 'missing' | 'pending' | 'verified' | 'expired'

const REQUIRED_FOR_EXAM = ['contract', 'medical_certificate', 'gibdd_exam_doc'] as const

function isBlockingStatus(status: DocumentStatus) {
  return status === 'missing' || status === 'rejected' || status === 'expired' || status === 'required'
}

export function AdminDocuments() {
  const school = db.schools.currentAdmin()
  const [filter, setFilter] = useState<FilterTab>('all')

  const data = useMemo(() => {
    if (!school) return []
    return adminDocuments.all(school.id).map((doc) => {
      const student = db.students.byId(doc.studentId)
      return { doc, student }
    })
  }, [school?.id])

  const filtered = filter === 'all' ? data : data.filter((d) => d.doc.status === filter)

  const summary = useMemo(() => {
    const counts = { missing: 0, pending: 0, rejected: 0, expired: 0, verified: 0 }
    data.forEach(({ doc }) => {
      if (doc.status in counts) counts[doc.status as keyof typeof counts] += 1
    })
    return counts
  }, [data])

  const admissionQueue = useMemo(() => {
    if (!school) return []
    return db.students.bySchool(school.id).map((student) => {
      const docs = data.filter((entry) => entry.student?.id === student.id).map((entry) => entry.doc)
      const missing = REQUIRED_FOR_EXAM.filter((type) => !docs.some((doc) => doc.type === type && doc.status === 'verified'))
      const broken = docs.filter((doc) => REQUIRED_FOR_EXAM.includes(doc.type as typeof REQUIRED_FOR_EXAM[number]) && isBlockingStatus(doc.status)).map((doc) => doc.type)
      const blockers = Array.from(new Set([...missing, ...broken]))
      const progress = studentProgress.get(student.id)
      const debt = getDebtForStudent(student.id)
      const isNearExam = (progress?.confirmedHours ?? 0) >= Math.max((progress?.drivingHoursTotal ?? 56) - 10, 0) || student.trainingStage === 'ready_for_internal_exam' || student.trainingStage === 'ready_for_gibdd'
      return { student, blockers, debt, isNearExam, hours: progress?.confirmedHours ?? 0, total: progress?.drivingHoursTotal ?? 56 }
    }).filter((item) => item.blockers.length > 0 || item.debt > 0 || item.isNearExam).sort((left, right) => Number(right.isNearExam) - Number(left.isNearExam) || right.blockers.length - left.blockers.length).slice(0, 10)
  }, [school?.id, data])

  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'Все' },
    { id: 'missing', label: 'Не загружены' },
    { id: 'pending', label: 'На проверке' },
    { id: 'verified', label: 'Проверены' },
    { id: 'expired', label: 'Просрочены' },
  ]

  return (
    <div className="flex h-full flex-col">
      <div className="v-admin-toolbar">
        <div>
          <h1 className="v-admin-heading">Документы</h1>
          <p className="v-admin-note mt-1">Допуски к экзаменам, медсправки и договоры</p>
        </div>
        <span className="v-admin-pill v-tone-muted">{filtered.length}</span>
        <div className="ml-auto grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-4">
          <div className="rounded-[10px] bg-red-50 px-3 py-2"><p className="text-[11px] font-black uppercase text-red-500">Нет</p><p className="text-[18px] font-black text-gray-900">{summary.missing + summary.rejected + summary.expired}</p></div>
          <div className="rounded-[10px] bg-[#EAF3FF] px-3 py-2"><p className="text-[11px] font-black uppercase text-[#315A7C]">Проверка</p><p className="text-[18px] font-black text-gray-900">{summary.pending}</p></div>
          <div className="rounded-[10px] bg-green-50 px-3 py-2"><p className="text-[11px] font-black uppercase text-green-600">Готово</p><p className="text-[18px] font-black text-gray-900">{summary.verified}</p></div>
          <div className="rounded-[10px] bg-[#F8FAFC] px-3 py-2"><p className="text-[11px] font-black uppercase text-gray-400">Допуск</p><p className="text-[18px] font-black text-gray-900">{admissionQueue.length}</p></div>
        </div>
      </div>

      <div className="v-tab-row v-tab-row-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`v-tab ${filter === tab.id ? 'v-tab-active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        <section className="grid gap-3 p-3 md:p-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="v-admin-panel overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4">
              <div>
                <h2 className="text-[18px] font-black text-[#111418]">Очередь допуска</h2>
                <p className="v-admin-note mt-1">Кого нельзя выпускать на экзамен без документов или оплаты</p>
              </div>
              <span className={`v-admin-pill ${admissionQueue.length ? 'v-tone-danger' : 'v-tone-ok'}`}>{admissionQueue.length ? `${admissionQueue.length} проверить` : 'чисто'}</span>
            </div>
            {admissionQueue.length === 0 ? (
              <div className="p-5 text-[13px] font-semibold text-gray-400">Блокеров допуска сейчас не видно.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {admissionQueue.map(({ student, blockers, debt, isNearExam, hours, total }) => (
                  <a key={student.id} href={`${getAdminBasePathForLocation()}/students/${student.id}`} className="grid gap-3 p-4 transition hover:bg-[#F8FAFC] sm:grid-cols-[minmax(0,1fr)_160px_170px] sm:items-center">
                    <span className="min-w-0">
                      <strong className="block truncate text-[15px] font-black text-gray-900">{student.name}</strong>
                      <span className="mt-1 block text-[12px] font-bold text-gray-400">Практика {hours}/{total} ч · {isNearExam ? 'близко к экзамену' : 'в обучении'}</span>
                    </span>
                    <span className="text-[13px] font-black text-gray-700">{blockers.length ? blockers.map((type) => DOC_LABELS[type] ?? type).join(', ') : 'документы ок'}</span>
                    <span className={`w-max rounded-full px-3 py-1 text-[12px] font-black ${debt > 0 || blockers.length ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>{debt > 0 ? `долг ${debt.toLocaleString('ru-RU')} ₽` : blockers.length ? 'допуск закрыт' : 'готов'}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
          <aside className="v-admin-panel p-4">
            <h2 className="text-[18px] font-black text-gray-900">Минимум к ГИБДД</h2>
            <div className="mt-3 grid gap-2">
              {REQUIRED_FOR_EXAM.map((type) => <div key={type} className="rounded-xl bg-gray-50 p-3 text-[13px] font-bold text-gray-600">{DOC_LABELS[type]}</div>)}
              <div className="rounded-xl bg-red-50 p-3 text-[13px] font-bold text-red-600">Плюс нулевой долг</div>
            </div>
          </aside>
        </section>

        {filtered.length === 0 ? (
          <div className="flex h-full items-center justify-center"><p className="text-gray-400">Документов не найдено</p></div>
        ) : (
          <>
          <div className="grid gap-2 px-3 pb-4 md:hidden">
            {filtered.map(({ doc, student }) => (
              <a key={doc.id} href={student ? `${getAdminBasePathForLocation()}/students/${student.id}` : '#'} className="v-human-card block p-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <strong className="block truncate text-[15px] font-semibold text-[#111827]">{student?.name ?? 'Ученик не найден'}</strong>
                    <span className="mt-0.5 block truncate text-[12px] font-medium text-[#667085]">{DOC_LABELS[doc.type] ?? doc.type}</span>
                  </span>
                  <span className={`v-admin-pill shrink-0 ${statusTone(doc.status)}`}>{STATUS_LABELS[doc.status]}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                  <span className="rounded-[16px] bg-[#F8FAFC] p-2">
                    <strong className="block text-[13px] font-semibold text-[#111827]">{doc.uploadedAt ? format(new Date(doc.uploadedAt), 'd MMM', { locale: ru }) : 'нет'}</strong>
                    <span className="text-[11px] font-medium text-[#667085]">загрузка</span>
                  </span>
                  <span className="rounded-[16px] bg-[#F8FAFC] p-2">
                    <strong className={`block text-[13px] font-semibold ${doc.expiresAt && new Date(doc.expiresAt) < new Date() ? 'text-[#C92820]' : 'text-[#111827]'}`}>{doc.expiresAt ?? 'нет срока'}</strong>
                    <span className="text-[11px] font-medium text-[#667085]">истекает</span>
                  </span>
                </div>
              </a>
            ))}
          </div>
          <table className="v-admin-table hidden w-full min-w-[700px] md:table">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-left text-[12px] font-bold uppercase tracking-wider text-gray-400">
                <th className="px-4 py-3">Ученик</th>
                <th className="px-4 py-3">Тип документа</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Дата загрузки</th>
                <th className="px-4 py-3">Истекает</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ doc, student }) => (
                <tr key={doc.id} className="border-b border-gray-50 transition hover:bg-gray-50/50">
                  <td className="px-4 py-3.5">
                    {student ? (
                      <a href={`${getAdminBasePathForLocation()}/students/${student.id}`} className="font-bold text-gray-900 hover:text-blue-600">
                        {student.name}
                      </a>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3.5 text-[13px] font-semibold text-gray-600">{DOC_LABELS[doc.type] ?? doc.type}</td>
                  <td className="px-4 py-3.5">
                      <span className={`v-admin-pill ${statusTone(doc.status)}`}>
                        {STATUS_LABELS[doc.status]}
                      </span>
                  </td>
                  <td className="px-4 py-3.5 text-[13px] font-semibold text-gray-400">
                    {doc.uploadedAt ? format(new Date(doc.uploadedAt), 'd MMM yyyy', { locale: ru }) : '—'}
                  </td>
                  <td className="px-4 py-3.5 text-[13px] font-semibold text-gray-400">
                    {doc.expiresAt ? (
                      <span className={new Date(doc.expiresAt) < new Date() ? 'text-red-500' : ''}>
                        {doc.expiresAt}
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </>
        )}
      </div>
    </div>
  )
}
