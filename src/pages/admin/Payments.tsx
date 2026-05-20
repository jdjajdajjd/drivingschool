import { useMemo, useState } from 'react'
import { format, isSameDay } from 'date-fns'
import { ru } from 'date-fns/locale'
import { CreditCard, Plus } from 'iconoir-react'
import { db } from '../../services/storage'
import { adminPayments, createCurrentStaffAuditEntry } from '../../services/adminStorage'
import { assertAdminPermission, canUseAdminPermission } from '../../services/adminAccess'
import { getAdminBasePathForLocation } from '../../services/accessControl'
import { getPreference, setPreference } from '../../services/preferenceStorage'
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
type DebtStatus = 'not_reminded' | 'reminded' | 'promised' | 'disputed'

const DEBT_STATUS_LABELS: Record<DebtStatus, string> = {
  not_reminded: 'Не напоминали',
  reminded: 'Напомнили',
  promised: 'Обещал оплатить',
  disputed: 'Спорный',
}

function money(value: number) {
  return `${value.toLocaleString('ru-RU')} ₽`
}

function parseMoneyInput(value: string): number {
  const normalized = value.replace(/\s/g, '').replace(',', '.').replace(/[^0-9.-]/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? Math.round(parsed) : NaN
}

function statusTone(status: PaymentStatus) {
  if (status === 'paid') return 'v-tone-ok'
  if (status === 'partial' || status === 'frozen') return 'v-tone-warning'
  if (status === 'refund' || status === 'disputed') return 'v-tone-info'
  return 'v-tone-danger'
}

function debtKey(paymentId: string) {
  return `vroom:debt-status:${paymentId}`
}

function getDebtStatus(paymentId: string): DebtStatus {
  if (typeof window === 'undefined') return 'not_reminded'
  return (getPreference(debtKey(paymentId)) as DebtStatus | null) ?? 'not_reminded'
}

function setDebtStatusValue(paymentId: string, status: DebtStatus) {
  if (typeof window === 'undefined') return
  setPreference(debtKey(paymentId), status)
}

export function AdminPayments() {
  const school = db.schools.currentAdmin()
  const [filter, setFilter] = useState<FilterTab>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [debtVersion, setDebtVersion] = useState(0)
  const canManageFinance = canUseAdminPermission('finance.manage')

  const rows = useMemo(() => {
    if (!school) return []
    return adminPayments.all(school.id).map((payment) => ({ payment, student: db.students.byId(payment.studentId) }))
  }, [school?.id])

  const totals = useMemo(() => {
    const paid = rows.reduce((sum, row) => sum + row.payment.paidAmount, 0)
    const paidToday = rows.reduce((sum, row) => row.payment.paidAt && isSameDay(new Date(row.payment.paidAt), new Date()) ? sum + row.payment.paidAmount : sum, 0)
    const debt = rows.reduce((sum, row) => {
      if (row.payment.status === 'overdue' || row.payment.status === 'partial' || row.payment.status === 'unpaid') return sum + row.payment.remainingAmount
      return sum
    }, 0)
    const overdue = rows.filter((row) => row.payment.status === 'overdue')
    const unpaid = rows.filter((row) => row.payment.status === 'unpaid')
    const partial = rows.filter((row) => row.payment.status === 'partial')
    return { paid, paidToday, debt, overdueCount: overdue.length, unpaidCount: unpaid.length, partialCount: partial.length }
  }, [rows])

  const collectionQueue = useMemo(() => {
    const byStudent = new Map<string, { student: ReturnType<typeof db.students.byId>; debt: number; overdue: number; payments: Payment[] }>()
    rows.forEach((row) => {
      if (!['overdue', 'partial', 'unpaid', 'disputed'].includes(row.payment.status) || row.payment.remainingAmount <= 0) return
      const key = row.payment.studentId
      const current = byStudent.get(key) ?? { student: row.student, debt: 0, overdue: 0, payments: [] }
      current.debt += row.payment.remainingAmount
      if (row.payment.status === 'overdue' || row.payment.status === 'disputed') current.overdue += row.payment.remainingAmount
      current.payments.push(row.payment)
      byStudent.set(key, current)
    })
    void debtVersion
    return Array.from(byStudent.values()).sort((left, right) => right.debt - left.debt).slice(0, 8)
  }, [rows, debtVersion])

  const updateDebtStatus = (paymentId: string, status: DebtStatus) => {
    setDebtStatusValue(paymentId, status)
    setDebtVersion((value) => value + 1)
  }

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
        <div className="ml-auto grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-3">
          <div className="rounded-[10px] bg-[#EAF7EF] px-4 py-2">
            <p className="text-[11px] font-black uppercase text-[#157347]">Оплачено</p>
            <p className="text-[18px] font-black text-[#111418]">{money(totals.paid)}</p>
          </div>
          <div className="rounded-[10px] bg-[#EAF3FF] px-4 py-2">
            <p className="text-[11px] font-black uppercase text-[#315A7C]">Сегодня</p>
            <p className="text-[18px] font-black text-[#111418]">{money(totals.paidToday)}</p>
          </div>
          <div className="rounded-[10px] bg-[#FFF3F2] px-4 py-2">
            <p className="text-[11px] font-black uppercase text-[#B42318]">Долг</p>
            <p className="text-[18px] font-black text-[#111418]">{money(totals.debt)}</p>
          </div>
          {canManageFinance ? (
            <button onClick={() => setShowAdd(true)} className="v-admin-button col-span-2 sm:col-span-3">
              <Plus width={16} height={16} />
              Принять оплату
            </button>
          ) : null}
        </div>
      </div>

      <div className="v-tab-row v-tab-row-wrap">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setFilter(tab.id)} className={`v-tab ${filter === tab.id ? 'v-tab-active' : ''}`}>
            {tab.label}
            {tab.count !== undefined ? <span className="ml-2 rounded-full bg-[#EEF2F5] px-2 py-0.5 text-[11px] text-[#59626D]">{tab.count}</span> : null}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-3 md:p-5">
        <section className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="v-admin-panel overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#111827]/[0.07] p-4">
              <div>
                <h2 className="text-[18px] font-black text-[#111418]">Кого дожать по оплате</h2>
                <p className="v-admin-note mt-1">Ручные переводы на карту, частичные оплаты и блокеры допуска</p>
              </div>
              <span className={`v-admin-pill ${collectionQueue.length ? 'v-tone-danger' : 'v-tone-ok'}`}>{collectionQueue.length ? `${collectionQueue.length} в очереди` : 'чисто'}</span>
            </div>
            {collectionQueue.length === 0 ? (
              <div className="v-admin-empty m-4 py-6">
                <strong>Долговая очередь пустая</strong>
                <span>Новые просрочки и частичные оплаты появятся здесь первыми.</span>
              </div>
            ) : (
              <div className="divide-y divide-[#111827]/[0.06]">
                {collectionQueue.map((item) => {
                  const mainPayment = item.payments[0]
                  const debtStatus = mainPayment ? getDebtStatus(mainPayment.id) : 'not_reminded'
                  return (
                  <div key={item.student?.id ?? item.payments[0]?.studentId} className="grid gap-3 p-4 transition hover:bg-[#F8FAFC] sm:grid-cols-[minmax(0,1fr)_160px_170px_180px] sm:items-center">
                    <span className="min-w-0">
                      <a href={item.student ? `${getAdminBasePathForLocation()}/students/${item.student.id}` : '#'} className="block min-h-9 truncate py-1 text-[15px] font-black text-[#111418] hover:text-[#075EBC]">{item.student?.name ?? 'Ученик не найден'}</a>
                      <span className="mt-1 block text-[12px] font-bold text-[#66717D]">{item.student?.phone ?? 'телефон не указан'} · {item.payments.length} платежей</span>
                    </span>
                    <span className="text-[16px] font-black text-[#B42318]">{money(item.debt)}</span>
                    <span className="flex flex-wrap gap-2">
                      <a href={`tel:${item.student?.phone ?? ''}`} className="v-admin-button-secondary h-9 min-h-9 px-3">Звонок</a>
                      {item.student?.phone ? <button onClick={() => void navigator.clipboard?.writeText(`Здравствуйте! Напоминаем об оплате в автошколе. Остаток: ${money(item.debt)}.`)} className="v-admin-button-secondary h-9 min-h-9 px-3">Текст</button> : null}
                    </span>
                    {mainPayment ? (
                      <select value={debtStatus} onChange={(event) => updateDebtStatus(mainPayment.id, event.target.value as DebtStatus)} className="v-admin-input h-9 py-1 text-[12px]">
                        {Object.entries(DEBT_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    ) : null}
                  </div>
                )})}
              </div>
            )}
          </div>
          <aside className="v-admin-panel p-4">
            <h2 className="text-[18px] font-black text-[#111418]">Правило запуска</h2>
            <div className="mt-3 grid gap-2 text-[13px] font-bold text-[#66717D]">
              <div className="rounded-[14px] bg-[#F8FAFC] p-3"><span className="text-[#B42318]">Просрочка</span> блокирует экзамены и требует звонка.</div>
              <div className="rounded-[14px] bg-[#F8FAFC] p-3"><span className="text-[#315A7C]">Частично</span> видно директору до закрытия остатка.</div>
              <div className="rounded-[14px] bg-[#F8FAFC] p-3"><span className="text-[#157347]">Перевод</span> фиксируется вручную в день поступления.</div>
            </div>
          </aside>
        </section>

        {filtered.length === 0 ? (
          <div className="v-admin-empty">
            <CreditCard className="mb-2 h-8 w-8 text-[#8D98A4]" />
            <strong>Платежей не найдено</strong>
            <span>Поменяйте фильтр или примите новую оплату.</span>
          </div>
        ) : (
          <>
            <div className="grid gap-2 md:hidden">
            {filtered.map(({ payment, student }) => (
              <article key={payment.id} className="v-human-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <strong className="block truncate text-[15px] font-semibold text-[#111827]">{student?.name ?? 'Ученик не найден'}</strong>
                    <span className="mt-0.5 block truncate text-[12px] font-medium text-[#667085]">{payment.description}</span>
                  </div>
                  <span className={`v-admin-pill shrink-0 ${statusTone(payment.status)}`}>{STATUS_LABELS[payment.status]}</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <span className="rounded-[16px] bg-[#F8FAFC] p-2 text-center">
                    <strong className="block text-[15px] font-semibold text-[#111827]">{money(payment.amount)}</strong>
                    <span className="text-[11px] font-medium text-[#667085]">сумма</span>
                  </span>
                  <span className="rounded-[16px] bg-[#F8FAFC] p-2 text-center">
                    <strong className="block text-[15px] font-semibold text-[#1F8F3F]">{money(payment.paidAmount)}</strong>
                    <span className="text-[11px] font-medium text-[#667085]">оплачено</span>
                  </span>
                  <span className="rounded-[16px] bg-[#F8FAFC] p-2 text-center">
                    <strong className={`block text-[15px] font-semibold ${payment.remainingAmount > 0 ? 'text-[#C92820]' : 'text-[#1F8F3F]'}`}>{payment.remainingAmount > 0 ? money(payment.remainingAmount) : 'нет'}</strong>
                    <span className="text-[11px] font-medium text-[#667085]">долг</span>
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-[12px] font-medium text-[#667085]">
                  <span className="truncate">{payment.method ? METHOD_LABELS[payment.method] : 'способ не указан'}</span>
                  <span className="shrink-0">{payment.paidAt ? format(new Date(payment.paidAt), 'd MMM', { locale: ru }) : payment.dueDate ? `до ${format(new Date(payment.dueDate), 'd MMM', { locale: ru })}` : 'ожидается'}</span>
                </div>
              </article>
            ))}
          </div>

            <div className="v-admin-panel hidden overflow-hidden md:block">
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
                    <td>
                      {payment.paidAt ? format(new Date(payment.paidAt), 'd MMM yyyy', { locale: ru }) : payment.dueDate ? <span className={new Date(payment.dueDate) < new Date() ? 'font-black text-[#B42318]' : 'text-[#8D98A4]'}>до {format(new Date(payment.dueDate), 'd MMM', { locale: ru })}</span> : <span className="text-[#8D98A4]">ожидается</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
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
  const [paidAmount, setPaidAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('transfer')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<PaymentStatus>('paid')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const handleSubmit = async () => {
    const access = assertAdminPermission('finance.manage')
    if (!access.ok) { setError(access.error ?? 'Недостаточно прав.'); return }
    if (pending) return
    setError('')

    const parsed = parseMoneyInput(amount)
    const parsedPaid = status === 'partial' ? parseMoneyInput(paidAmount) : status === 'paid' ? parsed : 0
    if (!studentId) { setError('Выберите ученика.'); return }
    if (!Number.isFinite(parsed) || parsed <= 0) { setError('Укажите корректную сумму.'); return }
    if (!Number.isFinite(parsedPaid) || parsedPaid < 0 || parsedPaid > parsed) { setError('Укажите корректно оплаченную часть.'); return }
    const payment: Payment = {
      id: `pay_${Date.now()}`,
      schoolId,
      studentId,
      amount: parsed,
      paidAmount: parsedPaid,
      remainingAmount: Math.max(parsed - parsedPaid, 0),
      status: parsedPaid >= parsed ? 'paid' : status,
      method,
      description: description.trim() || 'Оплата обучения',
      paidAt: parsedPaid > 0 ? new Date().toISOString() : undefined,
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
            <option value="transfer">Перевод на карту</option>
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
      {status === 'partial' ? (
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-black text-[#38424D]">Сколько поступило</span>
          <input type="number" value={paidAmount} onChange={(event) => setPaidAmount(event.target.value)} placeholder="5000" className="v-admin-input w-full" />
        </label>
      ) : null}
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-black text-[#38424D]">Описание</span>
        <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Оплата за обучение" className="v-admin-input w-full" />
      </label>
      {error ? <p className="rounded-[10px] bg-[#EAF3FF] px-3 py-2 text-[13px] font-bold text-[#315A7C]">{error}</p> : null}
      <div className="v-modal-actions">
        <button onClick={onClose} disabled={pending} className="v-admin-button-secondary flex-1 disabled:opacity-50">Отмена</button>
        <button onClick={handleSubmit} disabled={pending} className="v-admin-button flex-1 disabled:opacity-50">{pending ? 'Сохраняем...' : 'Сохранить'}</button>
      </div>
    </div>
  )
}
