import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Clock3,
  MapPin,
  Phone,
  UserRound,
  XCircle,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { useToast } from '../components/ui/Toast'
import { formatDuration, formatPhone } from '../lib/utils'
import { generateIcs, getSlotDateTime } from '../services/bookingService'
import { db } from '../services/storage'
import { getBookingGroupFromSupabase } from '../services/supabasePublicService'
import type { Booking, Branch, Instructor, School, Slot } from '../types'
import { formatDateFull } from '../utils/date'

interface BookingBundle {
  booking: Booking
  slot: Slot | null
  instructor: Instructor | null
  branch: Branch | null
  school: School | null
}

function hasSavedStudentProfile(schoolId: string, phone: string): boolean {
  try {
    const raw = localStorage.getItem(`dd:student_profile:${schoolId}`)
    if (!raw) return false
    const profile = JSON.parse(raw) as { phone?: string; createdByConsent?: boolean }
    return Boolean(profile.createdByConsent && profile.phone === phone)
  } catch {
    return false
  }
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

function loadBookingGroup(bookingId: string): BookingBundle[] {
  const first = loadBookingBundle(bookingId)
  if (!first) return []

  const groupId = first.booking.bookingGroupId
  const bookings = groupId
    ? db.bookings.bySchool(first.booking.schoolId).filter((booking) => booking.bookingGroupId === groupId)
    : [first.booking]

  return bookings
    .map((booking) => ({
      booking,
      slot: db.slots.byId(booking.slotId),
      instructor: db.instructors.byId(booking.instructorId),
      branch: db.branches.byId(booking.branchId),
      school: db.schools.byId(booking.schoolId),
    }))
    .sort((left, right) => {
      const leftTime = left.slot ? getSlotDateTime(left.slot).getTime() : 0
      const rightTime = right.slot ? getSlotDateTime(right.slot).getTime() : 0
      return leftTime - rightTime
    })
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
    <div className="flex items-start gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0">
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
        <Icon size={18} className="text-blue-700" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-500">{label}</p>
        <p className="mt-1 text-lg font-black leading-snug text-ink-900">{value}</p>
        {subtitle ? <p className="mt-1 text-base leading-snug text-slate-600">{subtitle}</p> : null}
      </div>
    </div>
  )
}

function escapeIcsValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

function formatUtcDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function generateIcsFromBundle(bundle: BookingBundle): string | null {
  if (!bundle.slot || !bundle.instructor || !bundle.branch || !bundle.school) return null

  const start = getSlotDateTime(bundle.slot)
  const end = new Date(start.getTime() + bundle.slot.duration * 60_000)
  const description = [
    `Автошкола: ${bundle.school.name}`,
    `Инструктор: ${bundle.instructor.name}`,
    `Ученик: ${bundle.booking.studentName}`,
    bundle.instructor.car ? `Автомобиль: ${bundle.instructor.car}` : '',
  ].filter(Boolean).join('\n')

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DriveDesk//Booking Flow//RU',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${bundle.booking.id}@drivedesk`,
    `DTSTAMP:${formatUtcDate(new Date())}`,
    `DTSTART:${formatUtcDate(start)}`,
    `DTEND:${formatUtcDate(end)}`,
    `SUMMARY:${escapeIcsValue(`Занятие: ${bundle.instructor.name}`)}`,
    `LOCATION:${escapeIcsValue(bundle.branch.address)}`,
    `DESCRIPTION:${escapeIcsValue(description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

function generateIcsFromBundles(bundles: BookingBundle[]): string | null {
  const events = bundles
    .map((bundle) => {
      if (!bundle.slot || !bundle.instructor || !bundle.branch || !bundle.school) return null

      const start = getSlotDateTime(bundle.slot)
      const end = new Date(start.getTime() + bundle.slot.duration * 60_000)
      const description = [
        `Автошкола: ${bundle.school.name}`,
        `Инструктор: ${bundle.instructor.name}`,
        `Ученик: ${bundle.booking.studentName}`,
        bundle.instructor.car ? `Автомобиль: ${bundle.instructor.car}` : '',
      ].filter(Boolean).join('\n')

      return [
        'BEGIN:VEVENT',
        `UID:${bundle.booking.id}@drivedesk`,
        `DTSTAMP:${formatUtcDate(new Date())}`,
        `DTSTART:${formatUtcDate(start)}`,
        `DTEND:${formatUtcDate(end)}`,
        `SUMMARY:${escapeIcsValue(`Занятие: ${bundle.instructor.name}`)}`,
        `LOCATION:${escapeIcsValue(bundle.branch.address)}`,
        `DESCRIPTION:${escapeIcsValue(description)}`,
        'END:VEVENT',
      ].join('\r\n')
    })
    .filter(Boolean)

  if (events.length === 0) return null

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DriveDesk//Booking Flow//RU',
    'CALSCALE:GREGORIAN',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n')
}

export function BookingConfirmation() {
  const { bookingId } = useParams<{ bookingId: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [bundles, setBundles] = useState<BookingBundle[]>([])

  useEffect(() => {
    if (!bookingId) return

    const localGroup = loadBookingGroup(bookingId)
    if (localGroup.length > 0) {
      setBundles(localGroup)
      return
    }

    void getBookingGroupFromSupabase(bookingId)
      .then((resolved) => {
        if (resolved.length === 0) {
          setBundles([])
          return
        }
        setBundles(resolved)
      })
      .catch(() => setBundles([]))
  }, [bookingId])

  function handleDownloadIcs(): void {
    if (bundles.length === 0) return

    const first = bundles[0]
    const content = bundles.length > 1
      ? generateIcsFromBundles(bundles)
      : generateIcs(first.booking.id) ?? generateIcsFromBundle(first)
    if (!content) {
      showToast('Не удалось подготовить файл календаря.', 'error')
      return
    }

    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = bundles.length > 1 ? `${first.booking.bookingGroupId ?? first.booking.id}.ics` : `${first.booking.id}.ics`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showToast('Файл календаря скачан.', 'success')
  }

  if (bundles.length === 0) {
    return (
      <div className="ui-shell flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center shadow-card">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <XCircle size={28} className="text-slate-400" />
          </div>
          <h1 className="mt-5 text-2xl font-black text-ink-900">Запись не найдена</h1>
          <p className="mt-2 text-base leading-relaxed text-slate-600">
            Проверьте ссылку или откройте страницу автошколы ещё раз.
          </p>
          <Button size="lg" className="mt-6 w-full min-h-14 text-lg" onClick={() => navigate('/school/virazh')}>
            К записи
          </Button>
        </div>
      </div>
    )
  }

  const firstBundle = bundles[0]
  const { booking, school } = firstBundle
  const activeBundles = bundles.filter((item) => item.booking.status !== 'cancelled')
  const isCancelled = activeBundles.length === 0
  const hasProfile = hasSavedStudentProfile(booking.schoolId, booking.studentPhone)
  const lessonCount = bundles.length

  return (
    <div className="ui-shell">
      <main className="mx-auto flex min-h-screen max-w-xl flex-col px-4 py-6">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex min-h-[calc(100vh-3rem)] flex-col overflow-hidden rounded-[1.65rem] border border-slate-200 bg-white shadow-card"
        >
          <div className="bg-blue-800 px-6 pb-7 pt-8 text-center text-white">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
              {isCancelled ? <XCircle size={30} className="text-red-100" /> : <CheckCircle2 size={30} />}
            </div>
            <p className="mt-5 text-base font-bold text-white/75">{school?.name ?? 'Автошкола'}</p>
            <h1 className="mt-2 text-3xl font-black tracking-normal">
              {isCancelled
                ? lessonCount > 1 ? 'Записи отменены' : 'Запись отменена'
                : lessonCount > 1 ? 'Вы записаны на занятия' : 'Вы записаны'}
            </h1>
            {!isCancelled ? (
              <p className="mx-auto mt-2 max-w-sm text-base leading-relaxed text-white/78">
                {hasProfile
                  ? 'Профиль создан. Следующая запись будет быстрее.'
                  : lessonCount > 1
                    ? `${lessonCount} занятия сохранены одной записью. Если нужно, автошкола свяжется с вами по телефону.`
                    : 'Данные записи сохранены. Если нужно, автошкола свяжется с вами по телефону.'}
              </p>
            ) : null}
          </div>

          <div className="mx-6 mt-6 overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
            {bundles.map((item, index) => (
              <div key={item.booking.id} className={index < bundles.length - 1 ? 'border-b border-slate-200' : ''}>
                <div className="bg-slate-50 px-5 py-3">
                  <p className="text-sm font-black text-slate-700">
                    {lessonCount > 1 ? `Занятие ${index + 1}` : 'Занятие'}
                  </p>
                </div>
                {item.slot ? (
                  <>
                    <DetailRow label="Дата занятия" value={formatDateFull(item.slot.date)} icon={CalendarDays} />
                    <DetailRow label="Время" value={item.slot.time} subtitle={formatDuration(item.slot.duration)} icon={Clock3} />
                  </>
                ) : null}
                {item.instructor ? (
                  <DetailRow label="Инструктор" value={item.instructor.name} subtitle={item.instructor.car ?? undefined} icon={UserRound} />
                ) : null}
                {item.branch ? (
                  <DetailRow label="Филиал" value={item.branch.name} subtitle={item.branch.address} icon={MapPin} />
                ) : null}
              </div>
            ))}
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
                <CalendarPlus size={20} />
                Добавить в календарь
              </Button>
            ) : null}
            <Button
              size="lg"
              className="w-full min-h-14 text-lg"
              onClick={() => navigate(`/school/${school?.slug ?? 'virazh'}`)}
            >
              {hasProfile ? 'В профиль ученика' : 'К записи на занятие'}
            </Button>
          </div>
        </motion.section>
      </main>
    </div>
  )
}
