import { ArrowLeft01Icon, Calendar03Icon, CancelCircleIcon, Refresh03Icon } from '@hugeicons/core-free-icons'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { StatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { createHugeIcon } from '../../components/ui/HugeIcon'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { FormField } from '../../components/ui/FormField'
import { Input } from '../../components/ui/Input'
import { PageHeader } from '../../components/ui/PageHeader'
import { Section } from '../../components/ui/Section'
import { StatCard } from '../../components/ui/StatCard'
import { useToast } from '../../components/ui/Toast'
import { formatInstructorName, formatPhone } from '../../lib/utils'

const ArrowLeft = createHugeIcon(ArrowLeft01Icon)
const CalendarDays = createHugeIcon(Calendar03Icon)
const RotateCcw = createHugeIcon(Refresh03Icon)
const XCircle = createHugeIcon(CancelCircleIcon)
import { formatHumanDate, formatTimeRange } from '../../utils/date'
import { cancelBooking, completeBooking, getBookingsByStudent } from '../../services/bookingService'
import { getStudentById, getStudentStats } from '../../services/studentService'
import { db } from '../../services/storage'
import { ADMIN_BASE_PATH } from '../../services/accessControl'
import type { StudentDocumentStatus, StudentDocumentType, StudentRequestStatus, TrainingStage } from '../../types'
import { loadStudentDocuments, loadStudentProgress, loadStudentRequests, saveStudentProgress, studentDocumentLabels, studentDocumentStatusLabels, studentRequestStatusLabels, updateStudentDocument, updateStudentRequestStatus } from '../../services/studentProfile'
import { trainingStageLabels } from '../student/studentUtils'

const trainingStageOptions: TrainingStage[] = ['theory', 'practice_ground', 'city', 'exam_prep', 'exam', 'completed']
const documentStatusOptions: StudentDocumentStatus[] = ['missing', 'pending', 'provided', 'approved', 'rejected']
const requestStatusOptions: StudentRequestStatus[] = ['new', 'reviewing', 'resolved', 'rejected']
const examStatusLabels = { not_scheduled: 'Не назначен', scheduled: 'Назначен', passed: 'Сдан', failed: 'Не сдан' }

export function AdminStudentDetail() {
  const { studentId } = useParams<{ studentId: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null)
  const [completeBookingId, setCompleteBookingId] = useState<string | null>(null)
  const [, setVersion] = useState(0)

  const student = studentId ? getStudentById(studentId) : null
  const school = student ? db.schools.byId(student.schoolId) : null
  const stats = student ? getStudentStats(student.id) : null
  const history = useMemo(() => (student ? getBookingsByStudent(student.id) : []), [student])
  const documents = student ? loadStudentDocuments(student.id) : []
  const progress = student ? loadStudentProgress(student.id) : null
  const requests = student ? loadStudentRequests(student.schoolId).filter((request) => request.studentId === student.id) : []
  const instructors = student ? db.instructors.bySchool(student.schoolId).filter((instructor) => instructor.isActive) : []
  const branches = student ? db.branches.bySchool(student.schoolId).filter((branch) => branch.isActive) : []

  function updateStudentPatch(patch: Partial<typeof student>): void {
    if (!student) return
    db.students.upsert({ ...student, ...patch })
    setVersion((value) => value + 1)
    showToast('Данные ученика обновлены.', 'success')
  }

  function updateProgressPatch(patch: Partial<NonNullable<typeof progress>>): void {
    if (!student) return
    saveStudentProgress({
      id: progress?.id ?? `progress-${student.id}`,
      studentId: student.id,
      schoolId: student.schoolId,
      theoryTopicsTotal: progress?.theoryTopicsTotal ?? 0,
      theoryTopicsCompleted: progress?.theoryTopicsCompleted ?? 0,
      drivingHoursTotal: progress?.drivingHoursTotal ?? 56,
      drivingHoursCompleted: progress?.drivingHoursCompleted ?? 0,
      internalExamPassed: progress?.internalExamPassed ?? false,
      internalExamDate: progress?.internalExamDate ?? null,
      internalExamStatus: progress?.internalExamStatus ?? 'not_scheduled',
      gaidExamDate: progress?.gaidExamDate ?? null,
      gibddExamStatus: progress?.gibddExamStatus ?? 'not_scheduled',
      notes: progress?.notes ?? '',
      updatedAt: new Date().toISOString(),
      ...patch,
    })
    setVersion((value) => value + 1)
    showToast('Прогресс ученика обновлён.', 'success')
  }

  function handleCancel(): void {
    if (!cancelBookingId) return
    const result = cancelBooking(cancelBookingId)
    setCancelBookingId(null)
    if (!result.ok) {
      showToast(result.error ?? 'Не удалось отменить запись.', 'error')
      return
    }
    showToast('Запись ученика отменена.', 'success')
  }

  function handleComplete(): void {
    if (!completeBookingId) return
    const result = completeBooking(completeBookingId)
    setCompleteBookingId(null)
    if (!result.ok) {
      showToast(result.error ?? 'Не удалось отметить запись проведённой.', 'error')
      return
    }
    showToast('Запись отмечена проведённой.', 'success')
  }

  if (!student || !stats) {
    return (
      <div className="max-w-7xl p-4 md:p-6">
        <EmptyState
          title="Ученик не найден"
          description="Данные по этому ученику не найдены или ссылка устарела."
          action={
            <Button onClick={() => navigate(`${ADMIN_BASE_PATH}/students`)}>К списку учеников</Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="max-w-7xl p-4 md:p-6">
      <button
        onClick={() => navigate(`${ADMIN_BASE_PATH}/students`)}
        className="mb-4 inline-flex items-center gap-2 text-sm text-[#9EA3A8] transition hover:text-[#111418]"
      >
        <ArrowLeft size={16} />
        Назад к ученикам
      </button>

      <PageHeader
        eyebrow={school?.name}
        title={student.name}
        description={`Телефон: ${formatPhone(student.normalizedPhone)} · Создан: ${new Date(student.createdAt).toLocaleString('ru-RU')}`}
      />

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Всего записей" value={stats.totalBookings} />
        <StatCard label="Будущих активных" value={stats.activeFutureBookings} icon={<CalendarDays size={18} />} />
        <StatCard label="Проведено" value={stats.completedBookings} />
        <StatCard label="Отменено" value={stats.cancelledBookings} icon={<XCircle size={18} />} />
      </div>

      <div className="mt-8 space-y-6">
        <Section title="Профиль ученика" description="Основные данные и лимиты по бронированию.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-black/10 bg-[#F4F5F6] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[#9EA3A8]">Телефон</p>
              <p className="mt-1 text-sm font-semibold text-[#111418]">{formatPhone(student.normalizedPhone)}</p>
            </div>
            <div className="rounded-2xl border border-black/10 bg-[#F4F5F6] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[#9EA3A8]">Normalized phone</p>
              <p className="mt-1 text-sm font-semibold text-[#111418]">{student.normalizedPhone}</p>
            </div>
            <div className="rounded-2xl border border-black/10 bg-[#F4F5F6] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[#9EA3A8]">Будущих активных</p>
              <p className="mt-1 text-sm font-semibold text-[#111418]">{stats.activeFutureBookings}</p>
            </div>
            <div className="rounded-2xl border border-black/10 bg-[#F4F5F6] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[#9EA3A8]">Отменял</p>
              <p className="mt-1 text-sm font-semibold text-[#111418]">{stats.cancellationsCount} раз</p>
            </div>
          </div>
        </Section>

        <Section title="Обучение" description="Назначения и этап обучения видны ученику в кабинете.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Input label="Группа" value={student.groupName ?? ''} placeholder="Пока не назначено" onChange={(event) => updateStudentPatch({ groupName: event.target.value.trim() || undefined })} />
            <Input label="Категории" value={student.categoryCodes?.join(', ') ?? ''} placeholder="B" onChange={(event) => updateStudentPatch({ categoryCodes: event.target.value.split(',').map((item) => item.trim().toUpperCase()).filter(Boolean) })} />
            <FormField label="Этап обучения">
              <select value={student.trainingStage ?? ''} onChange={(event) => updateStudentPatch({ trainingStage: (event.target.value || undefined) as TrainingStage | undefined })} className="h-11 w-full rounded-2xl border border-black/10 bg-white px-3.5 text-[15px] text-[#111418] outline-none">
                <option value="">Пока не назначено</option>
                {trainingStageOptions.map((stage) => <option key={stage} value={stage}>{trainingStageLabels[stage]}</option>)}
              </select>
            </FormField>
            <FormField label="Инструктор">
              <select value={student.assignedInstructorId ?? ''} onChange={(event) => updateStudentPatch({ assignedInstructorId: event.target.value || undefined })} className="h-11 w-full rounded-2xl border border-black/10 bg-white px-3.5 text-[15px] text-[#111418] outline-none">
                <option value="">Пока не назначен</option>
                {instructors.map((instructor) => <option key={instructor.id} value={instructor.id}>{formatInstructorName(instructor.name)}</option>)}
              </select>
            </FormField>
            <FormField label="Филиал">
              <select value={student.assignedBranchId ?? ''} onChange={(event) => updateStudentPatch({ assignedBranchId: event.target.value || undefined })} className="h-11 w-full rounded-2xl border border-black/10 bg-white px-3.5 text-[15px] text-[#111418] outline-none">
                <option value="">Пока не назначен</option>
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </FormField>
            <Input label="Начало обучения" type="date" value={student.trainingStartDate ?? ''} onChange={(event) => updateStudentPatch({ trainingStartDate: event.target.value || undefined })} />
            <Input label="Начало вождения" type="date" value={student.drivingStartDate ?? ''} onChange={(event) => updateStudentPatch({ drivingStartDate: event.target.value || undefined })} />
          </div>
        </Section>

        <Section title="Прогресс" description="Минимальные учебные показатели без фейковых процентов готовности.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Input label="Тем теории всего" type="number" value={String(progress?.theoryTopicsTotal ?? 0)} onChange={(event) => updateProgressPatch({ theoryTopicsTotal: Number(event.target.value) || 0 })} />
            <Input label="Тем теории закрыто" type="number" value={String(progress?.theoryTopicsCompleted ?? 0)} onChange={(event) => updateProgressPatch({ theoryTopicsCompleted: Number(event.target.value) || 0 })} />
            <Input label="Часов вождения всего" type="number" value={String(progress?.drivingHoursTotal ?? 56)} onChange={(event) => updateProgressPatch({ drivingHoursTotal: Number(event.target.value) || 0 })} />
            <Input label="Часов вождения пройдено" type="number" value={String(progress?.drivingHoursCompleted ?? 0)} onChange={(event) => updateProgressPatch({ drivingHoursCompleted: Number(event.target.value) || 0 })} />
            <FormField label="Внутренний экзамен">
              <select value={progress?.internalExamStatus ?? (progress?.internalExamPassed ? 'passed' : 'not_scheduled')} onChange={(event) => updateProgressPatch({ internalExamStatus: event.target.value as NonNullable<typeof progress>['internalExamStatus'], internalExamPassed: event.target.value === 'passed' })} className="h-11 w-full rounded-2xl border border-black/10 bg-white px-3.5 text-[15px] text-[#111418] outline-none">
                {Object.entries(examStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </FormField>
            <Input label="Дата внутреннего экзамена" type="date" value={progress?.internalExamDate ?? ''} onChange={(event) => updateProgressPatch({ internalExamDate: event.target.value || null })} />
            <FormField label="Экзамен ГИБДД">
              <select value={progress?.gibddExamStatus ?? 'not_scheduled'} onChange={(event) => updateProgressPatch({ gibddExamStatus: event.target.value as NonNullable<typeof progress>['gibddExamStatus'] })} className="h-11 w-full rounded-2xl border border-black/10 bg-white px-3.5 text-[15px] text-[#111418] outline-none">
                {Object.entries(examStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </FormField>
            <Input label="Дата экзамена ГИБДД" type="date" value={progress?.gaidExamDate ?? ''} onChange={(event) => updateProgressPatch({ gaidExamDate: event.target.value || null })} />
            <div className="md:col-span-2 xl:col-span-4">
              <Input label="Заметки администратора" value={progress?.notes ?? ''} onChange={(event) => updateProgressPatch({ notes: event.target.value })} placeholder="Необязательно" />
            </div>
          </div>
        </Section>

        <Section title="Запросы ученика" description="Запросы переноса/отмены без автоматического изменения записи.">
          {requests.length === 0 ? (
            <EmptyState title="Запросов нет" description="Когда ученик попросит перенос или отмену, запрос появится здесь." />
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <article key={request.id} className="rounded-2xl border border-black/10 bg-white p-4">
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px] md:items-start">
                    <div>
                      <p className="text-sm font-bold text-[#111418]">{request.type === 'reschedule' ? 'Запрос переноса' : 'Запрос отмены'}</p>
                      <p className="mt-1 text-sm font-semibold text-[#6F747A]">Причина: {request.reason}</p>
                      {request.preferredTime ? <p className="mt-1 text-sm text-[#6F747A]">Желаемое время: {request.preferredTime}</p> : null}
                      {request.comment ? <p className="mt-1 text-sm text-[#6F747A]">Комментарий: {request.comment}</p> : null}
                    </div>
                    <FormField label="Статус">
                      <select value={request.status} onChange={(event) => { updateStudentRequestStatus(student.schoolId, request.id, event.target.value as StudentRequestStatus); setVersion((value) => value + 1); showToast('Статус запроса обновлён.', 'success') }} className="h-11 w-full rounded-2xl border border-black/10 bg-white px-3.5 text-[15px] text-[#111418] outline-none">
                        {requestStatusOptions.map((status) => <option key={status} value={status}>{studentRequestStatusLabels[status]}</option>)}
                      </select>
                    </FormField>
                  </div>
                </article>
              ))}
            </div>
          )}
        </Section>

        <Section title="Документы" description="Минимальный checklist без фейковых статусов.">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {documents.map((document) => (
              <FormField key={document.type} label={studentDocumentLabels[document.type]}>
                <select value={document.status} onChange={(event) => { updateStudentDocument(student.id, document.type as StudentDocumentType, event.target.value as StudentDocumentStatus); setVersion((value) => value + 1); showToast('Статус документа обновлён.', 'success') }} className="h-11 w-full rounded-2xl border border-black/10 bg-white px-3.5 text-[15px] text-[#111418] outline-none">
                  {documentStatusOptions.map((status) => <option key={status} value={status}>{studentDocumentStatusLabels[status]}</option>)}
                </select>
              </FormField>
            ))}
          </div>
        </Section>

        <Section title="История записей" description="Активные, проведённые и отменённые занятия по ученику.">
          {history.length === 0 ? (
            <EmptyState title="У ученика ещё нет записей" description="Новая запись появится здесь автоматически после бронирования." />
          ) : (
            <div className="space-y-4">
              {history.map((entry) => (
                <div key={entry.booking.id} className="rounded-2xl border border-black/10 bg-white p-4 shadow-[0_20px_60px_rgba(15,20,25,0.08)]">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-[#9EA3A8]">Дата и время</p>
                        <p className="mt-1 text-sm font-semibold text-[#111418]">
                          {entry.slot ? `${formatHumanDate(entry.slot.date, false)} · ${formatTimeRange(entry.slot)}` : 'Не найдено'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-[#9EA3A8]">Филиал</p>
                        <p className="mt-1 text-sm font-semibold text-[#111418]">{entry.branch?.name ?? 'Не найдено'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-[#9EA3A8]">Инструктор</p>
                        <p className="mt-1 text-sm font-semibold text-[#111418]">{entry.instructor ? formatInstructorName(entry.instructor.name) : 'Не найдено'}</p>
                        <p className="text-sm text-[#9EA3A8]">{entry.instructor?.car ?? 'Без машины'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-[#9EA3A8]">Статус</p>
                        <div className="mt-1">
                          <StatusBadge status={entry.booking.status} />
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[340px]">
                      <Button variant="secondary" size="sm" onClick={() => navigate(`/booking/${entry.booking.id}`)}>
                        Открыть запись
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={entry.booking.status !== 'active'}
                        onClick={() => setCompleteBookingId(entry.booking.id)}
                      >
                        Проведена
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={entry.booking.status !== 'active'}
                        onClick={() => setCancelBookingId(entry.booking.id)}
                      >
                        Отменить
                      </Button>
                    </div>
                  </div>

                  {entry.booking.status === 'active' ? (
                    <div className="mt-3">
                      <Link
                        to={`${ADMIN_BASE_PATH}/bookings`}
                        className="inline-flex items-center gap-2 text-sm text-[#C97F10] transition hover:text-[#C97F10]"
                      >
                        <RotateCcw size={15} />
                        Перейти к переносу в разделе записей
                      </Link>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      <ConfirmDialog
        open={Boolean(cancelBookingId)}
        title="Отменить запись"
        description="Запись ученика перейдёт в статус «Отменена», а слот станет свободным."
        confirmLabel="Отменить запись"
        onClose={() => setCancelBookingId(null)}
        onConfirm={handleCancel}
        danger
      />

      <ConfirmDialog
        open={Boolean(completeBookingId)}
        title="Отметить проведённой"
        description="Запись ученика перейдёт в статус «Проведена»."
        confirmLabel="Отметить проведённой"
        onClose={() => setCompleteBookingId(null)}
        onConfirm={handleComplete}
      />
    </div>
  )
}
