import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { db } from '../../services/storage'
import { adminInternalExams, adminGIBDDExams } from '../../services/adminStorage'
import { getAdminBasePathForLocation } from '../../services/accessControl'

type ExamTab = 'internal' | 'gibdd'

function statusLabel(status: string) {
  if (status === 'ready') return 'Готов'
  if (status === 'scheduled') return 'Назначен'
  if (status === 'passed') return 'Сдан'
  if (status === 'failed') return 'Не сдан'
  return 'Не готов'
}

function statusTone(status: string) {
  if (status === 'passed') return 'v-tone-ok'
  if (status === 'failed') return 'v-tone-danger'
  if (status === 'scheduled' || status === 'ready') return 'v-tone-info'
  return 'v-tone-muted'
}

function resultLabel(result?: string) {
  if (result === 'passed') return 'Сдал'
  if (result === 'failed') return 'Не сдал'
  return 'ожидается'
}

export function AdminExams() {
  const school = db.schools.currentAdmin()
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
      <div className="v-admin-toolbar">
        <div>
          <h1 className="v-admin-heading">Экзамены</h1>
          <p className="v-admin-note mt-1">Внутренний контроль и готовность к ГИБДД</p>
        </div>
      </div>

      <div className="grid flex-shrink-0 grid-cols-2 gap-2 px-3 py-3 md:grid-cols-6 md:px-5">
        {[
          { label: 'Готовы к внутр.', value: stats.internalReady, tone: 'v-tone-info' },
          { label: 'Назначены внутр.', value: stats.internalScheduled, tone: 'v-tone-info' },
          { label: 'Сдано внутр.', value: stats.internalPassed, tone: 'v-tone-ok' },
          { label: 'Готовы к ГИБДД', value: stats.gibddReady, tone: 'v-tone-info' },
          { label: 'Назначены ГИБДД', value: stats.gibddScheduled, tone: 'v-tone-info' },
          { label: 'Сдано ГИБДД', value: stats.gibddPassed, tone: 'v-tone-ok' },
        ].map((stat) => (
          <button key={stat.label} type="button" className="v-human-card min-h-[78px] p-3 text-left md:text-center">
            <span className={`v-admin-pill ${stat.tone}`}>{stat.label}</span>
            <p className="mt-2 text-[24px] font-semibold leading-none text-[#111827]">{stat.value}</p>
          </button>
        ))}
      </div>

      <div className="v-tab-row v-tab-row-wrap">
        <button onClick={() => setTab('internal')} className={`v-tab ${tab === 'internal' ? 'v-tab-active' : ''}`}>
          Внутренние
        </button>
        <button onClick={() => setTab('gibdd')} className={`v-tab ${tab === 'gibdd' ? 'v-tab-active' : ''}`}>
          ГИБДД
        </button>
      </div>

      <div className="flex-1 overflow-auto p-3 md:p-5">
        {tab === 'internal' ? (
          data.internal.length === 0 ? (
            <div className="v-admin-empty"><strong>Экзаменов нет</strong><span>Когда ученик будет готов, запись появится здесь.</span></div>
          ) : (
            <>
            <div className="grid gap-2 md:hidden">
              {data.internal.map(({ exam, student }) => (
                <a key={exam.id} href={student ? `${getAdminBasePathForLocation()}/students/${student.id}` : '#'} className="v-human-card block p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <strong className="block truncate text-[15px] font-semibold text-[#111827]">{student?.name ?? 'Ученик не найден'}</strong>
                      <span className="mt-0.5 block text-[12px] font-medium text-[#667085]">Внутренний экзамен · попытка {exam.attemptNumber}</span>
                    </span>
                    <span className={`v-admin-pill shrink-0 ${statusTone(exam.status)}`}>{statusLabel(exam.status)}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                    <span className="rounded-[16px] bg-[#F8FAFC] p-2"><strong className="block text-[13px] font-semibold text-[#111827]">{exam.scheduledDate ? format(new Date(exam.scheduledDate), 'd MMM', { locale: ru }) : 'не назначен'}</strong><span className="text-[11px] font-medium text-[#667085]">дата</span></span>
                    <span className="rounded-[16px] bg-[#F8FAFC] p-2"><strong className={`block text-[13px] font-semibold ${exam.result === 'failed' ? 'text-[#C92820]' : exam.result === 'passed' ? 'text-[#1F8F3F]' : 'text-[#111827]'}`}>{resultLabel(exam.result)}</strong><span className="text-[11px] font-medium text-[#667085]">результат</span></span>
                  </div>
                </a>
              ))}
            </div>
            <div className="v-admin-panel hidden overflow-hidden md:block">
            <table className="v-admin-table w-full min-w-[700px]">
              <thead>
                <tr>
                  <th>Ученик</th>
                  <th>Статус</th>
                  <th>Дата</th>
                  <th>Попытка</th>
                  <th>Результат</th>
                </tr>
              </thead>
              <tbody>
                {data.internal.map(({ exam, student }) => (
                  <tr key={exam.id}>
                    <td>
                      {student ? (
                        <a href={`${getAdminBasePathForLocation()}/students/${student.id}`} className="font-bold text-[#111827] hover:text-[#075EBC]">
                          {student.name}
                        </a>
                      ) : <span className="text-[#98A2B3]">-</span>}
                    </td>
                    <td><span className={`v-admin-pill ${statusTone(exam.status)}`}>{statusLabel(exam.status)}</span></td>
                    <td>{exam.scheduledDate ? format(new Date(exam.scheduledDate), 'd MMM yyyy', { locale: ru }) : 'Не назначена'}</td>
                    <td>{exam.attemptNumber}</td>
                    <td>{resultLabel(exam.result)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
            </>
          )
        ) : (
          data.gibdd.length === 0 ? (
            <div className="v-admin-empty"><strong>Экзаменов ГИБДД нет</strong><span>Назначенные попытки появятся здесь.</span></div>
          ) : (
            <>
            <div className="grid gap-2 md:hidden">
              {data.gibdd.map(({ exam, student }) => (
                <a key={exam.id} href={student ? `${getAdminBasePathForLocation()}/students/${student.id}` : '#'} className="v-human-card block p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <strong className="block truncate text-[15px] font-semibold text-[#111827]">{student?.name ?? 'Ученик не найден'}</strong>
                      <span className="mt-0.5 block text-[12px] font-medium text-[#667085]">ГИБДД · попытка {exam.attemptNumber}</span>
                    </span>
                    <span className={`v-admin-pill shrink-0 ${statusTone(exam.status)}`}>{statusLabel(exam.status)}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                    <span className="rounded-[16px] bg-[#F8FAFC] p-2"><strong className="block text-[13px] font-semibold text-[#111827]">{exam.examDate ? format(new Date(exam.examDate), 'd MMM', { locale: ru }) : 'не назначен'}</strong><span className="text-[11px] font-medium text-[#667085]">дата</span></span>
                    <span className="rounded-[16px] bg-[#F8FAFC] p-2"><strong className={`block text-[13px] font-semibold ${exam.result === 'failed' ? 'text-[#C92820]' : exam.result === 'passed' ? 'text-[#1F8F3F]' : 'text-[#111827]'}`}>{resultLabel(exam.result)}</strong><span className="text-[11px] font-medium text-[#667085]">результат</span></span>
                  </div>
                  {exam.failureReason ? <p className="mt-3 rounded-[16px] bg-[#FEF2F2] p-2 text-[12px] font-medium text-[#C92820]">{exam.failureReason}</p> : null}
                </a>
              ))}
            </div>
            <div className="v-admin-panel hidden overflow-hidden md:block">
            <table className="v-admin-table w-full min-w-[700px]">
              <thead>
                <tr>
                  <th>Ученик</th>
                  <th>Статус</th>
                  <th>Дата экзамена</th>
                  <th>Попытка</th>
                  <th>Результат</th>
                  <th>Причина</th>
                </tr>
              </thead>
              <tbody>
                {data.gibdd.map(({ exam, student }) => (
                  <tr key={exam.id}>
                    <td>
                      {student ? (
                        <a href={`${getAdminBasePathForLocation()}/students/${student.id}`} className="font-bold text-[#111827] hover:text-[#075EBC]">
                          {student.name}
                        </a>
                      ) : <span className="text-[#98A2B3]">-</span>}
                    </td>
                    <td><span className={`v-admin-pill ${statusTone(exam.status)}`}>{statusLabel(exam.status)}</span></td>
                    <td>{exam.examDate ? format(new Date(exam.examDate), 'd MMM yyyy', { locale: ru }) : '-'}</td>
                    <td>{exam.attemptNumber}</td>
                    <td>{resultLabel(exam.result)}</td>
                    <td>{exam.failureReason ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            </>
          )
        )}
      </div>
    </div>
  )
}
