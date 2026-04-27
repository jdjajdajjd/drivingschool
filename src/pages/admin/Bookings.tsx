import { addDays, endOfWeek, isAfter, isBefore, isSameDay, startOfDay, startOfWeek } from 'date-fns'
import { CheckCircle2, RotateCcw, Search, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { FormField } from '../../components/ui/FormField'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/ui/PageHeader'
import { Section } from '../../components/ui/Section'
import { useToast } from '../../components/ui/Toast'
import { formatPhone } from '../../lib/utils'
import {
  cancelBooking,
  completeBooking,
  getBookingsBySchool,
  getSlotDateTime,
  rescheduleBooking,
} from '../../services/bookingService'
import { ADMIN_BASE_PATH } from '../../services/accessControl'
import { db } from '../../services/storage'
import { getAvailableSlots } from '../../services/slotService'

type StatusFilter = 'all' | 'active' | 'cancelled' | 'completed'
type PeriodFilter = 'all' | 'today' | 'tomorrow' | 'week' | 'future' | 'past'

function selectClassName() {
  return 'h-11 w-full rounded-2xl border border-stone-200 bg-white px-3.5 text-[15px] text-stone-900 outline-none transition focus:border-forest-300 focus:ring-4 focus:ring-forest-100'
}

export function AdminBookings() {
  const school = db.schools.bySlug('virazh')
  const { showToast } = useToast()
  const [search, setSearch] = useState('')
  const [date, setDate] = useState('')
  const [branchId, setBranchId] = useState('all')
  const [instructorId, setInstructorId] = useState('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [period, setPeriod] = useState<PeriodFilter>('all')
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null)
  const [completeBookingId, setCompleteBookingId] = useState<string | null>(null)
  const [rescheduleBookingId, setRescheduleBookingId] = useState<string | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleBranchId, setRescheduleBranchId] = useState('all')
  const [rescheduleInstructorId, setRescheduleInstructorId] = useState('all')
  const [selectedNewSlotId, setSelectedNewSlotId] = useState('')

  const branches = school ? db.branches.bySchool(school.id) : []
  const instructors = school ? db.instructors.bySchool(school.id) : []
  const allBookings = school ? getBookingsBySchool(school.id) : []

  const filteredBookings = useMemo(() => {
    const now = new Date()
    const query = search.trim().toLowerCase()

    return [...allBookings]
      .filter((entry) => {
        const slotDate = entry.slot ? getSlotDateTime(entry.slot) : null

        const matchesSearch = !query
          ? true
          : entry.booking.studentName.toLowerCase().includes(query) ||
            entry.booking.studentPhone.includes(query.replace(/\D/g, ''))

        const matchesDate = date ? entry.slot?.date === date : true
        const matchesBranch = branchId === 'all' ? true : entry.booking.branchId === branchId
        const matchesInstructor = instructorId === 'all' ? true : entry.booking.instructorId === instructorId
        const matchesStatus = status === 'all' ? true : entry.booking.status === status

        const matchesPeriod = (() => {
          if (!slotDate || period === 'all') {
            return true
          }

          if (period === 'today') return isSameDay(slotDate, now)
          if (period === 'tomorrow') return isSameDay(slotDate, addDays(now, 1))
          if (period === 'week') {
            const weekStart = startOfWeek(now, { weekStartsOn: 1 })
            const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
            return !isBefore(slotDate, weekStart) && !isAfter(slotDate, weekEnd)
          }
          if (period === 'future') return !isBefore(slotDate, startOfDay(now))
          if (period === 'past') return isBefore(slotDate, startOfDay(now))
          return true
        })()

        return matchesSearch && matchesDate && matchesBranch && matchesInstructor && matchesStatus && matchesPeriod
      })
      .sort((left, right) => {
        const leftTime = left.slot ? getSlotDateTime(left.slot).getTime() : 0
        const rightTime = right.slot ? getSlotDateTime(right.slot).getTime() : 0
        const leftPast = left.slot ? isBefore(getSlotDateTime(left.slot), startOfDay(now)) : false
        const rightPast = right.slot ? isBefore(getSlotDateTime(right.slot), startOfDay(now)) : false

        if (leftPast !== rightPast) {
          return leftPast ? 1 : -1
        }

        return leftTime - rightTime
      })
  }, [allBookings, search, date, branchId, instructorId, status, period])

  const rescheduleCandidates = useMemo(() => {
    if (!rescheduleBookingId) {
      return []
    }

    return getAvailableSlots(
      rescheduleInstructorId === 'all' ? undefined : rescheduleInstructorId,
      rescheduleDate || undefined,
      rescheduleBranchId === 'all' ? undefined : rescheduleBranchId,
    )
  }, [rescheduleBookingId, rescheduleDate, rescheduleBranchId, rescheduleInstructorId])

  function refreshRescheduleDefaults(bookingId: string): void {
    const entry = allBookings.find((item) => item.booking.id === bookingId)
    setRescheduleBranchId(entry?.booking.branchId ?? 'all')
    setRescheduleInstructorId(entry?.booking.instructorId ?? 'all')
    setRescheduleDate(entry?.slot?.date ?? '')
    setSelectedNewSlotId('')
  }

  function handleCancelConfirm(): void {
    if (!cancelBookingId) {
      return
    }
    const result = cancelBooking(cancelBookingId)
    setCancelBookingId(null)
    if (!result.ok) {
      showToast(result.error ?? 'Не удалось отменить запись.', 'error')
      return
    }
    showToast('Запись отменена. Слот снова доступен.', 'success')
  }

  function handleCompleteConfirm(): void {
    if (!completeBookingId) {
      return
    }
    const result = completeBooking(completeBookingId)
    setCompleteBookingId(null)
    if (!result.ok) {
      showToast(result.error ?? 'Не удалось отметить запись проведённой.', 'error')
      return
    }
    showToast('Занятие отмечено проведённым.', 'success')
  }

  function handleRescheduleConfirm(): void {
    if (!rescheduleBookingId || !selectedNewSlotId) {
      showToast('Выберите новый свободный слот.', 'error')
      return
    }

    const result = rescheduleBooking({
      bookingId: rescheduleBookingId,
      newSlotId: selectedNewSlotId,
      ignoreLimits: true,
    })

    if (!result.ok) {
      showToast(result.error ?? 'Не удалось перенести запись.', 'error')
      return
    }

    setRescheduleBookingId(null)
    setSelectedNewSlotId('')
    showToast(result.warning ?? 'Запись перенесена.', 'success')
  }

  if (!school) {
    return (
      <div className="max-w-7xl p-6 md:p-8">
        <EmptyState title="Школа не найдена" description="Демо-данные не загружены." />
      </div>
    )
  }

  return (
    <div className="max-w-7xl p-6 md:p-8">
      <PageHeader
        eyebrow={school.name}
        title="Записи"
        description="Поиск, фильтры, отмена, проведение и перенос занятий без выхода из панели."
      />

      <div className="mt-8 space-y-6">
        <Section title="Фильтры" description="Ищите по ученику, телефону, периоду и статусу.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <FormField label="Поиск">
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Ученик или телефон"
                  className="h-11 w-full rounded-2xl border border-stone-200 bg-white pl-10 pr-3.5 text-[15px] text-stone-900 outline-none transition focus:border-forest-300 focus:ring-4 focus:ring-forest-100"
                />
              </div>
            </FormField>

            <FormField label="Дата">
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={selectClassName()} />
            </FormField>

            <FormField label="Филиал">
              <select value={branchId} onChange={(event) => setBranchId(event.target.value)} className={selectClassName()}>
                <option value="all">Все филиалы</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Инструктор">
              <select value={instructorId} onChange={(event) => setInstructorId(event.target.value)} className={selectClassName()}>
                <option value="all">Все инструкторы</option>
                {instructors.map((instructor) => (
                  <option key={instructor.id} value={instructor.id}>
                    {instructor.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Статус">
              <select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)} className={selectClassName()}>
                <option value="all">Все</option>
                <option value="active">Активные</option>
                <option value="cancelled">Отменённые</option>
                <option value="completed">Проведённые</option>
              </select>
            </FormField>

            <FormField label="Период">
              <select value={period} onChange={(event) => setPeriod(event.target.value as PeriodFilter)} className={selectClassName()}>
                <option value="all">Все</option>
                <option value="today">Сегодня</option>
                <option value="tomorrow">Завтра</option>
                <option value="week">Эта неделя</option>
                <option value="future">Будущие</option>
                <option value="past">Прошедшие</option>
              </select>
            </FormField>
          </div>
        </Section>

        <Section
          title="Все записи"
          description={`Найдено ${filteredBookings.length} записей.`}
        >
          {filteredBookings.length === 0 ? (
            <EmptyState title="Записей не найдено" description="Измените фильтры или создайте новую запись на публичной странице." />
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-2xl border border-stone-200 xl:block">
                <table className="min-w-full divide-y divide-stone-200">
                  <thead className="bg-stone-50">
                    <tr className="text-left text-xs font-medium text-stone-500">
                      <th className="px-4 py-3">Дата</th>
                      <th className="px-4 py-3">Ученик</th>
                      <th className="px-4 py-3">Филиал</th>
                      <th className="px-4 py-3">Инструктор</th>
                      <th className="px-4 py-3">Статус</th>
                      <th className="px-4 py-3">Создана</th>
                      <th className="px-4 py-3 text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 bg-white">
                    {filteredBookings.map((entry) => (
                      <tr key={entry.booking.id} className="align-top text-sm text-stone-600">
                        <td className="px-4 py-4">
                          <p className="font-medium text-stone-900">
                            {entry.slot ? `${entry.slot.date} · ${entry.slot.time}` : 'Не найдено'}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          {entry.student ? (
                            <Link to={`${ADMIN_BASE_PATH}/students/${entry.student.id}`} className="font-medium text-stone-900 hover:text-forest-700">
                              {entry.booking.studentName}
                            </Link>
                          ) : (
                            <p className="font-medium text-stone-900">{entry.booking.studentName}</p>
                          )}
                          <p className="text-stone-500">{formatPhone(entry.booking.studentPhone)}</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-medium text-stone-900">{entry.branch?.name ?? 'Не найдено'}</p>
                          <p className="text-stone-500">{entry.branch?.address ?? 'Без адреса'}</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-medium text-stone-900">{entry.instructor?.name ?? 'Не найдено'}</p>
                          <p className="text-stone-500">
                            {entry.instructor?.car ?? 'Машина не указана'}
                            {entry.instructor?.transmission
                              ? ` · ${entry.instructor.transmission === 'manual' ? 'Механика' : 'Автомат'}`
                              : ''}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={entry.booking.status} />
                        </td>
                        <td className="px-4 py-4 text-stone-500">
                          {new Date(entry.booking.createdAt).toLocaleString('ru-RU')}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={entry.booking.status !== 'active'}
                              onClick={() => {
                                setRescheduleBookingId(entry.booking.id)
                                refreshRescheduleDefaults(entry.booking.id)
                              }}
                            >
                              <RotateCcw size={14} />
                              Перенести
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={entry.booking.status !== 'active'}
                              onClick={() => setCompleteBookingId(entry.booking.id)}
                            >
                              <CheckCircle2 size={14} />
                              Проведена
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              disabled={entry.booking.status !== 'active'}
                              onClick={() => setCancelBookingId(entry.booking.id)}
                            >
                              <XCircle size={14} />
                              Отменить
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-4 xl:hidden">
                {filteredBookings.map((entry) => (
                  <div key={entry.booking.id} className="rounded-2xl border border-stone-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-stone-900">{entry.booking.studentName}</p>
                        <p className="text-sm text-stone-500">{formatPhone(entry.booking.studentPhone)}</p>
                      </div>
                      <StatusBadge status={entry.booking.status} />
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium text-stone-500">Занятие</p>
                        <p className="mt-1 text-sm font-medium text-stone-900">
                          {entry.slot ? `${entry.slot.date} · ${entry.slot.time}` : 'Не найдено'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-stone-500">Инструктор</p>
                        <p className="mt-1 text-sm font-medium text-stone-900">{entry.instructor?.name ?? 'Не найдено'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-stone-500">Филиал</p>
                        <p className="mt-1 text-sm font-medium text-stone-900">{entry.branch?.name ?? 'Не найдено'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-stone-500">Создана</p>
                        <p className="mt-1 text-sm font-medium text-stone-900">
                          {new Date(entry.booking.createdAt).toLocaleString('ru-RU')}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={entry.booking.status !== 'active'}
                        onClick={() => {
                          setRescheduleBookingId(entry.booking.id)
                          refreshRescheduleDefaults(entry.booking.id)
                        }}
                      >
                        Перенести
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={entry.booking.status !== 'active'}
                        onClick={() => setCompleteBookingId(entry.booking.id)}
                      >
                        Проведена
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={entry.booking.status !== 'active'}
                        onClick={() => setCancelBookingId(entry.booking.id)}
                      >
                        Отменить
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Section>
      </div>

      <ConfirmDialog
        open={Boolean(cancelBookingId)}
        title="Отменить запись"
        description="Запись перейдёт в статус «Отменена», а слот снова станет доступным для выбора."
        confirmLabel="Отменить запись"
        onClose={() => setCancelBookingId(null)}
        onConfirm={handleCancelConfirm}
        danger
      />

      <ConfirmDialog
        open={Boolean(completeBookingId)}
        title="Отметить проведённой"
        description="Запись перейдёт в статус «Проведена». Слот останется занятым."
        confirmLabel="Отметить проведённой"
        onClose={() => setCompleteBookingId(null)}
        onConfirm={handleCompleteConfirm}
      />

      <Modal open={Boolean(rescheduleBookingId)} onClose={() => setRescheduleBookingId(null)} title="Перенести запись" size="lg">
        <div className="space-y-6 px-6 pb-6">
          <div className="rounded-3xl border border-amber-100 bg-amber-50 px-4 py-4 text-sm text-amber-800">
            Администратор может перенести запись даже при лимите будущих записей у ученика. Если лимит превышен, это будет отмечено в уведомлении.
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Филиал">
              <select value={rescheduleBranchId} onChange={(event) => setRescheduleBranchId(event.target.value)} className={selectClassName()}>
                <option value="all">Все филиалы</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Инструктор">
              <select value={rescheduleInstructorId} onChange={(event) => setRescheduleInstructorId(event.target.value)} className={selectClassName()}>
                <option value="all">Все инструкторы</option>
                {instructors.map((instructor) => (
                  <option key={instructor.id} value={instructor.id}>
                    {instructor.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Дата">
              <input type="date" value={rescheduleDate} onChange={(event) => setRescheduleDate(event.target.value)} className={selectClassName()} />
            </FormField>
          </div>

          {rescheduleCandidates.length === 0 ? (
            <EmptyState title="Свободных слотов не найдено" description="Измените фильтры или создайте новые слоты в разделе «Слоты»." />
          ) : (
            <div className="grid max-h-[360px] gap-3 overflow-y-auto sm:grid-cols-2">
              {rescheduleCandidates.map((slot) => {
                const instructor = db.instructors.byId(slot.instructorId)
                const branch = db.branches.byId(slot.branchId)
                const selected = selectedNewSlotId === slot.id

                return (
                  <button
                    key={slot.id}
                    onClick={() => setSelectedNewSlotId(slot.id)}
                    className={`rounded-3xl border px-4 py-4 text-left transition ${
                      selected
                        ? 'border-forest-700 bg-forest-50'
                        : 'border-stone-200 bg-white hover:border-stone-300'
                    }`}
                  >
                    <p className="text-sm font-semibold text-stone-900">
                      {slot.date} · {slot.time}
                    </p>
                    <p className="mt-1 text-sm text-stone-500">{branch?.name ?? 'Филиал не найден'}</p>
                    <p className="mt-1 text-sm text-stone-500">{instructor?.name ?? 'Инструктор не найден'}</p>
                  </button>
                )
              })}
            </div>
          )}

          <div className="flex gap-3">
            <Button className="flex-1" onClick={handleRescheduleConfirm} disabled={!selectedNewSlotId}>
              Подтвердить перенос
            </Button>
            <Button variant="secondary" className="flex-1" onClick={() => setRescheduleBookingId(null)}>
              Закрыть
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
