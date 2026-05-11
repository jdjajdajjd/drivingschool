import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { db } from '../../services/storage'
import { adminDocuments } from '../../services/adminStorage'
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
  pending: 'bg-amber-50 text-amber-600',
  uploaded: 'bg-blue-50 text-blue-600',
  verified: 'bg-green-50 text-green-600',
  rejected: 'bg-red-50 text-red-500',
  expired: 'bg-red-100 text-red-600',
  not_required: 'bg-gray-100 text-gray-400',
  required: 'bg-amber-50 text-amber-600',
}

type FilterTab = 'all' | 'missing' | 'pending' | 'verified' | 'expired'

export function AdminDocuments() {
  const school = db.schools.all()[0]
  const [filter, setFilter] = useState<FilterTab>('all')

  const data = useMemo(() => {
    if (!school) return []
    return adminDocuments.all(school.id).map((doc) => {
      const student = db.students.byId(doc.studentId)
      return { doc, student }
    })
  }, [school?.id])

  const filtered = filter === 'all' ? data : data.filter((d) => d.doc.status === filter)

  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'Все' },
    { id: 'missing', label: 'Не загружены' },
    { id: 'pending', label: 'На проверке' },
    { id: 'verified', label: 'Проверены' },
    { id: 'expired', label: 'Просрочены' },
  ]

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-shrink-0 items-center gap-3 border-b border-gray-100 bg-white px-4 py-4 md:px-6">
        <h1 className="text-[24px] font-black text-gray-900">Документы</h1>
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[12px] font-bold text-gray-500">{filtered.length}</span>
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
