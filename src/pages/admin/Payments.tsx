import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { db } from '../../services/storage'
import { adminPayments, getDebtForStudent, createAuditEntry } from '../../services/adminStorage'
import { Modal } from '../../components/ui/Modal'
import type { Payment, PaymentStatus, PaymentMethod } from '../../types'

const STATUS_COLORS: Record<PaymentStatus, string> = {
  paid: 'bg-green-50 text-green-600',
  partial: 'bg-amber-50 text-amber-600',
  unpaid: 'bg-red-50 text-red-500',
  overdue: 'bg-red-100 text-red-600',
  refund: 'bg-purple-50 text-purple-600',
  frozen: 'bg-blue-50 text-blue-600',
  disputed: 'bg-orange-50 text-orange-600',
}

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

type FilterTab = 'all' | 'overdue' | 'partial' | 'paid' | 'unpaid'

export function AdminPayments() {
  const school = db.schools.all()[0]
  const [filter, setFilter] = useState<FilterTab>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)

  const data = useMemo(() => {
    if (!school) return []
    return adminPayments.all(school.id).map((payment) => {
      const student = db.students.byId(payment.studentId)
      return { payment, student }
    })
  }, [school?.id])

  const filtered = useMemo(() => {
    switch (filter) {
      case 'overdue': return data.filter((d) => d.payment.status === 'overdue')
      case 'partial': return data.filter((d) => d.payment.status === 'partial')
      case 'paid': return data.filter((d) => d.payment.status === 'paid')
      case 'unpaid': return data.filter((d) => d.payment.status === 'unpaid')
      default: return data
    }
  }, [data, filter])

  const totals = useMemo(() => {
    const allPayments = adminPayments.all(school?.id ?? '')
    const totalDebt = allPayments.reduce((sum, p) => {
      if (p.status === 'overdue' || p.status === 'partial') return sum + p.remainingAmount
      return sum
    }, 0)
    const totalPaid = allPayments.reduce((sum, p) => sum + p.paidAmount, 0)
    const overdueCount = allPayments.filter((p) => p.status === 'overdue').length
    return { totalDebt, totalPaid, overdueCount }
  }, [school?.id])

  const tabs: { id: FilterTab; label: string; count?: number }[] = [
    { id: 'all', label: 'Все' },
    { id: 'overdue', label: 'Просрочка', count: totals.overdueCount || undefined },
    { id: 'partial', label: 'Частично' },
    { id: 'paid', label: 'Оплаченные' },
    { id: 'unpaid', label: 'Не оплачены' },
  ]

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-shrink-0 flex-wrap items-center gap-3 border-b border-gray-100 bg-white px-4 py-4 md:px-6">
        <h1 className="text-[24px] font-black text-gray-900">Оплаты</h1>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex gap-4">
            <div className="text-right">
              <p className="text-[11px] font-semibold text-gray-400">Общий долг</p>
              <p className="text-[18px] font-black text-red-500">{totals.totalDebt.toLocaleString('ru-RU')} ₽</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold text-gray-400">Оплачено</p>
              <p className="text-[18px] font-black text-green-600">{totals.totalPaid.toLocaleString('ru-RU')} ₽</p>
            </div>
          </div>
          <button onClick={() => setShowAdd(true)} className="h-10 rounded-xl bg-gray-900 px-4 text-[13px] font-bold text-white">
            + Принять оплату
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-shrink-0 gap-1 border-b border-gray-100 bg-white px-4 md:px-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`relative border-b-2 px-3 py-3 text-[13px] font-semibold transition ${
              filter === tab.id ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                filter === tab.id ? 'bg-gray-900 text-white' : 'bg-red-100 text-red-500'
              }`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <div className="flex h-full items-center justify-center"><p className="text-gray-400">Записей не найдено</p></div>
        ) : (
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-left text-[12px] font-bold uppercase tracking-wider text-gray-400">
                <th className="px-4 py-3">Ученик</th>
                <th className="px-4 py-3">Описание</th>
                <th className="px-4 py-3">Сумма</th>
                <th className="px-4 py-3">Оплачено</th>
                <th className="px-4 py-3">Долг</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Метод</th>
                <th className="px-4 py-3">Дата</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ payment, student }) => (
                <tr key={payment.id} className="border-b border-gray-50 transition hover:bg-gray-50/50">
                  <td className="px-4 py-3.5">
                    <p className="font-bold text-gray-900">{student?.name ?? '—'}</p>
                    {student?.phone && <p className="text-[12px] font-semibold text-gray-400">{student.phone}</p>}
                  </td>
                  <td className="px-4 py-3.5 text-[13px] font-semibold text-gray-600">{payment.description}</td>
                  <td className="px-4 py-3.5 text-[14px] font-bold text-gray-900">{payment.amount.toLocaleString('ru-RU')} ₽</td>
                  <td className="px-4 py-3.5 text-[14px] font-bold text-green-600">{payment.paidAmount.toLocaleString('ru-RU')} ₽</td>
                  <td className="px-4 py-3.5">
                    {payment.remainingAmount > 0 ? (
                      <span className="text-[14px] font-bold text-red-500">{payment.remainingAmount.toLocaleString('ru-RU')} ₽</span>
                    ) : (
                      <span className="text-[13px] font-semibold text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`rounded-lg px-2.5 py-1 text-[12px] font-bold ${STATUS_COLORS[payment.status]}`}>
                      {STATUS_LABELS[payment.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-[13px] font-semibold text-gray-500">{payment.method ? METHOD_LABELS[payment.method] : '—'}</td>
                  <td className="px-4 py-3.5 text-[13px] font-semibold text-gray-400">
                    {payment.paidAt ? format(new Date(payment.paidAt), 'd MMM yyyy', { locale: ru }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Принять оплату" size="md">
        <AddPaymentForm schoolId={school?.id ?? ''} onClose={() => setShowAdd(false)} />
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

  const handleSubmit = () => {
    if (!studentId || !amount) return
    const payment: Payment = {
      id: `pay_${Date.now()}`,
      schoolId,
      studentId,
      amount: parseInt(amount),
      paidAmount: status === 'paid' ? parseInt(amount) : 0,
      remainingAmount: status === 'paid' ? 0 : parseInt(amount),
      status,
      method,
      description: description || 'Оплата обучения',
      paidAt: status === 'paid' ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString(),
    }
    adminPayments.upsert(payment)
    createAuditEntry(schoolId, 'admin', 'Администратор', 'payment_added', 'payment', payment.id, `Принята оплата ${payment.amount} ₽`)
    onClose()
  }

  return (
    <div className="space-y-4 p-5">
      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-gray-600">Ученик</label>
        <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-[14px] font-semibold text-gray-900 transition focus:border-gray-900 focus:bg-white focus:outline-none">
          <option value="">Выберите ученика</option>
          {students.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.phone}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-gray-600">Сумма (₽)</label>
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="35000" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-[14px] font-semibold text-gray-900 placeholder-gray-300 transition focus:border-gray-900 focus:bg-white focus:outline-none" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-gray-600">Способ</label>
          <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-[14px] font-semibold text-gray-900 transition focus:border-gray-900 focus:bg-white focus:outline-none">
            <option value="cash">Наличные</option><option value="card">Карта</option><option value="transfer">Перевод</option><option value="receipt">Квитанция</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-gray-600">Статус</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as PaymentStatus)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-[14px] font-semibold text-gray-900 transition focus:border-gray-900 focus:bg-white focus:outline-none">
            <option value="paid">Оплачен</option><option value="partial">Частично</option><option value="unpaid">Не оплачен</option>
          </select>
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-gray-600">Описание</label>
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Оплата за обучение" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-[14px] font-semibold text-gray-900 placeholder-gray-300 transition focus:border-gray-900 focus:bg-white focus:outline-none" />
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={onClose} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-[13px] font-bold text-gray-600 transition hover:bg-gray-50">Отмена</button>
        <button onClick={handleSubmit} className="flex-1 rounded-xl bg-gray-900 py-2.5 text-[13px] font-bold text-white transition hover:bg-gray-800">Сохранить</button>
      </div>
    </div>
  )
}
