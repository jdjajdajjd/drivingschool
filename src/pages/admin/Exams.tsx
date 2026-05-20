import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { db } from '../../services/storage'
import { adminInternalExams, adminGIBDDExams, createCurrentStaffAuditEntry, studentProgress } from '../../services/adminStorage'
import { getAdminBasePathForLocation } from '../../services/accessControl'
import { Modal } from '../../components/ui/Modal'
import { assertAdminPermission, canUseAdminPermission } from '../../services/adminAccess'
import { saveStudentProgressAdminConfirmed } from '../../services/studentProfile'
import type { GIBDDExam, GIBDDExamStatus, InternalExam, InternalExamStatus, Student } from '../../types'

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
  const [version, setVersion] = useState(0)
  const [showCreate, setShowCreate] = useState(false)
  const [editingInternal, setEditingInternal] = useState<InternalExam | null>(null)
  const [editingGibdd, setEditingGibdd] = useState<GIBDDExam | null>(null)
  const canManageExams = canUseAdminPermission('exams.manage')

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
  }, [school?.id, version])

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
        {canManageExams ? (
          <button onClick={() => setShowCreate(true)} className="v-admin-button min-h-10 px-4 text-[13px]">
            Добавить попытку
          </button>
        ) : null}
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
                  <tr key={exam.id} className={canManageExams ? 'cursor-pointer' : ''} onClick={() => canManageExams && setEditingInternal(exam)}>
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
                  <tr key={exam.id} className={canManageExams ? 'cursor-pointer' : ''} onClick={() => canManageExams && setEditingGibdd(exam)}>
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
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Добавить попытку" size="md">
        {school ? (
          <ExamForm
            schoolId={school.id}
            tab={tab}
            onSaved={() => setVersion((value) => value + 1)}
            onClose={() => setShowCreate(false)}
          />
        ) : null}
      </Modal>
      <Modal open={Boolean(editingInternal)} onClose={() => setEditingInternal(null)} title="Внутренний экзамен" size="md">
        {school && editingInternal ? (
          <ExamForm
            schoolId={school.id}
            tab="internal"
            internalExam={editingInternal}
            onSaved={() => setVersion((value) => value + 1)}
            onClose={() => setEditingInternal(null)}
          />
        ) : null}
      </Modal>
      <Modal open={Boolean(editingGibdd)} onClose={() => setEditingGibdd(null)} title="Экзамен ГИБДД" size="md">
        {school && editingGibdd ? (
          <ExamForm
            schoolId={school.id}
            tab="gibdd"
            gibddExam={editingGibdd}
            onSaved={() => setVersion((value) => value + 1)}
            onClose={() => setEditingGibdd(null)}
          />
        ) : null}
      </Modal>
    </div>
  )
}

function ExamForm({ schoolId, tab, internalExam, gibddExam, onSaved, onClose }: { schoolId: string; tab: ExamTab; internalExam?: InternalExam; gibddExam?: GIBDDExam; onSaved: () => void; onClose: () => void }) {
  const students = db.students.bySchool(schoolId)
  const instructors = db.instructors.bySchool(schoolId)
  const selectedExam = internalExam ?? gibddExam
  const initialStudentId = selectedExam?.studentId ?? students[0]?.id ?? ''
  const [examType, setExamType] = useState<ExamTab>(internalExam ? 'internal' : gibddExam ? 'gibdd' : tab)
  const [studentId, setStudentId] = useState(initialStudentId)
  const [date, setDate] = useState(internalExam?.scheduledDate?.slice(0, 10) ?? gibddExam?.examDate?.slice(0, 10) ?? gibddExam?.scheduledDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10))
  const [status, setStatus] = useState<InternalExamStatus | GIBDDExamStatus>(selectedExam?.status ?? 'scheduled')
  const [result, setResult] = useState<'pending' | 'passed' | 'failed'>(selectedExam?.result ?? 'pending')
  const [examinerId, setExaminerId] = useState(internalExam?.examinerId ?? '')
  const [failureReason, setFailureReason] = useState(gibddExam?.failureReason ?? '')
  const [comment, setComment] = useState(internalExam?.comment ?? '')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const activeStudent = students.find((student) => student.id === studentId) as Student | undefined
  const attemptsCount = examType === 'internal'
    ? adminInternalExams.byStudent(studentId).length
    : adminGIBDDExams.byStudent(studentId).length

  const save = async () => {
    const access = assertAdminPermission('exams.manage')
    if (!access.ok) { setError(access.error ?? 'Недостаточно прав.'); return }
    if (pending) return
    if (!studentId || !date) { setError('Выберите ученика и дату экзамена.'); return }

    setPending(true)
    setError('')
    try {
      const resolvedResult = result === 'pending' ? undefined : result
      const resolvedStatus = resolvedResult ?? status
      if (examType === 'internal') {
        const exam: InternalExam = {
          id: internalExam?.id ?? `internal_${Date.now()}`,
          schoolId,
          studentId,
          scheduledDate: date,
          examinerId: examinerId || undefined,
          result: resolvedResult,
          attemptNumber: internalExam?.attemptNumber ?? attemptsCount + 1,
          comment: comment.trim() || undefined,
          status: resolvedStatus as InternalExamStatus,
          createdAt: internalExam?.createdAt ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        await adminInternalExams.upsertConfirmed(exam)
        if (exam.result === 'passed') {
          const progress = studentProgress.get(studentId)
          if (progress) {
            const next = { ...progress, internalExamPassed: true, internalExamDate: date, internalExamStatus: 'passed' as const, updatedAt: new Date().toISOString() }
            await saveStudentProgressAdminConfirmed(next)
            studentProgress.save(next)
          }
        }
        createCurrentStaffAuditEntry(schoolId, 'exam_result_set', 'internal_exam', exam.id, `Внутренний экзамен: ${activeStudent?.name ?? 'ученик'} — ${statusLabel(exam.status)}`)
      } else {
        const exam: GIBDDExam = {
          id: gibddExam?.id ?? `gibdd_${Date.now()}`,
          schoolId,
          studentId,
          scheduledDate: date,
          examDate: date,
          result: resolvedResult,
          attemptNumber: gibddExam?.attemptNumber ?? attemptsCount + 1,
          failureReason: resolvedResult === 'failed' ? failureReason.trim() || undefined : undefined,
          status: resolvedStatus as GIBDDExamStatus,
          createdAt: gibddExam?.createdAt ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        await adminGIBDDExams.upsertConfirmed(exam)
        const progress = studentProgress.get(studentId)
        if (progress && exam.result) {
          const next = { ...progress, gaidExamDate: date, gibddExamStatus: exam.result, updatedAt: new Date().toISOString() }
          await saveStudentProgressAdminConfirmed(next)
          studentProgress.save(next)
        }
        createCurrentStaffAuditEntry(schoolId, 'exam_result_set', 'gibdd_exam', exam.id, `Экзамен ГИБДД: ${activeStudent?.name ?? 'ученик'} — ${statusLabel(exam.status)}`)
      }
      onSaved()
      onClose()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Не удалось сохранить экзамен.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-4 p-5">
      {!internalExam && !gibddExam ? (
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#F8FAFC] p-1">
          <button onClick={() => setExamType('internal')} className={`min-h-10 rounded-xl text-[13px] font-black ${examType === 'internal' ? 'bg-white text-[#111827] shadow-sm' : 'text-[#667085]'}`}>Внутренний</button>
          <button onClick={() => setExamType('gibdd')} className={`min-h-10 rounded-xl text-[13px] font-black ${examType === 'gibdd' ? 'bg-white text-[#111827] shadow-sm' : 'text-[#667085]'}`}>ГИБДД</button>
        </div>
      ) : null}
      <select value={studentId} onChange={(event) => setStudentId(event.target.value)} disabled={Boolean(selectedExam)} className="v-admin-input w-full disabled:opacity-70">
        {students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
      </select>
      <div className="grid gap-3 sm:grid-cols-2">
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="v-admin-input w-full" />
        <select value={status} onChange={(event) => setStatus(event.target.value as InternalExamStatus | GIBDDExamStatus)} className="v-admin-input w-full">
          <option value="ready">Готов</option>
          <option value="scheduled">Назначен</option>
          <option value="passed">Сдан</option>
          <option value="failed">Не сдан</option>
        </select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <select value={result} onChange={(event) => setResult(event.target.value as 'pending' | 'passed' | 'failed')} className="v-admin-input w-full">
          <option value="pending">Результат позже</option>
          <option value="passed">Сдал</option>
          <option value="failed">Не сдал</option>
        </select>
        {examType === 'internal' ? (
          <select value={examinerId} onChange={(event) => setExaminerId(event.target.value)} className="v-admin-input w-full">
            <option value="">Экзаменатор не указан</option>
            {instructors.map((instructor) => <option key={instructor.id} value={instructor.id}>{instructor.name}</option>)}
          </select>
        ) : (
          <input value={failureReason} onChange={(event) => setFailureReason(event.target.value)} className="v-admin-input w-full" placeholder="Причина несдачи, если есть" />
        )}
      </div>
      {examType === 'internal' ? <textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={3} className="v-admin-input min-h-[92px] w-full resize-none py-3" placeholder="Комментарий экзаменатора" /> : null}
      <div className="rounded-xl border border-[#E5EAF1] bg-[#F8FAFC] p-3 text-[12px] font-semibold leading-5 text-[#667085]">
        Попытка будет записана в историю ученика. Если результат “сдал”, карточка ученика автоматически продвинется по допуску.
      </div>
      {error ? <p className="rounded-[10px] bg-[#EAF3FF] px-3 py-2 text-[13px] font-bold text-[#315A7C]">{error}</p> : null}
      <div className="v-modal-actions">
        <button onClick={onClose} disabled={pending} className="v-admin-button-secondary flex-1 disabled:opacity-50">Отмена</button>
        <button onClick={save} disabled={pending} className="v-admin-button flex-1 disabled:opacity-50">{pending ? 'Сохраняем...' : 'Сохранить'}</button>
      </div>
    </div>
  )
}
