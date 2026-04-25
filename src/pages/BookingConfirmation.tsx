import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  MapPin,
  Phone,
  UserRound,
  XCircle,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { useToast } from '../components/ui/Toast'
import { formatPhone } from '../lib/utils'
import { generateIcs } from '../services/bookingService'
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

function loadBookingBundle(bookingId: string): BookingBundle | null {
  const booking = db.bookings.byId(bookingId)
  if (!booking) return null

  return {
    booking,
    slot: db.slots.byId(booking.slotId),
    instructor: db.instructors.byId(booking.instructorId),
    branch: db.branches.byId(booking.branchId),
    school: db.schools.byId(booking.schoolId),
  }
}

function DetailRow({
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
    <div className="flex items-start gap-4 border-b border-stone-100 px-5 py-4 last:border-b-0">
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest-50">
        <Icon size={18} className="text-forest-700" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-stone-500">{label}</p>
        <p className="mt-1 text-lg font-semibold leading-snug text-stone-900">{value}</p>
        {subtitle ? <p className="mt-1 text-base leading-snug text-stone-500">{subtitle}</p> : null}
      </div>
    </div>
  )
}

export function BookingConfirmation() {
  const { bookingId } = useParams<{ bookingId: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [bundle, setBundle] = useState<BookingBundle | null>(null)

  useEffect(() => {
    if (bookingId) setBundle(loadBookingBundle(bookingId))
  }, [bookingId])

  function handleDownloadIcs(): void {
    if (!bundle) return

    const content = generateIcs(bundle.booking.id)
    if (!content) {
      showToast('Не удалось подготовить файл календаря.', 'error')
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
    showToast('Файл календаря скачан.', 'success')
  }

  if (!bundle) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white px-6 py-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100">
            <XCircle size={28} className="text-stone-400" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold text-stone-900">Запись не найдена</h1>
          <p className="mt-2 text-base leading-relaxed text-stone-500">
            Проверьте ссылку или откройте страницу автошколы ещё раз.
          </p>
          <Button size="lg" className="mt-6 w-full min-h-14 text-lg" onClick={() => navigate('/school/virazh')}>
            К записи
          </Button>
        </div>
      </div>
    )
  }

  const { booking, branch, instructor, school, slot } = bundle
  const isCancelled = booking.status === 'cancelled'

  return (
    <div className="min-h-screen bg-stone-50">
      <main className="mx-auto flex min-h-screen max-w-xl flex-col px-4 py-6">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex min-h-[calc(100vh-3rem)] flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white"
        >
          <div className="px-6 pb-6 pt-8 text-center">
            <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${isCancelled ? 'bg-red-50' : 'bg-forest-50'}`}>
              {isCancelled ? (
                <XCircle size={30} className="text-red-500" />
              ) : (
                <CheckCircle2 size={30} className="text-forest-700" />
              )}
            </div>
            <p className="mt-5 text-base font-medium text-stone-500">{school?.name ?? 'Автошкола'}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
              {isCancelled ? 'Запись отменена' : 'Вы записаны'}
            </h1>
          </div>

          <div className="mx-6 overflow-hidden rounded-2xl border border-stone-200">
            {slot ? (
              <>
                <DetailRow label="Дата занятия" value={formatDateFull(slot.date)} icon={CalendarDays} />
                <DetailRow label="Время" value={slot.time} subtitle={`${slot.duration} минут`} icon={Clock3} />
              </>
            ) : null}
            {instructor ? (
              <DetailRow label="Инструктор" value={instructor.name} subtitle={instructor.car ?? undefined} icon={UserRound} />
            ) : null}
            {branch ? (
              <DetailRow label="Филиал" value={branch.name} subtitle={branch.address} icon={MapPin} />
            ) : null}
            <DetailRow label="Ученик" value={booking.studentName} subtitle={formatPhone(booking.studentPhone)} icon={Phone} />
          </div>

          <div className="mt-auto space-y-3 px-6 pb-6 pt-6">
            {!isCancelled ? (
              <Button
                size="lg"
                variant="secondary"
                className="w-full min-h-14 text-lg"
                onClick={handleDownloadIcs}
              >
                <Download size={20} />
                Добавить в календарь
              </Button>
            ) : null}
            <Button
              size="lg"
              className="w-full min-h-14 text-lg"
              onClick={() => navigate(`/school/${school?.slug ?? 'virazh'}`)}
            >
              Записаться ещё на занятие
            </Button>
          </div>
        </motion.section>
      </main>
    </div>
  )
}
