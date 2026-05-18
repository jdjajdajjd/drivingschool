import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { CreditCard, Plus } from 'lucide-react'
import { db } from '../../services/storage'
import { adminPayments, createCurrentStaffAuditEntry } from '../../services/adminStorage'
import { assertAdminPermission, canUseAdminPermission } from '../../services/adminAccess'
import { Modal } from '../../components/ui/Modal'
import type { Payment, PaymentMethod, PaymentStatus } from '../../types'

const STATUS_LABELS: Record<PaymentStatus, string> = {
  paid: 'Оплачен',
  partial: 'Частично',
  unpaid: 'Не оплачен',
  overdue: 'Просрочка',
  refund: 'Возврат',
  frozen: 'Заморозка',
  disputed: 'Спорный',
}

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Наличные',
  card: 'Карта',
  transfer: 'Перевод',
  receipt: 'Квитанция',
  other: 'Другое',
}

type FilterTab = 'all' | 'overdue' | 'partial' | 'unpaid' | 'paid'

function money(value: number) {
  return `${value.toLocaleString('ru-RU')} ₽`
}

function statusTone(status: PaymentStatus) {
  if (status === 'paid') return 'v-tone-ok'
  if (status === 'partial' || status === 'frozen') return 'v-tone-warning'
  if (status === 'refund' || status === 'disputed') return 'v-tone-info'
  return 'v-tone-danger'
}

export function AdminPayments() {
  const school = db.schools.currentAdmin()
  const [filter, setFilter] = useState<FilterTab>('all')
  const [showAdd, setShowAdd] = useState(false)
  const canManageFinance = canUseAdminPermission('finance.manage')

  const rows = useMemo(() => {
    if (!school) return []
    return adminPayments.all(school.id).map((payment) => ({ payment, student: db.students.byId(payment.studentId) }))
  }, [school?.id])

  const totals = useMemo(() => {
    const paid = rows.reduce((sum, row) => sum + row.payment.paidAmount, 0)
    const debt = rows.reduce((sum, row) => {
      if (row.payment.status === 'overdue' || row.payment.status === 'partial' || row.payment.status === 'unpaid') return sum + row.payment.remainingAmount
      return sum
    }, 0)
    const overdue = rows.filter((row) => row.payment.status === 'overdue')
    const unpaid = rows.filter((row) => row.payment.status === 'unpaid')
    return { paid, debt, overdueCount: overdue.length, unpaidCount: unpaid.length }
  }, [rows])

  const filtered = useMemo(() => {
    if (filter === 'all') return rows
    return rows.filter((row) => row.payment.status === filter)
  }, [rows, filter])

  const tabs: { id: FilterTab; label: string; count?: number }[] = [
    { id: 'all', label: 'Все', count: rows.length },
    { id: 'overdue', label: 'Просрочка', count: totals.overdueCount || undefined },
    { id: 'partial', label: 'Частично' },
    { id: 'unpaid', label: 'Не оплачены', count: totals.unpaidCount || undefined },
    { id: 'paid', label: 'Оплаченные' },
  ]

  if (!school) return null

  return (
    <div className="flex h-full flex-col">
      <div className="v-admin-toolbar">
        <div>
          <h1 className="v-admin-heading">Оплаты</h1>
          <p className="v-admin-note mt-1">Долги, частичные оплаты и поступления</p>
        </div>
        <div className="ml-auto grid w-full gap-2 sm:w-auto sm:grid-cols-3">
          <div className="rounded-[10px] bg-[#EAF7EF] px-4 py-2">
            <p className="text-[11px] font-black uppercase text-[#157347]">Оплачено</p>
            <p className="text-[18px] font-black text-[#111418]">{money(totals.paid)}</p>
          </div>
          <div className="rounded-[10px] bg-[#FFF3F2] px-4 py-2">
            <p className="text-[11px] font-black uppercase text-[#B42318]">Долг</p>
            <p className="text-[18px] font-black text-[#111418]">{money(totals.debt)}</p>
          </div>
          {canManageFinance ? (
            <button onClick={() => setShowAdd(true)} className="v-admin-button">
              <Plus size={16} />
              Принять оплату
            </button>
          ) : null}
        </div>
      </div>

      <div className="v-tab-row">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setFilter(tab.id)} className={`v-tab ${filter === tab.id ? 'v-tab-active' : ''}`}>
            {tab.label}
            {tab.count !== undefined ? <span className="ml-2 rounded-full bg-[#EEF2F5] px-2 py-0.5 text-[11px] text-[#59626D]">{tab.count}</span> : null}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-3 md:p-5">
        {filtered.length === 0 ? (
          <div className="v-admin-empty">
            <CreditCard className="mb-2 h-8 w-8 text-[#8D98A4]" />
            <strong>Платежей не найдено</strong>
            <span>Поменяйте фильтр или примите новую оплату.</span>
          </div>
        ) : (
          <div className="v-admin-panel overflow-hidden">
            <table className="v-admin-table min-w-[940px]">
              <thead>
                <tr>
                  <th>Ученик</th>
                  <th>Назначение</th>
                  <th>Сумма</th>
                  <th>Оплачено</th>
                  <th>Долг</th>
                  <th>Статус</th>
                  <th>Способ</th>
                  <th>Дата</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ payment, student }) => (
                  <tr key={payment.id}>
                    <td>
                      <span className="block text-[15px] font-black text-[#111418]">{student?.name ?? 'Ученик не найден'}</span>
                      {student?.phone ? <span className="mt-0.5 block text-[12px] font-bold text-[#66717D]">{student.phone}</span> : null}
                    </td>
                    <td>{payment.description}</td>
                    <td className="font-black text-[#111418]">{money(payment.amount)}</td>
                    <td className="font-black text-[#157347]">{money(payment.paidAmount)}</td>
                    <td>{payment.remainingAmount > 0 ? <span className="v-admin-pill v-tone-danger">{money(payment.remainingAmount)}</span> : <span className="v-admin-pill v-tone-ok">нет</span>}</td>
                    <td><span className={`v-admin-pill ${statusTone(payment.status)}`}>{STATUS_LABELS[payment.status]}</span></td>
                    <td>{payment.method ? METHOD_LABELS[payment.method] : <span className="text-[#8D98A4]">не указан</span>}</td>
                    <td>{payment.paidAt ? format(new Date(payment.paidAt), 'd MMM yyyy', { locale: ru }) : <span className="text-[#8D98A4]">ожидается</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Принять оплату" size="md">
        <AddPaymentForm schoolId={school.id} onClose={() => setShowAdd(false)} />
      </Modal>
    </div>
  )
}

function AddPaymentForm({ schoolId, onClose }: { schoolId: string; onClose: () => void }) {
  const students = db.students.bySchool(schoolId)
  const [studentId, setStudentId] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<PaymentStatus>('paid')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const handleSubmit = async () => {
    const access = assertAdminPermission('finance.manage')
    if (!access.ok) { setError(access.error ?? 'Недостаточно прав.'); return }
    if (pending) return
    setError('')

    const parsed = Number.parseInt(amount, 10)
    if (!studentId) { setError('Выберите ученика.'); return }
    if (!Number.isFinite(parsed) || parsed <= 0) { setError('Укажите корректную сумму.'); return }
    const payment: Payment = {
      id: `pay_${Date.now()}`,
      schoolId,
      studentId,
      amount: parsed,
      paidAmount: status === 'paid' ? parsed : 0,
      remainingAmount: status === 'paid' ? 0 : parsed,
      status,
      method,
      description: description.trim() || 'Оплата обучения',
      paidAt: status === 'paid' ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString(),
    }
    try {
      setPending(true)
      await adminPayments.upsertConfirmed(payment)
      createCurrentStaffAuditEntry(schoolId, 'payment_added', 'payment', payment.id, `Принята оплата ${money(payment.amount)}`)
      onClose()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Не удалось сохранить оплату.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-4 p-5">
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-black text-[#38424D]">Ученик</span>
        <select value={studentId} onChange={(event) => setStudentId(event.target.value)} className="v-admin-input w-full">
          <option value="">Выберите ученика</option>
          {students.map((student) => <option key={student.id} value={student.id}>{student.name} · {student.phone}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-black text-[#38424D]">Сумма</span>
        <input type="number" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="35000" className="v-admin-input w-full" />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-black text-[#38424D]">Способ</span>
          <select value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)} className="v-admin-input w-full">
            <option value="cash">Наличные</option>
            <option value="card">Карта</option>
            <option value="transfer">Перевод</option>
            <option value="receipt">Квитанция</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-black text-[#38424D]">Статус</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as PaymentStatus)} className="v-admin-input w-full">
            <option value="paid">Оплачен</option>
            <option value="partial">Частично</option>
            <option value="unpaid">Не оплачен</option>
          </select>
        </label>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-black text-[#38424D]">Описание</span>
        <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Оплата за обучение" className="v-admin-input w-full" />
      </label>
      {error ? <p className="rounded-[10px] bg-[#FFF4DA] px-3 py-2 text-[13px] font-bold text-[#A45A00]">{error}</p> : null}
      <div className="flex gap-2 pt-2">
        <button onClick={onClose} disabled={pending} className="v-admin-button-secondary flex-1 disabled:opacity-50">Отмена</button>
        <button onClick={handleSubmit} disabled={pending} className="v-admin-button flex-1 disabled:opacity-50">{pending ? 'Сохраняем...' : 'Сохранить'}</button>
      </div>
    </div>
  )
}
