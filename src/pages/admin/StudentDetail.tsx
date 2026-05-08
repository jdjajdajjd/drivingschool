import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { StatusBadge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../components/ui/Toast'
import { formatInstructorName, formatPhone } from '../../lib/utils'
import { formatHumanDate, formatTimeRange } from '../../utils/date'
import { cancelBooking, completeBooking, getBookingsByStudent } from '../../services/bookingService'
import { getStudentById, getStudentStats, updateStudentAdminConfirmed } from '../../services/studentService'
import { db } from '../../services/storage'
import { ADMIN_BASE_PATH } from '../../services/accessControl'
import type { TrainingStage } from '../../types'
import { loadStudentDocuments, loadStudentProgress, loadStudentRequests, refreshStudentDocumentsFromSupabase, refreshStudentProgressFromSupabase, refreshStudentRequestsFromSupabase, saveStudentProgressAdminConfirmed, studentDocumentLabels, studentDocumentStatusLabels, studentRequestStatusLabels, updateStudentDocumentAdminConfirmed, updateStudentRequestStatusAdminConfirmed } from '../../services/studentProfile'
import { isSupabaseConfigured } from '../../lib/supabase'
import { trainingStageLabels } from '../student/studentUtils'

const STAGES: TrainingStage[] = ['theory', 'practice_ground', 'city', 'exam_prep', 'exam', 'completed']

export function AdminStudentDetail() {
  const { studentId } = useParams<{ studentId: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [completeId, setCompleteId] = useState<string | null>(null)
  const [docs, setDocs] = useState<ReturnType<typeof loadStudentDocuments>>([])
  const [prog, setProg] = useState<ReturnType<typeof loadStudentProgress> | null>(null)
  const [requests, setRequests] = useState<ReturnType<typeof loadStudentRequests>>([])
  const [, rerender] = useState(0)

  const student = studentId ? getStudentById(studentId) : null
  const school = student ? db.schools.byId(student.schoolId) : null
  const stats = student ? getStudentStats(student.id) : null
  const history = useMemo(() => (student ? getBookingsByStudent(student.id) : []), [student])
  const branches = student ? db.branches.bySchool(student.schoolId).filter((b) => b.isActive) : []
  const instructors = student ? db.instructors.bySchool(student.schoolId).filter((i) => i.isActive) : []

  useEffect(() => {
    if (!student) return
    setDocs(loadStudentDocuments(student.id))
    setProg(loadStudentProgress(student.id))
    setRequests(loadStudentRequests(student.schoolId))
    if (!isSupabaseConfigured()) return
    void refreshStudentProgressFromSupabase(student.id).then((p) => setProg(p)).catch(() => {})
    void refreshStudentDocumentsFromSupabase(student.id).then((d) => { if (d.length) setDocs(d) }).catch(() => {})
    void refreshStudentRequestsFromSupabase(student.schoolId).then(setRequests).catch(() => {})
  }, [student?.id, student?.schoolId])

  async function patchStudent(patch: Partial<NonNullable<typeof student>>) {
    if (!student) return
    const r = await updateStudentAdminConfirmed(student.id, patch)
    if (!r.ok) { showToast(r.error ?? 'Ошибка', 'error'); return }
    rerender((v) => v + 1)
    showToast('Сохранено', 'success')
  }

  async function patchProgress(patch: Partial<NonNullable<typeof prog>>) {
    if (!student || !prog) return
    const r = await saveStudentProgressAdminConfirmed({ id: prog.id ?? `progress-${student.id}`, studentId: student.id, schoolId: student.schoolId, theoryTopicsTotal: prog.theoryTopicsTotal ?? 0, theoryTopicsCompleted: prog.theoryTopicsCompleted ?? 0, drivingHoursTotal: prog.drivingHoursTotal ?? 0, drivingHoursCompleted: prog.drivingHoursCompleted ?? 0, internalExamPassed: prog.internalExamPassed ?? false, internalExamDate: prog.internalExamDate ?? null, internalExamStatus: prog.internalExamStatus ?? 'not_scheduled', gaidExamDate: prog.gaidExamDate ?? null, gibddExamStatus: prog.gibddExamStatus ?? 'not_scheduled', notes: prog.notes ?? '', updatedAt: new Date().toISOString(), ...patch })
    if (!r.ok) { showToast(r.error ?? 'Ошибка', 'error'); return }
    setProg(r.progress ?? loadStudentProgress(student.id))
    rerender((v) => v + 1)
    showToast('Сохранено', 'success')
  }

  async function patchDoc(type: string, status: string) {
    if (!student) return
    const r = await updateStudentDocumentAdminConfirmed(student.id, type as any, status as any)
    if (!r.ok) { showToast(r.error ?? 'Ошибка', 'error'); return }
    setDocs(r.documents ?? loadStudentDocuments(student.id))
    rerender((v) => v + 1)
    showToast('Сохранено', 'success')
  }

  async function patchRequest(id: string, status: string) {
    if (!student) return
    const r = await updateStudentRequestStatusAdminConfirmed(student.schoolId, id, status as any)
    if (!r.ok) { showToast(r.error ?? 'Ошибка', 'error'); return }
    setRequests(r.requests ?? loadStudentRequests(student.schoolId))
    rerender((v) => v + 1)
    showToast('Сохранено', 'success')
  }

  function handleCancel() {
    if (!cancelId) return
    const r = cancelBooking(cancelId)
    setCancelId(null)
    if (!r.ok) { showToast(r.error ?? 'Ошибка', 'error'); return }
    showToast('Отменена', 'success')
  }

  function handleComplete() {
    if (!completeId) return
    const r = completeBooking(completeId)
    setCompleteId(null)
    if (!r.ok) { showToast(r.error ?? 'Ошибка', 'error'); return }
    showToast('Проведена', 'success')
  }

  if (!student || !stats) {
    return (
      <div className="px-3 py-4 md:px-6 md:py-5">
        <button onClick={() => navigate(`${ADMIN_BASE_PATH}/students`)} className="mb-4 flex items-center gap-2 text-[13px] font-bold text-[#6F747A]">
          ← Ученики
        </button>
        <div className="rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white px-4 py-8 text-center">
          <p className="font-black text-[#111418]">Ученик не найден</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 pb-24 pt-3 md:px-5 md:pt-4">
      <button onClick={() => navigate(`${ADMIN_BASE_PATH}/students`)} className="mb-4 flex items-center gap-2 text-[13px] font-bold text-[#6F747A]">
        ← Ученики
      </button>

      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#9EA3A8]">{school?.name}</p>
          <h1 className="mt-1 text-[22px] font-black tracking-[-0.03em] text-[#111418]">{student.name}</h1>
          <p className="mt-0.5 text-[13px] font-semibold text-[#6F747A]">{formatPhone(student.normalizedPhone)}</p>
        </div>
        <div className="text-right">
          <p className="text-[22px] font-black text-[#111418]">{stats.activeFutureBookings}</p>
          <p className="text-[11px] font-semibold text-[#9EA3A8]">активных записей</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="mb-4 grid grid-cols-4 gap-2">
        {[
          { label: 'Всего', value: stats.totalBookings },
          { label: 'Активных', value: stats.activeFutureBookings },
          { label: 'Проведено', value: stats.completedBookings },
          { label: 'Отменено', value: stats.cancelledBookings },
        ].map((s) => (
          <div key={s.label} className="rounded-[12px] border border-[rgba(0,0,0,0.06)] bg-white px-2 py-2 text-center">
            <p className="text-[18px] font-black">{s.value}</p>
            <p className="text-[10px] font-semibold text-[#9EA3A8]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Assignment */}
      <div className="mb-4 rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white px-3 py-3">
        <h2 className="text-[15px] font-black text-[#111418]">Назначения</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <p className="text-[11px] font-bold text-[#9EA3A8]">Этап</p>
            <select value={student.trainingStage ?? ''} onChange={(e) => void patchStudent({ trainingStage: (e.target.value || undefined) as TrainingStage | undefined })} className="mt-1 h-9 w-full rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-white px-2.5 text-[13px] font-semibold outline-none">
              <option value="">Не назначен</option>
              {STAGES.map((s) => <option key={s} value={s}>{trainingStageLabels[s]}</option>)}
            </select>
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#9EA3A8]">Инструктор</p>
            <select value={student.assignedInstructorId ?? ''} onChange={(e) => void patchStudent({ assignedInstructorId: e.target.value || undefined })} className="mt-1 h-9 w-full rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-white px-2.5 text-[13px] font-semibold outline-none">
              <option value="">Не назначен</option>
              {instructors.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#9EA3A8]">Филиал</p>
            <select value={student.assignedBranchId ?? ''} onChange={(e) => void patchStudent({ assignedBranchId: e.target.value || undefined })} className="mt-1 h-9 w-full rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-white px-2.5 text-[13px] font-semibold outline-none">
              <option value="">Не назначен</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#9EA3A8]">Группа</p>
            <input value={student.groupName ?? ''} onChange={(e) => void patchStudent({ groupName: e.target.value.trim() || undefined })} placeholder="—" className="mt-1 h-9 w-full rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-white px-2.5 text-[13px] font-semibold outline-none" />
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-4 rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white px-3 py-3">
        <h2 className="text-[15px] font-black text-[#111418]">Прогресс</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <p className="text-[11px] font-bold text-[#9EA3A8]">Темы (всего/закрыто)</p>
            <div className="flex gap-1">
              <input type="number" value={prog?.theoryTopicsTotal ?? 0} onChange={(e) => void patchProgress({ theoryTopicsTotal: Number(e.target.value) })} className="mt-1 h-9 w-16 rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-white px-2 text-[13px] font-semibold outline-none" />
              <span className="flex h-9 items-center text-[#9EA3A8]">/</span>
              <input type="number" value={prog?.theoryTopicsCompleted ?? 0} onChange={(e) => void patchProgress({ theoryTopicsCompleted: Number(e.target.value) })} className="mt-1 h-9 w-16 rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-white px-2 text-[13px] font-semibold outline-none" />
            </div>
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#9EA3A8]">Часы (всего/закрыто)</p>
            <div className="flex gap-1">
              <input type="number" value={prog?.drivingHoursTotal ?? 0} onChange={(e) => void patchProgress({ drivingHoursTotal: Number(e.target.value) })} className="mt-1 h-9 w-16 rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-white px-2 text-[13px] font-semibold outline-none" />
              <span className="flex h-9 items-center text-[#9EA3A8]">/</span>
              <input type="number" value={prog?.drivingHoursCompleted ?? 0} onChange={(e) => void patchProgress({ drivingHoursCompleted: Number(e.target.value) })} className="mt-1 h-9 w-16 rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-white px-2 text-[13px] font-semibold outline-none" />
            </div>
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#9EA3A8]">Внутренний экзамен</p>
            <select value={prog?.internalExamStatus ?? 'not_scheduled'} onChange={(e) => void patchProgress({ internalExamStatus: e.target.value as any })} className="mt-1 h-9 w-full rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-white px-2.5 text-[13px] font-semibold outline-none">
              <option value="not_scheduled">Не назначен</option>
              <option value="scheduled">Назначен</option>
              <option value="passed">Сдан</option>
              <option value="failed">Не сдан</option>
            </select>
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#9EA3A8]">Экзамен ГИБДД</p>
            <select value={prog?.gibddExamStatus ?? 'not_scheduled'} onChange={(e) => void patchProgress({ gibddExamStatus: e.target.value as any })} className="mt-1 h-9 w-full rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-white px-2.5 text-[13px] font-semibold outline-none">
              <option value="not_scheduled">Не назначен</option>
              <option value="scheduled">Назначен</option>
              <option value="passed">Сдан</option>
              <option value="failed">Не сдан</option>
            </select>
          </div>
        </div>
      </div>

      {/* Documents */}
      {docs.length > 0 && (
        <div className="mb-4 rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white px-3 py-3">
          <h2 className="text-[15px] font-black text-[#111418]">Документы</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {docs.map((doc) => (
              <div key={doc.type}>
                <p className="text-[11px] font-bold text-[#9EA3A8]">{studentDocumentLabels[doc.type]}</p>
                <select value={doc.status} onChange={(e) => void patchDoc(doc.type, e.target.value)} className="mt-1 h-9 w-full rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-white px-2.5 text-[13px] font-semibold outline-none">
                  {['missing', 'pending', 'provided', 'approved', 'rejected'].map((s) => (
                    <option key={s} value={s}>{studentDocumentStatusLabels[s as keyof typeof studentDocumentStatusLabels]}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Requests */}
      {requests.filter((r) => r.studentId === student.id).length > 0 && (
        <div className="mb-4 rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white px-3 py-3">
          <h2 className="text-[15px] font-black text-[#111418]">Запросы</h2>
          <div className="mt-3 space-y-2">
            {requests.filter((r) => r.studentId === student.id).map((req) => (
              <div key={req.id} className="rounded-[10px] border border-[rgba(0,0,0,0.06)] px-3 py-2">
                <p className="text-[13px] font-black text-[#111418]">{req.type === 'reschedule' ? 'Перенос' : 'Отмена'}: {req.reason}</p>
                <p className="mt-0.5 text-[12px] text-[#9EA3A8]">{req.comment}</p>
                <select value={req.status} onChange={(e) => void patchRequest(req.id, e.target.value)} className="mt-2 h-9 w-full rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-white px-2.5 text-[13px] font-semibold outline-none">
                  {['new', 'reviewing', 'resolved', 'rejected'].map((s) => (
                    <option key={s} value={s}>{studentRequestStatusLabels[s as keyof typeof studentRequestStatusLabels]}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="mb-4">
          <h2 className="mb-2 text-[15px] font-black text-[#111418]">История записей</h2>
          <div className="space-y-2">
            {history.map((entry) => (
              <div key={entry.booking.id} className="rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="shrink-0 text-center">
                    <p className="text-[12px] font-black">{entry.slot ? formatTimeRange(entry.slot) : '—'}</p>
                    <p className="text-[11px] font-semibold text-[#9EA3A8]">{entry.slot ? formatHumanDate(entry.slot.date, false) : '—'}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-black">{entry.instructor ? formatInstructorName(entry.instructor.name) : '—'} · {entry.branch?.name ?? '—'}</p>
                  </div>
                  <StatusBadge status={entry.booking.status} />
                </div>
                {entry.booking.status === 'active' && (
                  <div className="mt-2 flex gap-2 border-t border-[rgba(0,0,0,0.05)] pt-2">
                    <button onClick={() => setCompleteId(entry.booking.id)} className="flex-1 rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-white px-2 py-1.5 text-[12px] font-black text-[#111418]">Проведена</button>
                    <button onClick={() => setCancelId(entry.booking.id)} className="flex-1 rounded-[10px] border border-[rgba(229,83,75,0.15)] bg-white px-2 py-1.5 text-[12px] font-black text-[#E5534B]">Отменить</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog open={Boolean(cancelId)} title="Отменить запись" description="Запись будет отменена." confirmLabel="Отменить" onClose={() => setCancelId(null)} onConfirm={handleCancel} danger />
      <ConfirmDialog open={Boolean(completeId)} title="Отметить проведённой" description="Занятие будет считаться проведённым." confirmLabel="Подтвердить" onClose={() => setCompleteId(null)} onConfirm={handleComplete} />
    </div>
  )
}