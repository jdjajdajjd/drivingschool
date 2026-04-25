import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  XCircle,
} from 'lucide-react'
import { Avatar } from '../components/ui/Avatar'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { formatPhone, pluralize } from '../lib/utils'
import { db } from '../services/storage'
import type { Booking, Branch, Instructor, Slot } from '../types'
import { formatDateFull } from '../utils/date'

interface BookingRow {
  booking: Booking
  slot: Slot | null
}

function sortAsc(left: BookingRow, right: BookingRow): number {
  const leftValue = left.slot ? `${left.slot.date}T${left.slot.time}` : left.booking.createdAt
  const rightValue = right.slot ? `${right.slot.date}T${right.slot.time}` : right.booking.createdAt
  return leftValue.localeCompare(rightValue)
}

function sortDesc(left: BookingRow, right: BookingRow): number {
  return sortAsc(right, left)
}

function Section({
  title,
  items,
  emptyLabel,
}: {
  title: string
  items: BookingRow[]
  emptyLabel: string
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <div className="border-b border-stone-100 px-5 py-4">
        <p className="text-sm font-semibold text-stone-900">{title}</p>
        <p className="mt-1 text-sm text-stone-500">{items.length} записей</p>
      </div>

      {items.length === 0 ? (
        <div className="px-5 py-12 text-center text-sm text-stone-500">{emptyLabel}</div>
      ) : (
        <div className="divide-y divide-stone-100">
          {items.map(({ booking, slot }) => (
            <div key={booking.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-stone-900">{booking.studentName}</p>
                <p className="text-sm text-stone-500">{formatPhone(booking.studentPhone)}</p>
              </div>

              <div className="space-y-1 text-sm text-stone-500 md:text-right">
                <p>{slot ? formatDateFull(slot.date) : 'Дата не найдена'}</p>
                <p>{slot?.time ?? '—'}</p>
              </div>

              <StatusBadge status={booking.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function InstructorPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [instructor, setInstructor] = useState<Instructor | null>(null)
  const [branch, setBranch] = useState<Branch | null>(null)
  const [rows, setRows] = useState<BookingRow[]>([])

  useEffect(() => {
    if (!token) {
      return
    }

    const currentInstructor = db.instructors.byToken(token)
    if (!currentInstructor) {
      setInstructor(null)
      setBranch(null)
      setRows([])
      return
    }

    setInstructor(currentInstructor)
    setBranch(db.branches.byId(currentInstructor.branchId))
    setRows(
      db.bookings
        .byInstructor(currentInstructor.id)
        .map((booking) => ({
          booking,
          slot: db.slots.byId(booking.slotId),
        }))
        .sort(sortAsc),
    )
  }, [token])

  const grouped = useMemo(() => {
    const now = Date.now()

    const upcoming = rows
      .filter((row) => {
        if (row.booking.status !== 'active') {
          return false
        }

        return row.slot ? new Date(`${row.slot.date}T${row.slot.time}:00`).getTime() >= now : true
      })
      .sort(sortAsc)

    const past = rows
      .filter((row) => {
        if (row.booking.status === 'cancelled') {
          return false
        }

        if (!row.slot) {
          return row.booking.status === 'completed'
        }

        return row.booking.status === 'completed' || new Date(`${row.slot.date}T${row.slot.time}:00`).getTime() < now
      })
      .sort(sortDesc)

    const cancelled = rows.filter((row) => row.booking.status === 'cancelled').sort(sortDesc)

    return { upcoming, past, cancelled }
  }, [rows])

  if (!instructor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 px-6">
        <div className="max-w-md rounded-2xl border border-stone-200 bg-white px-6 py-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50">
            <XCircle size={26} className="text-red-500" />
          </div>
          <p className="mt-5 text-xl font-semibold text-stone-900">Инструктор не найден</p>
          <p className="mt-2 text-sm leading-relaxed text-stone-500">
            Токен недействителен или инструкция ещё не была добавлена в локальные данные.
          </p>
          <Button className="mt-6 w-full" onClick={() => navigate('/')}>
            На главную
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(22,59,41,0.08),_transparent_32%),linear-gradient(180deg,#fafaf9_0%,#f5f5f4_100%)]">
      <header className="sticky top-0 z-30 border-b border-white/70 bg-stone-50/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-sm text-stone-500 transition hover:text-stone-900"
          >
            <ArrowLeft size={16} />
            Назад
          </button>
          <p className="text-sm font-semibold text-stone-900">Кабинет инструктора</p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                <Avatar initials={instructor.avatarInitials} color={instructor.avatarColor} size="xl" />
                <div>
                  <p className="text-3xl font-semibold tracking-tight text-stone-900">{instructor.name}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {instructor.categories.map((category) => (
                      <Badge key={category} variant="outline">
                        кат. {category}
                      </Badge>
                    ))}
                    <Badge variant={instructor.isActive ? 'success' : 'default'}>
                      {instructor.isActive ? 'Принимает записи' : 'Не принимает записи'}
                    </Badge>
                  </div>
                  <p className="mt-4 max-w-2xl text-sm leading-relaxed text-stone-500">{instructor.bio}</p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 lg:w-[320px]">
                <div className="rounded-2xl bg-stone-50 px-4 py-4">
                  <p className="text-sm font-semibold text-stone-900">{formatPhone(instructor.phone)}</p>
                  <p className="mt-1 text-sm text-stone-500">Контактный номер</p>
                </div>
                <div className="rounded-2xl bg-stone-50 px-4 py-4">
                  <p className="text-sm font-semibold text-stone-900">{branch?.name ?? 'Филиал не найден'}</p>
                  <p className="mt-1 text-sm text-stone-500">{branch?.address ?? 'Адрес не указан'}</p>
                </div>
                <div className="rounded-2xl bg-stone-50 px-4 py-4">
                  <p className="text-sm font-semibold text-stone-900">{instructor.car ?? 'Автомобиль не указан'}</p>
                  <p className="mt-1 text-sm text-stone-500">
                    {instructor.transmission === 'manual' ? 'Механика' : instructor.transmission === 'auto' ? 'Автомат' : 'Тип КПП не указан'}
                  </p>
                </div>
                <div className="rounded-2xl bg-stone-50 px-4 py-4">
                  <p className="text-sm font-semibold text-stone-900">{pluralize(grouped.upcoming.length, 'ближайшее занятие', 'ближайших занятия', 'ближайших занятий')}</p>
                  <p className="mt-1 text-sm text-stone-500">Активные будущие записи</p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Section title="Ближайшие занятия" items={grouped.upcoming} emptyLabel="На ближайшие дни занятий нет" />
          <Section title="Прошедшие занятия" items={grouped.past} emptyLabel="Нет прошедших занятий." />
          <Section title="Отменённые" items={grouped.cancelled} emptyLabel="Нет отменённых записей." />
        </div>
      </main>
    </div>
  )
}
