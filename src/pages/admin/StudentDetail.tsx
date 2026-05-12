import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { db } from '../../services/storage'
import { adminPayments, adminDocuments, adminInternalExams, adminGIBDDExams, studentProgress, getDebtForStudent, createAuditEntry } from '../../services/adminStorage'
import { ADMIN_BASE_PATH } from '../../services/accessControl'
import { Modal } from '../../components/ui/Modal'
import type { Document, DocumentStatus, DocumentType, Payment, PaymentMethod, PaymentStatus, Student, TrainingStage } from '../../types'

const STAGE_LABELS: Record<string, string> = {
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

const DOC_LABELS: Record<string, string> = {
  contract: 'Договор',
  passport: 'Паспорт',
  medical_certificate: 'Медсправка',
  consent_data_processing: 'Согласие на обработку данных',
  application: 'Заявление',
  parent_consent: 'Согласие родителей',
  snils: 'СНИЛС',
  state_fee_receipt: 'Квитанция госпошлины',
  photo: 'Фото',
  internal_certificate: 'Внутренний сертификат',
  gibdd_exam_doc: 'Документы для экзамена',
}

const DOC_STATUS_COLORS: Record<string, string> = {
  missing: 'bg-red-50 text-red-500',
  pending: 'bg-amber-50 text-amber-600',
  uploaded: 'bg-blue-50 text-blue-600',
  verified: 'bg-green-50 text-green-600',
  rejected: 'bg-red-50 text-red-500',
  expired: 'bg-red-100 text-red-600',
  not_required: 'bg-gray-100 text-gray-400',
}

export function AdminStudentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const school = db.schools.all()[0]
  const [showAddPayment, setShowAddPayment] = useState(false)
  const [showAddDocument, setShowAddDocument] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  const data = useMemo(() => {
    if (!school || !id) return null
    const student = db.students.byId(id)
    if (!student) return null
    const instructor = db.instructors.byId(student.assignedInstructorId ?? '')
    const branch = db.branches.byId(student.assignedBranchId ?? '')
    const bookings = db.bookings.bySchool(school.id).filter((b) => b.studentId === student.id)
    const payments = adminPayments.byStudent(student.id)
    const documents = adminDocuments.byStudent(student.id)
    const internalExams = adminInternalExams.byStudent(student.id)
    const gibddExams = adminGIBDDExams.byStudent(student.id)
    const progress = studentProgress.get(student.id)
    const debt = getDebtForStudent(student.id)
    const completedHours = progress?.confirmedHours ?? 0

    return { student, instructor, branch, bookings, payments, documents, internalExams, gibddExams, progress, debt, completedHours }
  }, [school?.id, id])

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-400">Ученик не найден</p>
      </div>
    )
  }

  const { student, instructor, branch, bookings, payments, documents, internalExams, gibddExams, progress, debt, completedHours } = data
  const stage = student.trainingStage ?? 'new_request'

  const totalHours = progress?.drivingHoursTotal ?? 56
  const hoursPercent = Math.min((completedHours / totalHours) * 100, 100)

  const canGoToGIBDD =
    progress?.internalExamPassed === true &&
    completedHours >= totalHours &&
    debt === 0 &&
    !documents.some((d) => d.type === 'medical_certificate' && d.status !== 'verified') &&
    !documents.some((d) => d.type === 'contract' && d.status !== 'verified')

  const currentNote = note ?? student.notes ?? ''

  const saveNote = () => {
    db.students.upsert({ ...student, notes: currentNote })
    createAuditEntry(school.id, 'admin', 'Администратор', 'student_note', 'student', student.id, `Обновлена заметка ученика ${student.name}`)
  }

  return (
    <div className="overflow-y-auto">
      <div className="border-b border-gray-100 bg-white px-4 py-4 md:px-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`${ADMIN_BASE_PATH}/students`)} className="rounded-lg p-2 hover:bg-gray-100">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="#6F747A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-[22px] font-black text-gray-900">{student.name}</h1>
          </div>
          <button onClick={() => setShowEdit(true)} className="rounded-xl border border-gray-200 px-4 py-2 text-[13px] font-bold text-gray-600 transition hover:bg-gray-50">
            Редактировать
          </button>
        </div>
      </div>

      <div className="grid gap-4 p-4 md:grid-cols-[1fr_360px] md:p-6 lg:p-8">
        {/* Left column */}
        <div className="space-y-4">
          {/* Progress */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <h2 className="mb-4 text-[16px] font-bold text-gray-900">Прогресс обучения</h2>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-gray-400">Практика</span>
              <span className="text-[15px] font-black text-gray-900">{completedHours} / {totalHours} часов</span>
            </div>
            <div className="mb-4 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{ width: `${hoursPercent}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Проведено', value: bookings.filter((b) => b.status === 'completed').length },
                { label: 'Активных', value: bookings.filter((b) => b.status === 'active').length },
                { label: 'Отменено', value: bookings.filter((b) => b.status === 'cancelled').length },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-gray-50 p-3 text-center">
                  <p className="text-[20px] font-black text-gray-900">{item.value}</p>
                  <p className="text-[11px] font-semibold text-gray-400">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Documents */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[16px] font-bold text-gray-900">Документы</h2>
              <button onClick={() => setShowAddDocument(true)} className="text-[13px] font-bold text-blue-600">
                + Добавить
              </button>
            </div>
            <div className="space-y-2">
              {documents.length === 0 ? (
                <p className="py-4 text-center text-[13px] font-semibold text-gray-400">Документов пока нет</p>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                    <div>
                      <p className="font-semibold text-gray-900">{DOC_LABELS[doc.type] ?? doc.type}</p>
                      {doc.uploadedAt && (
                        <p className="text-[12px] font-semibold text-gray-400">
                          Загружено {format(new Date(doc.uploadedAt), 'd MMM yyyy', { locale: ru })}
                        </p>
                      )}
                    </div>
                    <span className={`rounded-lg px-2.5 py-1 text-[12px] font-bold ${DOC_STATUS_COLORS[doc.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {doc.status === 'missing' ? 'Не загружен' :
                       doc.status === 'pending' ? 'На проверке' :
                       doc.status === 'uploaded' ? 'Загружен' :
                       doc.status === 'verified' ? 'Проверен' :
                       doc.status === 'rejected' ? 'Отклонён' :
                       doc.status === 'expired' ? 'Просрочен' : doc.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Booking history */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <h2 className="mb-4 text-[16px] font-bold text-gray-900">История занятий</h2>
            {bookings.length === 0 ? (
              <p className="py-4 text-center text-[13px] font-semibold text-gray-400">Занятий пока нет</p>
            ) : (
              <div className="space-y-2">
                {bookings.slice(0, 10).map((booking) => {
                  const slot = db.slots.byId(booking.slotId)
                  const instr = db.instructors.byId(booking.instructorId)
                  return (
                    <div key={booking.id} className="flex items-center gap-3 rounded-xl border border-gray-50 bg-gray-50/50 px-4 py-3">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">
                          {slot ? format(new Date(`${slot.date}T${slot.time}`), 'd MMM, HH:mm', { locale: ru }) : '—'}
                        </p>
                        <p className="text-[12px] font-semibold text-gray-400">{instr?.name ?? '—'}</p>
                      </div>
                      <span className={`rounded-lg px-2.5 py-1 text-[12px] font-bold ${
                        booking.status === 'active' ? 'bg-green-50 text-green-600' :
                        booking.status === 'completed' ? 'bg-gray-100 text-gray-500' :
                        booking.status === 'no_show' ? 'bg-red-50 text-red-500' :
                        'bg-gray-100 text-gray-400'
                      }`}>
                        {booking.status === 'active' ? 'Активна' :
                         booking.status === 'completed' ? 'Проведена' :
                         booking.status === 'no_show' ? 'Неявка' : 'Отменена'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Exams */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <h2 className="mb-4 text-[16px] font-bold text-gray-900">Экзамены</h2>

            <div className="mb-4">
              <p className="mb-2 text-[13px] font-bold text-gray-600">Внутренний экзамен</p>
              {internalExams.length === 0 ? (
                <p className="text-[13px] font-semibold text-gray-400">Не назначен</p>
              ) : (
                internalExams.map((exam) => (
                  <div key={exam.id} className="flex items-center gap-3 rounded-xl border border-gray-50 bg-gray-50/50 px-4 py-3">
                    <span className={`rounded-lg px-2.5 py-1 text-[12px] font-bold ${
                      exam.status === 'passed' ? 'bg-green-50 text-green-600' :
                      exam.status === 'failed' ? 'bg-red-50 text-red-500' :
                      exam.status === 'scheduled' ? 'bg-blue-50 text-blue-600' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {exam.status === 'passed' ? 'Сдан' :
                       exam.status === 'failed' ? 'Не сдан' :
                       exam.status === 'scheduled' ? 'Назначен' :
                       exam.status === 'ready' ? 'Готов' : 'Не готов'}
                    </span>
                    {exam.scheduledDate && (
                      <span className="text-[13px] font-semibold text-gray-500">
                        {format(new Date(exam.scheduledDate), 'd MMM', { locale: ru })}
                      </span>
                    )}
                    <span className="ml-auto text-[12px] font-semibold text-gray-400">
                      Попытка {exam.attemptNumber}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div>
              <p className="mb-2 text-[13px] font-bold text-gray-600">Экзамен ГИБДД</p>
              {gibddExams.length === 0 ? (
                <p className="text-[13px] font-semibold text-gray-400">Не назначен</p>
              ) : (
                gibddExams.map((exam) => (
                  <div key={exam.id} className="flex items-center gap-3 rounded-xl border border-gray-50 bg-gray-50/50 px-4 py-3">
                    <span className={`rounded-lg px-2.5 py-1 text-[12px] font-bold ${
                      exam.status === 'passed' ? 'bg-green-50 text-green-600' :
                      exam.status === 'failed' ? 'bg-red-50 text-red-500' :
                      exam.status === 'scheduled' ? 'bg-blue-50 text-blue-600' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {exam.status === 'passed' ? 'Сдан' :
                       exam.status === 'failed' ? 'Не сдан' :
                       exam.status === 'scheduled' ? 'Назначен' :
                       exam.status === 'ready' ? 'Готов' : 'Не готов'}
                    </span>
                    {exam.examDate && (
                      <span className="text-[13px] font-semibold text-gray-500">
                        {format(new Date(exam.examDate), 'd MMM yyyy', { locale: ru })}
                      </span>
                    )}
                    <span className="ml-auto text-[12px] font-semibold text-gray-400">
                      Попытка {exam.attemptNumber}
                    </span>
                  </div>
                ))
              )}

              {canGoToGIBDD && (
                <div className="mt-3 rounded-xl border border-green-200 bg-green-50 p-4 text-center">
                  <p className="font-bold text-green-700">✓ Ученик готов к экзамену ГИБДД</p>
                  <button
                    onClick={() => adminGIBDDExams.upsert({ id: `gibdd_${Date.now()}`, schoolId: school.id, studentId: student.id, attemptNumber: gibddExams.length + 1, status: 'scheduled', createdAt: new Date().toISOString() })}
                    className="mt-2 rounded-lg bg-green-600 px-4 py-2 text-[13px] font-bold text-white"
                  >
                    Записать на экзамен
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column — info card */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <h2 className="mb-4 text-[16px] font-bold text-gray-900">Карточка ученика</h2>

            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-[18px] font-black text-gray-600">
                {student.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-gray-900">{student.name}</p>
                <p className="text-[13px] font-semibold text-gray-400">{student.phone}</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { label: 'Статус', value: STAGE_LABELS[stage] ?? stage },
                { label: 'Категория', value: student.categoryCodes?.[0] ?? '—' },
                { label: 'Инструктор', value: instructor?.name ?? 'Не назначен' },
                { label: 'Филиал', value: branch?.name ?? '—' },
                { label: 'Группа', value: student.groupName ?? '—' },
                { label: 'Начало обучения', value: student.trainingStartDate ? format(new Date(student.trainingStartDate), 'd MMM yyyy', { locale: ru }) : '—' },
                { label: 'Email', value: student.email || '—' },
              ].map((row) => (
                <div key={row.label} className="flex items-start justify-between gap-2">
                  <span className="text-[13px] font-semibold text-gray-400">{row.label}</span>
                  <span className="text-right text-[13px] font-semibold text-gray-900">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Debt */}
          <div className={`rounded-2xl border p-5 ${debt > 0 ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-white'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-semibold text-gray-400">Долг</p>
                <p className={`text-[24px] font-black ${debt > 0 ? 'text-red-500' : 'text-green-600'}`}>
                  {debt > 0 ? `${debt.toLocaleString('ru-RU')} ₽` : 'Нет долга'}
                </p>
              </div>
              <button
                onClick={() => setShowAddPayment(true)}
                className={`rounded-xl px-4 py-2 text-[13px] font-bold ${debt > 0 ? 'bg-red-500 text-white' : 'bg-green-600 text-white'}`}
              >
                + Оплата
              </button>
            </div>

            {payments.length > 0 && (
              <div className="mt-3 space-y-2">
                {payments.slice(0, 3).map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg bg-white/60 px-3 py-2">
                    <span className="text-[12px] font-semibold text-gray-600">{p.description}</span>
                    <span className={`text-[12px] font-bold ${p.status === 'paid' ? 'text-green-600' : 'text-red-500'}`}>
                      {p.paidAmount.toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <h3 className="mb-3 text-[14px] font-bold text-gray-900">Заметки</h3>
            <textarea
              value={currentNote}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Добавьте заметку..."
              rows={3}
              className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-3 text-[13px] font-semibold text-gray-900 placeholder-gray-300 focus:border-gray-900 focus:bg-white focus:outline-none"
            />
            <button onClick={saveNote} className="mt-2 w-full rounded-xl border border-gray-200 py-2 text-[13px] font-bold text-gray-600 transition hover:bg-gray-50">
              Сохранить заметку
            </button>
          </div>
        </div>
      </div>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Редактировать ученика" size="md">
        <StudentEditForm schoolId={school.id} student={student} onClose={() => setShowEdit(false)} />
      </Modal>

      <Modal open={showAddPayment} onClose={() => setShowAddPayment(false)} title="Добавить оплату" size="md">
        <PaymentForm schoolId={school.id} student={student} onClose={() => setShowAddPayment(false)} />
      </Modal>

      <Modal open={showAddDocument} onClose={() => setShowAddDocument(false)} title="Добавить документ" size="md">
        <DocumentForm schoolId={school.id} student={student} onClose={() => setShowAddDocument(false)} />
      </Modal>
    </div>
  )
}

function StudentEditForm({ schoolId, student, onClose }: { schoolId: string; student: Student; onClose: () => void }) {
  const branches = db.branches.bySchool(schoolId)
  const instructors = db.instructors.bySchool(schoolId)
  const [name, setName] = useState(student.name)
  const [phone, setPhone] = useState(student.phone)
  const [email, setEmail] = useState(student.email)
  const [stage, setStage] = useState<TrainingStage>(student.trainingStage ?? 'new_request')
  const [branchId, setBranchId] = useState(student.assignedBranchId ?? branches[0]?.id ?? '')
  const [instructorId, setInstructorId] = useState(student.assignedInstructorId ?? '')
  const [category, setCategory] = useState(student.categoryCodes?.[0] ?? 'B')

  const handleSubmit = () => {
    if (!name.trim() || !phone.trim()) return
    db.students.upsert({
      ...student,
      name: name.trim(),
      phone: phone.trim(),
      normalizedPhone: phone.replace(/\D/g, ''),
      email: email.trim(),
      trainingStage: stage,
      assignedBranchId: branchId || undefined,
      assignedInstructorId: instructorId || undefined,
      categoryCodes: category ? [category] : [],
    })
    onClose()
  }

  return (
    <div className="space-y-4 p-5">
      <input value={name} onChange={(event) => setName(event.target.value)} className="v-admin-input w-full" placeholder="ФИО" />
      <div className="grid gap-3 sm:grid-cols-2">
        <input value={phone} onChange={(event) => setPhone(event.target.value)} className="v-admin-input w-full" placeholder="Телефон" />
        <input value={email} onChange={(event) => setEmail(event.target.value)} className="v-admin-input w-full" placeholder="Email" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <select value={stage} onChange={(event) => setStage(event.target.value as TrainingStage)} className="v-admin-input w-full">
          {Object.keys(STAGE_LABELS).map((key) => <option key={key} value={key}>{STAGE_LABELS[key]}</option>)}
        </select>
        <input value={category} onChange={(event) => setCategory(event.target.value)} className="v-admin-input w-full" placeholder="Категория" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <select value={branchId} onChange={(event) => setBranchId(event.target.value)} className="v-admin-input w-full">
          <option value="">Без филиала</option>
          {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
        </select>
        <select value={instructorId} onChange={(event) => setInstructorId(event.target.value)} className="v-admin-input w-full">
          <option value="">Без инструктора</option>
          {instructors.map((instructor) => <option key={instructor.id} value={instructor.id}>{instructor.name}</option>)}
        </select>
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={onClose} className="v-admin-button-secondary flex-1">Отмена</button>
        <button onClick={handleSubmit} className="v-admin-button flex-1">Сохранить</button>
      </div>
    </div>
  )
}

function PaymentForm({ schoolId, student, onClose }: { schoolId: string; student: Student; onClose: () => void }) {
  const [amount, setAmount] = useState('5000')
  const [paidAmount, setPaidAmount] = useState('5000')
  const [description, setDescription] = useState('Оплата обучения')
  const [status, setStatus] = useState<PaymentStatus>('paid')
  const [method, setMethod] = useState<PaymentMethod>('card')

  const handleSubmit = () => {
    const total = Number(amount)
    const paid = Number(paidAmount)
    if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(paid)) return
    const payment: Payment = {
      id: `pay_${Date.now()}`,
      schoolId,
      studentId: student.id,
      amount: total,
      paidAmount: paid,
      remainingAmount: Math.max(total - paid, 0),
      status,
      method,
      description,
      createdById: 'admin',
      createdAt: new Date().toISOString(),
    }
    adminPayments.upsert(payment)
    createAuditEntry(schoolId, 'admin', 'Администратор', 'payment_added', 'payment', payment.id, `Добавлена оплата ${student.name}: ${paid} ₽`)
    onClose()
  }

  return (
    <div className="space-y-4 p-5">
      <input value={description} onChange={(event) => setDescription(event.target.value)} className="v-admin-input w-full" placeholder="Назначение" />
      <div className="grid gap-3 sm:grid-cols-2">
        <input type="number" min="0" value={amount} onChange={(event) => setAmount(event.target.value)} className="v-admin-input w-full" placeholder="Сумма" />
        <input type="number" min="0" value={paidAmount} onChange={(event) => setPaidAmount(event.target.value)} className="v-admin-input w-full" placeholder="Оплачено" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <select value={status} onChange={(event) => setStatus(event.target.value as PaymentStatus)} className="v-admin-input w-full">
          <option value="paid">Оплачено</option>
          <option value="partial">Частично</option>
          <option value="unpaid">Не оплачено</option>
          <option value="overdue">Просрочено</option>
        </select>
        <select value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)} className="v-admin-input w-full">
          <option value="card">Карта</option>
          <option value="cash">Наличные</option>
          <option value="transfer">Перевод</option>
          <option value="receipt">Квитанция</option>
        </select>
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={onClose} className="v-admin-button-secondary flex-1">Отмена</button>
        <button onClick={handleSubmit} className="v-admin-button flex-1">Сохранить</button>
      </div>
    </div>
  )
}

function DocumentForm({ schoolId, student, onClose }: { schoolId: string; student: Student; onClose: () => void }) {
  const [type, setType] = useState<DocumentType>('contract')
  const [status, setStatus] = useState<DocumentStatus>('uploaded')

  const handleSubmit = () => {
    const document: Document = {
      id: `doc_${Date.now()}`,
      schoolId,
      studentId: student.id,
      type,
      status,
      uploadedAt: status === 'uploaded' || status === 'verified' ? new Date().toISOString() : undefined,
      verifiedAt: status === 'verified' ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString(),
    }
    adminDocuments.upsert(document)
    createAuditEntry(schoolId, 'admin', 'Администратор', status === 'verified' ? 'document_verified' : 'document_uploaded', 'document', document.id, `Добавлен документ ${student.name}`)
    onClose()
  }

  return (
    <div className="space-y-4 p-5">
      <select value={type} onChange={(event) => setType(event.target.value as DocumentType)} className="v-admin-input w-full">
        {Object.entries(DOC_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select>
      <select value={status} onChange={(event) => setStatus(event.target.value as DocumentStatus)} className="v-admin-input w-full">
        <option value="uploaded">Загружен</option>
        <option value="verified">Проверен</option>
        <option value="pending">На проверке</option>
        <option value="missing">Не загружен</option>
        <option value="rejected">Отклонен</option>
      </select>
      <div className="flex gap-2 pt-2">
        <button onClick={onClose} className="v-admin-button-secondary flex-1">Отмена</button>
        <button onClick={handleSubmit} className="v-admin-button flex-1">Сохранить</button>
      </div>
    </div>
  )
}
