import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Search, XCircle } from 'lucide-react'
import { StatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/Toast'
import { formatPhone } from '../../lib/utils'
import { cancelBooking, completeBooking } from '../../services/bookingService'
import { db } from '../../services/storage'
import type { Booking, Branch, Instructor, School, Slot } from '../../types'
import { formatDateFull } from '../../utils/date'

type BookingFilter = 'all' | 'active' | 'cancelled' | 'completed'

interface BookingRow {
  booking: Booking
  slot: Slot | null
  branch: Branch | null
  instructor: Instructor | null
}

function sortRows(left: BookingRow, right: BookingRow): number {
  const leftValue = left.slot ? `${left.slot.date}T${left.slot.time}` : left.booking.createdAt
  const rightValue = right.slot ? `${right.slot.date}T${right.slot.time}` : right.booking.createdAt
  return rightValue.localeCompare(leftValue)
}

export function AdminBookings() {
  const { showToast } = useToast()
  const [school, setSchool] = useState<School | null>(null)
  const [rows, setRows] = useState<BookingRow[]>([])
  const [filter, setFilter] = useState<BookingFilter>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const currentSchool = db.schools.bySlug('virazh')
    if (!currentSchool) {
      return
    }

    setSchool(currentSchool)

    const nextRows = db.bookings
      .bySchool(currentSchool.id)
      .map((booking) => ({
        booking,
        slot: db.slots.byId(booking.slotId),
        branch: db.branches.byId(booking.branchId),
        instructor: db.instructors.byId(booking.instructorId),
      }))
      .sort(sortRows)

    setRows(nextRows)
  }, [])

  const counts = useMemo(
    () => ({
      all: rows.length,
      active: rows.filter((row) => row.booking.status === 'active').length,
      cancelled: rows.filter((row) => row.booking.status === 'cancelled').length,
      completed: rows.filter((row) => row.booking.status === 'completed').length,
    }),
    [rows],
  )

  const filteredRows = useMemo(() => {
    const searchValue = search.trim().toLowerCase()

    return rows.filter((row) => {
      if (filter !== 'all' && row.booking.status !== filter) {
        return false
      }

      if (!searchValue) {
        return true
      }

      return [
        row.booking.studentName,
        row.booking.studentPhone,
        row.branch?.name ?? '',
        row.instructor?.name ?? '',
        row.instructor?.car ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(searchValue)
    })
  }, [filter, rows, search])

  function updateRow(nextBooking: Booking): void {
    setRows((current) =>
      current
        .map((row) => (row.booking.id === nextBooking.id ? { ...row, booking: nextBooking } : row))
        .sort(sortRows),
    )
  }

  function handleCancel(bookingId: string): void {
    const result = cancelBooking(bookingId)
    if (!result.ok || !result.booking) {
      showToast(result.error ?? 'Не удалось отменить запись.', 'error')
      return
    }

    updateRow(result.booking)
    showToast('Запись отменена. Слот снова доступен.', 'success')
  }

  function handleComplete(bookingId: string): void {
    const result = completeBooking(bookingId)
    if (!result.ok || !result.booking) {
      showToast(result.error ?? 'Не удалось отметить запись как проведённую.', 'error')
      return
    }

    updateRow(result.booking)
    showToast('Запись отмечена как проведённая.', 'success')
  }

  return (
    <div className="max-w-[1320px] p-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">Admin</p>
        <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-stone-900">Bookings</h1>
            <p className="mt-1 text-sm text-stone-500">
              {school ? `${school.name} · управление статусами записей` : 'Управление статусами записей'}
            </p>
          </div>
        </div>
      </motion.div>

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full max-w-md">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Ученик, телефон, филиал, инструктор..."
            className="h-11 w-full rounded-2xl border border-stone-200 bg-white pl-10 pr-4 text-sm text-stone-900 outline-none transition focus:border-forest-400 focus:ring-2 focus:ring-forest-100"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {([
            ['all', 'Все'],
            ['active', 'Активные'],
            ['completed', 'Проведены'],
            ['cancelled', 'Отменены'],
          ] as Array<[BookingFilter, string]>).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                filter === key
                  ? 'border-forest-800 bg-forest-800 text-white'
                  : 'border-stone-200 bg-white text-stone-500 hover:border-forest-300 hover:text-stone-900'
              }`}
            >
              {label} · {counts[key]}
            </button>
          ))}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="mt-6 overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-card"
      >
        <div className="hidden grid-cols-[1.2fr_0.8fr_1fr_0.95fr_1fr_1fr_0.9fr_0.85fr_1.15fr] gap-4 border-b border-stone-100 bg-stone-50 px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400 xl:grid">
          <span>Дата</span>
          <span>Время</span>
          <span>Ученик</span>
          <span>Телефон</span>
          <span>Филиал</span>
          <span>Инструктор</span>
          <span>Машина</span>
          <span>Статус</span>
          <span>Действия</span>
        </div>

        {filteredRows.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-stone-500">Записи по текущему фильтру не найдены.</div>
        ) : (
          <div className="divide-y divide-stone-100">
            {filteredRows.map((row) => {
              const active = row.booking.status === 'active'
              const car = row.instructor?.car
                ? `${row.instructor.car}${row.instructor.transmission ? ` · ${row.instructor.transmission === 'manual' ? 'Механика' : 'Автомат'}` : ''}`
                : 'Не указано'

              return (
                <div key={row.booking.id} className="px-6 py-5">
                  <div className="hidden grid-cols-[1.2fr_0.8fr_1fr_0.95fr_1fr_1fr_0.9fr_0.85fr_1.15fr] items-center gap-4 xl:grid">
                    <div className="text-sm font-medium text-stone-900">{row.slot ? formatDateFull(row.slot.date) : 'Нет даты'}</div>
                    <div className="text-sm text-stone-600">{row.slot?.time ?? '—'}</div>
                    <div className="text-sm font-semibold text-stone-900">{row.booking.studentName}</div>
                    <div className="text-sm text-stone-600">{formatPhone(row.booking.studentPhone)}</div>
                    <div className="text-sm text-stone-600">{row.branch?.name ?? '—'}</div>
                    <div className="text-sm text-stone-600">{row.instructor?.name ?? '—'}</div>
                    <div className="text-sm text-stone-600">{car}</div>
                    <div>
                      <StatusBadge status={row.booking.status} />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={!active}
                        onClick={() => handleComplete(row.booking.id)}
                      >
                        <CheckCircle2 size={14} />
                        Проведено
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50"
                        disabled={!active}
                        onClick={() => handleCancel(row.booking.id)}
                      >
                        <XCircle size={14} />
                        Отменить
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4 xl:hidden">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-stone-900">{row.booking.studentName}</p>
                        <p className="mt-1 text-sm text-stone-500">{formatPhone(row.booking.studentPhone)}</p>
                      </div>
                      <StatusBadge status={row.booking.status} />
                    </div>

                    <div className="grid gap-2 text-sm text-stone-500 md:grid-cols-2">
                      <p>Дата: {row.slot ? formatDateFull(row.slot.date) : '—'}</p>
                      <p>Время: {row.slot?.time ?? '—'}</p>
                      <p>Филиал: {row.branch?.name ?? '—'}</p>
                      <p>Инструктор: {row.instructor?.name ?? '—'}</p>
                      <p>Машина: {car}</p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="flex-1"
                        disabled={!active}
                        onClick={() => handleComplete(row.booking.id)}
                      >
                        Проведено
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="flex-1 text-red-600 hover:bg-red-50"
                        disabled={!active}
                        onClick={() => handleCancel(row.booking.id)}
                      >
                        Отменить
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </motion.div>
    </div>
  )
}
