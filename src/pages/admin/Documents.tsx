import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { db } from '../../services/storage'
import { adminDocuments, getDebtForStudent, studentProgress } from '../../services/adminStorage'
import { ADMIN_BASE_PATH } from '../../services/accessControl'
import type { DocumentStatus } from '../../types'

const DOC_LABELS: Record<string, string> = {
  contract: 'Договор', passport: 'Паспорт', medical_certificate: 'Медсправка',
  consent_data_processing: 'Согласие', application: 'Заявление', parent_consent: 'Согласие родителей',
  snils: 'СНИЛС', state_fee_receipt: 'Госпошлина', photo: 'Фото',
  internal_certificate: 'Сертификат', gibdd_exam_doc: 'Документы ГИБДД',
}

const STATUS_COLORS: Record<DocumentStatus, string> = {
  missing: 'bg-red-50 text-red-500',
  pending: 'bg-[#EAF3FF] text-[#315A7C]',
  uploaded: 'bg-blue-50 text-blue-600',
  verified: 'bg-green-50 text-green-600',
  rejected: 'bg-red-50 text-red-500',
  expired: 'bg-red-100 text-red-600',
  not_required: 'bg-gray-100 text-gray-400',
  required: 'bg-[#EAF3FF] text-[#315A7C]',
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
      <div className="flex flex-shrink-0 flex-wrap items-center gap-3 border-b border-gray-100 bg-white px-4 py-4 md:px-6">
        <div>
          <h1 className="text-[24px] font-black text-gray-900">Документы</h1>
          <p className="mt-1 text-[13px] font-semibold text-gray-400">Допуски к экзаменам, медсправки и договоры</p>
        </div>
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[12px] font-bold text-gray-500">{filtered.length}</span>
        <div className="ml-auto grid w-full gap-2 sm:w-auto sm:grid-cols-4">
          <div className="rounded-[10px] bg-red-50 px-3 py-2"><p className="text-[11px] font-black uppercase text-red-500">Нет</p><p className="text-[18px] font-black text-gray-900">{summary.missing + summary.rejected + summary.expired}</p></div>
          <div className="rounded-[10px] bg-[#EAF3FF] px-3 py-2"><p className="text-[11px] font-black uppercase text-[#315A7C]">Проверка</p><p className="text-[18px] font-black text-gray-900">{summary.pending}</p></div>
          <div className="rounded-[10px] bg-green-50 px-3 py-2"><p className="text-[11px] font-black uppercase text-green-600">Готово</p><p className="text-[18px] font-black text-gray-900">{summary.verified}</p></div>
          <div className="rounded-[10px] bg-[#F8FAFC] px-3 py-2"><p className="text-[11px] font-black uppercase text-gray-400">Допуск</p><p className="text-[18px] font-black text-gray-900">{admissionQueue.length}</p></div>
        </div>
      </div>

      <div className="flex flex-shrink-0 gap-1 border-b border-gray-100 bg-white px-4 md:px-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`border-b-2 px-3 py-3 text-[13px] font-semibold transition ${
              filter === tab.id ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        <section className="grid gap-3 p-3 md:p-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4">
              <div>
                <h2 className="text-[18px] font-black text-gray-900">Очередь допуска</h2>
                <p className="mt-1 text-[13px] font-semibold text-gray-400">Кого нельзя выпускать на экзамен без документов или оплаты</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-[12px] font-black ${admissionQueue.length ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>{admissionQueue.length ? `${admissionQueue.length} проверить` : 'чисто'}</span>
            </div>
            {admissionQueue.length === 0 ? (
              <div className="p-5 text-[13px] font-semibold text-gray-400">Блокеров допуска сейчас не видно.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {admissionQueue.map(({ student, blockers, debt, isNearExam, hours, total }) => (
                  <a key={student.id} href={`${ADMIN_BASE_PATH}/students/${student.id}`} className="grid gap-3 p-4 transition hover:bg-gray-50 sm:grid-cols-[minmax(0,1fr)_160px_170px] sm:items-center">
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
          <aside className="rounded-2xl border border-gray-100 bg-white p-4">
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
          <table className="w-full min-w-[700px]">
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
                      <a href={`${ADMIN_BASE_PATH}/students/${student.id}`} className="font-bold text-gray-900 hover:text-blue-600">
                        {student.name}
                      </a>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3.5 text-[13px] font-semibold text-gray-600">{DOC_LABELS[doc.type] ?? doc.type}</td>
                  <td className="px-4 py-3.5">
                    <span className={`rounded-lg px-2.5 py-1 text-[12px] font-bold ${STATUS_COLORS[doc.status]}`}>
                      {doc.status === 'missing' ? 'Не загружен' :
                       doc.status === 'pending' ? 'На проверке' :
                       doc.status === 'uploaded' ? 'Загружен' :
                       doc.status === 'verified' ? 'Проверен' :
                       doc.status === 'rejected' ? 'Отклонён' :
                       doc.status === 'expired' ? 'Просрочен' :
                       doc.status === 'not_required' ? 'Не требуется' :
                       doc.status === 'required' ? 'Требуется' : doc.status}
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
        )}
      </div>
    </div>
  )
}
