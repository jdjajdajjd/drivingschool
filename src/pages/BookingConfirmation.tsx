import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Car,
  CheckCircle2,
  Clock3,
  Download,
  MapPin,
  Phone,
  UserRound,
  XCircle,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { StatusBadge } from '../components/ui/Badge'
import { useToast } from '../components/ui/Toast'
import { formatPhone } from '../lib/utils'
import { cancelBooking, generateIcs } from '../services/bookingService'
import { db } from '../services/storage'
import type { Booking, Branch, Instructor, School, Slot } from '../types'
import { formatDateFull } from '../utils/date'

interface BookingBundle {
  booking: Booking
  slot: Slot | null
  instructor: Instructor | null
  branch: Branch | null
  school: School | null
}

function ConfirmCancelModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.22 }}
        className="w-full max-w-md rounded-[28px] border border-stone-200 bg-white p-6 shadow-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50">
            <AlertTriangle size={18} className="text-red-500" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-stone-900">Отменить запись?</p>
            <p className="mt-2 text-sm leading-relaxed text-stone-500">
              Запись перейдёт в статус «Отменена», а слот снова станет доступным для бронирования.
            </p>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Button variant="danger" className="flex-1" onClick={onConfirm}>
            Отменить запись
          </Button>
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Назад
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function DetailTile({
  label,
  value,
  icon: Icon,
  subtitle,
}: {
  label: string
  value: string
  subtitle?: string
  icon: typeof CalendarDays
}) {
  return (
    <div className="rounded-[24px] border border-stone-100 bg-stone-50 px-4 py-4">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-soft">
        <Icon size={16} className="text-forest-700" />
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-stone-900">{value}</p>
      {subtitle ? <p className="mt-1 text-xs text-stone-500">{subtitle}</p> : null}
    </div>
  )
}

function loadBookingBundle(bookingId: string): BookingBundle | null {
  const booking = db.bookings.byId(bookingId)
  if (!booking) {
    return null
  }

  return {
    booking,
    slot: db.slots.byId(booking.slotId),
    instructor: db.instructors.byId(booking.instructorId),
    branch: db.branches.byId(booking.branchId),
    school: db.schools.byId(booking.schoolId),
  }
}

export function BookingConfirmation() {
  const { bookingId } = useParams<{ bookingId: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [bundle, setBundle] = useState<BookingBundle | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)

  useEffect(() => {
    if (!bookingId) {
      return
    }

    setBundle(loadBookingBundle(bookingId))
  }, [bookingId])

  const transmissionLabel = useMemo(() => {
    if (!bundle?.instructor?.transmission) {
      return 'Не указана'
    }

    return bundle.instructor.transmission === 'manual' ? 'Механика' : 'Автомат'
  }, [bundle])

  function handleDownloadIcs(): void {
    if (!bundle) {
      return
    }

    const content = generateIcs(bundle.booking.id)
    if (!content) {
      showToast('Не удалось подготовить .ics файл.', 'error')
      return
    }

    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${bundle.booking.id}.ics`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showToast('.ics файл скачан.', 'success')
  }

  function handleCancel(): void {
    if (!bundle) {
      return
    }

    const result = cancelBooking(bundle.booking.id)
    setShowCancelModal(false)

    if (!result.ok || !result.booking) {
      showToast(result.error ?? 'Не удалось отменить запись.', 'error')
      return
    }

    const nextBundle = loadBookingBundle(result.booking.id)
    setBundle(nextBundle)
    showToast('Запись отменена. Слот снова доступен.', 'success')
  }

  if (!bundle) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 px-6">
        <div className="max-w-sm rounded-[32px] border border-stone-200 bg-white px-6 py-8 text-center shadow-card">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-stone-100">
            <XCircle size={26} className="text-stone-400" />
          </div>
          <p className="mt-5 text-xl font-semibold text-stone-900">Запись не найдена</p>
          <p className="mt-2 text-sm leading-relaxed text-stone-500">
            Ссылка может быть устаревшей или запись уже недоступна в локальном хранилище.
          </p>
          <Button className="mt-6 w-full" onClick={() => navigate('/school/virazh')}>
            К странице автошколы
          </Button>
        </div>
      </div>
    )
  }

  const { booking, branch, instructor, school, slot } = bundle
  const canCancel = booking.status === 'active'

  return (
    <>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(22,59,41,0.08),_transparent_30%),linear-gradient(180deg,#fafaf9_0%,#f5f5f4_100%)]">
        <header className="sticky top-0 z-30 border-b border-white/70 bg-stone-50/85 backdrop-blur-xl">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 text-sm text-stone-500 transition hover:text-stone-900"
            >
              <ArrowLeft size={16} />
              Назад
            </button>
            <div className="text-right">
              <p className="text-sm font-semibold text-stone-900">{school?.name ?? 'Автошкола'}</p>
              <p className="text-xs text-stone-500">Подтверждение записи</p>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-4xl px-6 py-10">
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-[32px] border border-stone-200/80 bg-white/90 shadow-card"
          >
            <div className="border-b border-stone-100 px-6 py-7 text-center">
              <div
                className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
                  booking.status === 'cancelled' ? 'bg-red-50' : booking.status === 'completed' ? 'bg-stone-100' : 'bg-forest-50'
                }`}
              >
                {booking.status === 'cancelled' ? (
                  <XCircle size={28} className="text-red-500" />
                ) : (
                  <CheckCircle2
                    size={28}
                    className={booking.status === 'completed' ? 'text-stone-500' : 'text-forest-700'}
                  />
                )}
              </div>
              <div className="mt-4 flex justify-center">
                <StatusBadge status={booking.status} />
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-stone-900">
                {booking.status === 'cancelled'
                  ? 'Запись отменена'
                  : booking.status === 'completed'
                    ? 'Занятие отмечено проведённым'
                    : 'Вы записаны'}
              </h1>
              <p className="mt-2 text-sm text-stone-500">ID записи: {booking.id}</p>
            </div>

            <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="space-y-6">
                <div className="grid gap-3 md:grid-cols-2">
                  {slot ? (
                    <>
                      <DetailTile label="Дата" value={formatDateFull(slot.date)} subtitle={formatDateFull(slot.date)} icon={CalendarDays} />
                      <DetailTile label="Время" value={slot.time} subtitle={`${slot.duration} минут`} icon={Clock3} />
                    </>
                  ) : null}
                  {branch ? (
                    <DetailTile label="Филиал" value={branch.name} subtitle={branch.address} icon={MapPin} />
                  ) : null}
                  {instructor ? (
                    <DetailTile
                      label="Инструктор"
                      value={instructor.name}
                      subtitle={instructor.phone ? formatPhone(instructor.phone) : 'Телефон не указан'}
                      icon={UserRound}
                    />
                  ) : null}
                  <DetailTile label="Ученик" value={booking.studentName} subtitle={formatPhone(booking.studentPhone)} icon={Phone} />
                  <DetailTile
                    label="Создана"
                    value={new Date(booking.createdAt).toLocaleString('ru-RU')}
                    subtitle="Дата и время сохранения"
                    icon={CheckCircle2}
                  />
                  <DetailTile
                    label="Коробка"
                    value={transmissionLabel}
                    subtitle={instructor?.car ?? 'Автомобиль не указан'}
                    icon={Car}
                  />
                </div>

                <div className="rounded-[28px] border border-stone-100 bg-stone-50 px-5 py-5">
                  <p className="text-sm font-semibold text-stone-900">Что можно сделать дальше</p>
                  <p className="mt-2 text-sm leading-relaxed text-stone-500">
                    {booking.status === 'cancelled'
                      ? 'Запись отменена. Слот снова доступен для записи.'
                      : 'Сохраните событие в календарь через `.ics`, а если планы изменились, отмените запись прямо с этой страницы.'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-[28px] border border-stone-100 bg-stone-50 px-5 py-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">Авто</p>
                  <p className="mt-2 text-sm font-semibold text-stone-900">{instructor?.car ?? 'Не указано'}</p>
                  <p className="mt-1 text-sm text-stone-500">{transmissionLabel}</p>
                </div>

                <Button variant="secondary" className="w-full" onClick={handleDownloadIcs}>
                  <Download size={16} />
                  Скачать .ICS
                </Button>

                {canCancel ? (
                  <Button
                    variant="ghost"
                    className="w-full text-red-600 hover:bg-red-50"
                    onClick={() => setShowCancelModal(true)}
                  >
                    <XCircle size={16} />
                    Отменить запись
                  </Button>
                ) : null}

                <Button className="w-full" onClick={() => navigate(`/school/${school?.slug ?? 'virazh'}`)}>
                  Новая запись
                </Button>
              </div>
            </div>
          </motion.section>
        </main>
      </div>

      <AnimatePresence>
        {showCancelModal ? (
          <ConfirmCancelModal onClose={() => setShowCancelModal(false)} onConfirm={handleCancel} />
        ) : null}
      </AnimatePresence>
    </>
  )
}
