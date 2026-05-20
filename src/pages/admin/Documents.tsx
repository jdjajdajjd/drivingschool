import { useMemo, useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/Toast'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { db } from '../../services/storage'
import { adminDocuments, adminSettings, createCurrentStaffAuditEntry, getDebtForStudent, studentProgress } from '../../services/adminStorage'
import { assertAdminPermission } from '../../services/adminAccess'
import { getAccessSecret, getAdminBasePathForLocation, getWorkspaceStaffContext } from '../../services/accessControl'
import type { Document, DocumentStatus, DocumentType, Student } from '../../types'
import { imageFileToDataUrl } from '../student/studentUtils'
import { filterStudents } from '../../services/staffScope'
import { openStudentPrintPacket } from '../../services/documentTemplates'

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

const REQUIRED_FOR_EXAM: DocumentType[] = ['contract', 'medical_certificate', 'gibdd_exam_doc']

function isBlockingStatus(status: DocumentStatus) {
  return status === 'missing' || status === 'rejected' || status === 'expired' || status === 'required'
}


type DocumentUploadFormProps = {
  schoolId: string
  students: Student[]
  onSaved: () => void
  onClose: () => void
}

function DocumentUploadForm({ schoolId, students, onSaved, onClose }: DocumentUploadFormProps) {
  const [studentId, setStudentId] = useState(students[0]?.id ?? '')
  const [type, setType] = useState<DocumentType>('contract')
  const [status, setStatus] = useState<DocumentStatus>('uploaded')
  const [expiresAt, setExpiresAt] = useState('')
  const [notes, setNotes] = useState('')
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [scanning, setScanning] = useState(false)

  const selectedStudent = students.find((student) => student.id === studentId) ?? null

  async function scanFile(file?: File): Promise<void> {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setFileName(file.name)
      setNotes((current) => current || 'Файл загружен без распознавания: поддерживается ручная проверка.')
      return
    }
    try {
      setScanning(true)
      setError('')
      const imageDataUrl = await imageFileToDataUrl(file)
      const response = await fetch('/api/document-scan', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-vroom-staff-token': getAccessSecret('admin'),
          'x-vroom-staff-role': getWorkspaceStaffContext().role,
        },
        body: JSON.stringify({ imageDataUrl, fileName: file.name, studentName: selectedStudent?.name ?? '' }),
      })
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? 'Не удалось распознать документ.')
      const data = await response.json() as { scan?: { documentType?: DocumentType; status?: DocumentStatus; expiresAt?: string; notes?: string; summary?: string; confidence?: number } }
      const scan = data.scan
      if (scan?.documentType) setType(scan.documentType)
      if (scan?.status) setStatus(scan.status)
      if (scan?.expiresAt) setExpiresAt(scan.expiresAt)
      setNotes([scan?.summary, scan?.notes, typeof scan?.confidence === 'number' ? `Уверенность: ${Math.round(scan.confidence * 100)}%` : ''].filter(Boolean).join('\n'))
      setFileName(file.name)
    } catch (error) {
      setFileName(file.name)
      setError(error instanceof Error ? error.message : 'Не удалось распознать документ.')
    } finally {
      setScanning(false)
    }
  }

  async function save(): Promise<void> {
    const access = assertAdminPermission('documents.manage')
    if (!access.ok) { setError(access.error ?? 'Недостаточно прав.'); return }
    if (!schoolId || !selectedStudent) { setError('Выберите ученика.'); return }
    if (!fileName && (status === 'uploaded' || status === 'verified')) { setError('Загрузите файл с устройства или поставьте другой статус.'); return }
    const document: Document = {
      id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      schoolId,
      studentId: selectedStudent.id,
      type,
      status,
      fileName: fileName || undefined,
      uploadedAt: status === 'uploaded' || status === 'verified' ? new Date().toISOString() : undefined,
      verifiedAt: status === 'verified' ? new Date().toISOString() : undefined,
      expiresAt: expiresAt || undefined,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    }
    try {
      setPending(true)
      setError('')
      await adminDocuments.upsertConfirmed(document)
      createCurrentStaffAuditEntry(schoolId, status === 'verified' ? 'document_verified' : 'document_uploaded', 'document', document.id, `Документ ${DOC_LABELS[type] ?? type}: ${selectedStudent.name}`)
      onSaved()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Не удалось сохранить документ.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-4 p-5">
      {students.length === 0 ? (
        <div className="rounded-[16px] border border-[#F5D0D0] bg-[#FFF6F6] px-4 py-3 text-[13px] font-bold text-[#B42318]">Сначала добавьте ученика, потом загружайте документы.</div>
      ) : null}
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.08em] text-[#667085]">Ученик</span>
        <select value={studentId} onChange={(event) => setStudentId(event.target.value)} className="v-admin-input w-full">
          {students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
        </select>
      </label>
      <label className="block rounded-2xl border border-dashed border-[#C9D6E2] bg-[#F8FAFC] p-4 text-center">
        <span className="block text-[14px] font-black text-[#111827]">Файл с устройства</span>
        <span className="mt-1 block text-[12px] font-semibold text-[#667085]">Фото распознаётся нейронкой, PDF/файл можно сохранить для ручной проверки.</span>
        <input type="file" accept="image/*,.pdf" className="mt-3 block w-full text-[13px] font-semibold text-[#667085] file:mr-3 file:rounded-xl file:border-0 file:bg-[#111827] file:px-3 file:py-2 file:text-[13px] file:font-bold file:text-white" disabled={pending || scanning || students.length === 0} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; void scanFile(file) }} />
        {fileName ? <span className="mt-2 block break-all text-[12px] font-black text-[#111827]">{fileName}</span> : null}
        {scanning ? <span className="mt-2 block text-[12px] font-black text-[#315A7C]">Распознаём...</span> : null}
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <select value={type} onChange={(event) => setType(event.target.value as DocumentType)} className="v-admin-input w-full">{Object.entries(DOC_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
        <select value={status} onChange={(event) => setStatus(event.target.value as DocumentStatus)} className="v-admin-input w-full"><option value="uploaded">Загружен</option><option value="verified">Проверен</option><option value="pending">На проверке</option><option value="missing">Не загружен</option><option value="rejected">Отклонён</option><option value="expired">Просрочен</option></select>
      </div>
      <input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className="v-admin-input w-full" />
      <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Заметки по документу" rows={3} className="v-admin-input min-h-[92px] w-full resize-none py-3" />
      {error ? <p className="rounded-[10px] bg-[#EAF3FF] px-3 py-2 text-[13px] font-bold text-[#315A7C]">{error}</p> : null}
      <div className="v-modal-actions"><button onClick={onClose} disabled={pending || scanning} className="v-admin-button-secondary flex-1 disabled:opacity-50">Отмена</button><button onClick={() => void save()} disabled={pending || scanning || students.length === 0} className="v-admin-button flex-1 disabled:opacity-50">{pending ? 'Сохраняем...' : 'Сохранить'}</button></div>
    </div>
  )
}

export function AdminDocuments() {
  const school = db.schools.currentAdmin()
  const [filter, setFilter] = useState<FilterTab>('all')
  const [showAddDocument, setShowAddDocument] = useState(false)
  const [version, setVersion] = useState(0)
  const { showToast } = useToast()

  const students = useMemo(() => school ? filterStudents(db.students.bySchool(school.id)) : [], [school?.id, version])

  const data = useMemo(() => {
    if (!school) return []
    return adminDocuments.all(school.id).map((doc) => {
      const student = db.students.byId(doc.studentId)
      return { doc, student }
    })
  }, [school?.id, version])

  const filtered = filter === 'all' ? data : data.filter((d) => d.doc.status === filter)
  const requiredForExam = useMemo(() => {
    if (!school) return REQUIRED_FOR_EXAM
    const configured = adminSettings.get(school.id).requiredDocuments
    return configured.length ? configured : REQUIRED_FOR_EXAM
  }, [school?.id])

  const summary = useMemo(() => {
    const counts = { missing: 0, pending: 0, rejected: 0, expired: 0, verified: 0 }
    data.forEach(({ doc }) => {
      if (doc.status in counts) counts[doc.status as keyof typeof counts] += 1
    })
    return counts
  }, [data])

  const admissionQueue = useMemo(() => {
    if (!school) return []
    return filterStudents(db.students.bySchool(school.id)).map((student) => {
      const docs = data.filter((entry) => entry.student?.id === student.id).map((entry) => entry.doc)
      const missing = requiredForExam.filter((type) => !docs.some((doc) => doc.type === type && doc.status === 'verified'))
      const broken = docs.filter((doc) => requiredForExam.includes(doc.type) && isBlockingStatus(doc.status)).map((doc) => doc.type)
      const blockers = Array.from(new Set([...missing, ...broken]))
      const progress = studentProgress.get(student.id)
      const debt = getDebtForStudent(student.id)
      const isNearExam = (progress?.confirmedHours ?? 0) >= Math.max((progress?.drivingHoursTotal ?? 56) - 10, 0) || student.trainingStage === 'ready_for_internal_exam' || student.trainingStage === 'ready_for_gibdd'
      return { student, blockers, debt, isNearExam, hours: progress?.confirmedHours ?? 0, total: progress?.drivingHoursTotal ?? 56 }
    }).filter((item) => item.blockers.length > 0 || item.debt > 0 || item.isNearExam).sort((left, right) => Number(right.isNearExam) - Number(left.isNearExam) || right.blockers.length - left.blockers.length).slice(0, 10)
  }, [school?.id, data, requiredForExam])

  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'Все' },
    { id: 'missing', label: 'Не загружены' },
    { id: 'pending', label: 'На проверке' },
    { id: 'verified', label: 'Проверены' },
    { id: 'expired', label: 'Просрочены' },
  ]

  const printPacket = (student: Student) => {
    if (!school) return
    const branch = db.branches.byId(student.assignedBranchId ?? '')
    const instructor = db.instructors.byId(student.assignedInstructorId ?? '')
    openStudentPrintPacket({ school, student, branch, instructor })
  }

  const exportAdmissionQueueCsv = () => {
    if (!school) return
    const rows = [
      ['Ученик', 'Телефон', 'Проблема документов', 'Долг', 'Практика', 'Близко к экзамену'],
      ...admissionQueue.map((item) => [
        item.student.name,
        item.student.phone,
        item.blockers.length ? item.blockers.map((type) => DOC_LABELS[type] ?? type).join(', ') : 'документы ок',
        String(item.debt),
        `${item.hours}/${item.total}`,
        item.isNearExam ? 'да' : 'нет',
      ]),
    ]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `vroom-documents-admission-${school.slug}-${format(new Date(), 'yyyy-MM-dd')}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <div className="flex h-full flex-col">
      <Modal open={showAddDocument} onClose={() => setShowAddDocument(false)} title="Загрузить документ" size="md">
        <DocumentUploadForm
          schoolId={school?.id ?? ''}
          students={students}
          onSaved={() => {
            setVersion((current) => current + 1)
            setShowAddDocument(false)
            showToast('Документ сохранён.', 'success')
          }}
          onClose={() => setShowAddDocument(false)}
        />
      </Modal>
      <div className="v-admin-toolbar v-action-toolbar">
        <div>
          <h1 className="v-admin-heading">Документы</h1>
          <p className="v-admin-note mt-1">Допуски к экзаменам, медсправки и договоры</p>
        </div>
        <div className="v-toolbar-cluster ml-auto grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-4">
          <div className="rounded-[10px] bg-red-50 px-3 py-2"><p className="text-[11px] font-black uppercase text-red-500">Нет</p><p className="text-[18px] font-black text-gray-900">{summary.missing + summary.rejected + summary.expired}</p></div>
          <div className="rounded-[10px] bg-[#EAF3FF] px-3 py-2"><p className="text-[11px] font-black uppercase text-[#315A7C]">Проверка</p><p className="text-[18px] font-black text-gray-900">{summary.pending}</p></div>
          <div className="rounded-[10px] bg-green-50 px-3 py-2"><p className="text-[11px] font-black uppercase text-green-600">Готово</p><p className="text-[18px] font-black text-gray-900">{summary.verified}</p></div>
          <div className="rounded-[10px] bg-[#F8FAFC] px-3 py-2"><p className="text-[11px] font-black uppercase text-gray-400">Допуск</p><p className="text-[18px] font-black text-gray-900">{admissionQueue.length}</p></div>
          <button type="button" onClick={() => setShowAddDocument(true)} className="v-admin-button v-toolbar-primary-action col-span-2 min-h-10 px-4 text-[13px] sm:col-span-4">Загрузить документ</button>
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
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={exportAdmissionQueueCsv} className="v-admin-button-secondary min-h-9 px-3 text-[12px]">Экспорт допуска</button>
                <span className={`v-admin-pill ${admissionQueue.length ? 'v-tone-danger' : 'v-tone-ok'}`}>{admissionQueue.length ? `${admissionQueue.length} проверить` : 'чисто'}</span>
              </div>
            </div>
            {admissionQueue.length === 0 ? (
              <div className="v-admin-empty m-4 min-h-[132px] py-6">
                <strong>Допуск выглядит чисто</strong>
                <span>Ученики с долгом, просрочкой справки или неполным пакетом документов появятся здесь первыми.</span>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {admissionQueue.map(({ student, blockers, debt, isNearExam, hours, total }) => (
                  <div key={student.id} className="grid gap-3 p-4 transition hover:bg-[#F8FAFC] sm:grid-cols-[minmax(0,1fr)_160px_170px_130px] sm:items-center">
                    <span className="min-w-0">
                      <a href={`${getAdminBasePathForLocation()}/students/${student.id}`} className="block truncate text-[15px] font-black text-gray-900 hover:text-[#075EBC]">{student.name}</a>
                      <span className="mt-1 block text-[12px] font-bold text-gray-400">Практика {hours}/{total} ч · {isNearExam ? 'близко к экзамену' : 'в обучении'}</span>
                    </span>
                    <span className="text-[13px] font-black text-gray-700">{blockers.length ? blockers.map((type) => DOC_LABELS[type] ?? type).join(', ') : 'документы ок'}</span>
                    <span className={`w-max rounded-full px-3 py-1 text-[12px] font-black ${debt > 0 || blockers.length ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>{debt > 0 ? `долг ${debt.toLocaleString('ru-RU')} ₽` : blockers.length ? 'допуск закрыт' : 'готов'}</span>
                    <button type="button" onClick={() => printPacket(student)} className="v-admin-button-secondary min-h-9 px-3 text-[12px]">Пакет PDF</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <aside className="v-admin-panel p-4">
            <h2 className="text-[18px] font-black text-gray-900">Минимум к ГИБДД</h2>
            <div className="mt-3 grid gap-2">
              {requiredForExam.map((type) => <div key={type} className="rounded-xl bg-gray-50 p-3 text-[13px] font-bold text-gray-600">{DOC_LABELS[type]}</div>)}
              <div className="rounded-xl bg-red-50 p-3 text-[13px] font-bold text-red-600">Плюс нулевой долг</div>
            </div>
          </aside>
        </section>

        {filtered.length === 0 ? (
          <div className="px-3 pb-5 md:px-5">
            <div className="v-admin-empty">
              <strong>Документов не найдено</strong>
              <span>Смените фильтр или загрузите файл с устройства.</span>
              <button type="button" onClick={() => setShowAddDocument(true)} className="v-admin-button mt-3">Загрузить документ</button>
            </div>
          </div>
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
