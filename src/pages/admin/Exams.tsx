import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { db } from '../../services/storage'
import { adminInternalExams, adminGIBDDExams } from '../../services/adminStorage'
import { ADMIN_BASE_PATH } from '../../services/accessControl'

type ExamTab = 'internal' | 'gibdd'

export function AdminExams() {
  const school = db.schools.all()[0]
  const [tab, setTab] = useState<ExamTab>('internal')

  const data = useMemo(() => {
    if (!school) return { internal: [], gibdd: [] }
    return {
      internal: adminInternalExams.all(school.id).map((exam) => {
        const student = db.students.byId(exam.studentId)
        const instructor = exam.examinerId ? db.instructors.byId(exam.examinerId) : null
        return { exam, student, instructor }
      }),
      gibdd: adminGIBDDExams.all(school.id).map((exam) => {
        const student = db.students.byId(exam.studentId)
        return { exam, student }
      }),
    }
  }, [school?.id])

  const stats = useMemo(() => {
    const internal = data.internal
    const gibdd = data.gibdd
    return {
      internalReady: internal.filter((e) => e.exam.status === 'ready').length,
      internalScheduled: internal.filter((e) => e.exam.status === 'scheduled').length,
      internalPassed: internal.filter((e) => e.exam.status === 'passed').length,
      gibddReady: gibdd.filter((e) => e.exam.status === 'ready').length,
      gibddScheduled: gibdd.filter((e) => e.exam.status === 'scheduled').length,
      gibddPassed: gibdd.filter((e) => e.exam.status === 'passed').length,
    }
  }, [data])

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-shrink-0 items-center gap-3 border-b border-gray-100 bg-white px-4 py-4 md:px-6">
        <h1 className="text-[24px] font-black text-gray-900">Экзамены</h1>
      </div>

      {/* Stats */}
      <div className="grid flex-shrink-0 grid-cols-2 gap-3 border-b border-gray-100 bg-white px-4 py-3 md:px-6 md:grid-cols-6">
        {[
          { label: 'Готовы к внутр.', value: stats.internalReady, color: 'text-purple-600' },
          { label: 'Назначены (внутр.)', value: stats.internalScheduled, color: 'text-blue-600' },
          { label: 'Сдано (внутр.)', value: stats.internalPassed, color: 'text-green-600' },
          { label: 'Готовы к ГИБДД', value: stats.gibddReady, color: 'text-purple-700' },
          { label: 'Назначены (ГИБДД)', value: stats.gibddScheduled, color: 'text-blue-600' },
          { label: 'Сдано (ГИБДД)', value: stats.gibddPassed, color: 'text-green-600' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
            <p className={`text-[22px] font-black ${stat.color}`}>{stat.value}</p>
            <p className="text-[11px] font-semibold text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Tab switch */}
      <div className="flex flex-shrink-0 gap-1 border-b border-gray-100 bg-white px-4 md:px-6">
        <button onClick={() => setTab('internal')} className={`border-b-2 px-4 py-3 text-[13px] font-semibold transition ${tab === 'internal' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
          Внутренние экзамены
        </button>
        <button onClick={() => setTab('gibdd')} className={`border-b-2 px-4 py-3 text-[13px] font-semibold transition ${tab === 'gibdd' ? 'border-purple-700 text-purple-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
          Экзамены ГИБДД
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {tab === 'internal' ? (
          data.internal.length === 0 ? (
            <div className="flex h-full items-center justify-center"><p className="text-gray-400">Нет записей</p></div>
          ) : (
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-left text-[12px] font-bold uppercase tracking-wider text-gray-400">
                  <th className="px-4 py-3">Ученик</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3">Дата</th>
                  <th className="px-4 py-3">Попытка</th>
                  <th className="px-4 py-3">Результат</th>
                </tr>
              </thead>
              <tbody>
                {data.internal.map(({ exam, student }) => (
                  <tr key={exam.id} className="border-b border-gray-50 transition hover:bg-gray-50/50">
                    <td className="px-4 py-3.5">
                      {student ? (
                        <a href={`${ADMIN_BASE_PATH}/students/${student.id}`} className="font-bold text-gray-900 hover:text-blue-600">
                          {student.name}
                        </a>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`rounded-lg px-2.5 py-1 text-[12px] font-bold ${
                        exam.status === 'ready' ? 'bg-purple-50 text-purple-600' :
                        exam.status === 'scheduled' ? 'bg-blue-50 text-blue-600' :
                        exam.status === 'passed' ? 'bg-green-50 text-green-600' :
                        exam.status === 'failed' ? 'bg-red-50 text-red-500' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {exam.status === 'ready' ? 'Готов' :
                         exam.status === 'scheduled' ? 'Назначен' :
                         exam.status === 'passed' ? 'Сдан' :
                         exam.status === 'failed' ? 'Не сдан' : 'Не готов'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[13px] font-semibold text-gray-400">
                      {exam.scheduledDate ? format(new Date(exam.scheduledDate), 'd MMM yyyy', { locale: ru }) : 'Не назначена'}
                    </td>
                    <td className="px-4 py-3.5 text-[13px] font-semibold text-gray-500">{exam.attemptNumber}</td>
                    <td className="px-4 py-3.5">
                      {exam.result && (
                        <span className={`text-[13px] font-bold ${exam.result === 'passed' ? 'text-green-600' : 'text-red-500'}`}>
                          {exam.result === 'passed' ? 'Сдал' : 'Не сдал'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          data.gibdd.length === 0 ? (
            <div className="flex h-full items-center justify-center"><p className="text-gray-400">Нет записей</p></div>
          ) : (
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-left text-[12px] font-bold uppercase tracking-wider text-gray-400">
                  <th className="px-4 py-3">Ученик</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3">Дата экзамена</th>
                  <th className="px-4 py-3">Попытка</th>
                  <th className="px-4 py-3">Результат</th>
                  <th className="px-4 py-3">Причина</th>
                </tr>
              </thead>
              <tbody>
                {data.gibdd.map(({ exam, student }) => (
                  <tr key={exam.id} className="border-b border-gray-50 transition hover:bg-gray-50/50">
                    <td className="px-4 py-3.5">
                      {student ? (
                        <a href={`${ADMIN_BASE_PATH}/students/${student.id}`} className="font-bold text-gray-900 hover:text-blue-600">
                          {student.name}
                        </a>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`rounded-lg px-2.5 py-1 text-[12px] font-bold ${
                        exam.status === 'ready' ? 'bg-purple-50 text-purple-700' :
                        exam.status === 'scheduled' ? 'bg-blue-50 text-blue-600' :
                        exam.status === 'passed' ? 'bg-green-50 text-green-600' :
                        exam.status === 'failed' ? 'bg-red-50 text-red-500' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {exam.status === 'ready' ? 'Готов' :
                         exam.status === 'scheduled' ? 'Назначен' :
                         exam.status === 'passed' ? 'Сдан' :
                         exam.status === 'failed' ? 'Не сдан' : 'Не готов'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[13px] font-semibold text-gray-400">
                      {exam.examDate ? format(new Date(exam.examDate), 'd MMM yyyy', { locale: ru }) : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-[13px] font-semibold text-gray-500">{exam.attemptNumber}</td>
                    <td className="px-4 py-3.5">
                      {exam.result && (
                        <span className={`text-[13px] font-bold ${exam.result === 'passed' ? 'text-green-600' : 'text-red-500'}`}>
                          {exam.result === 'passed' ? 'Сдал' : 'Не сдал'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-[13px] font-semibold text-gray-400">{exam.failureReason ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  )
}
