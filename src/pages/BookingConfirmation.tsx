import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CalendarPlus } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { StateView } from '../components/ui/StateView'
import { useToast } from '../components/ui/Toast'
import { BookingDetailsCard, SuccessHeader } from '../components/product/CompactCards'
import { generateIcs, getSlotDateTime } from '../services/bookingService'
import { db } from '../services/storage'
import { getBookingGroupFromSupabase } from '../services/supabasePublicService'
import type { Booking, Branch, Instructor, School, Slot } from '../types'

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

function escapeIcsValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

function formatUtcDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
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
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//DriveDesk//Booking Flow//RU', 'CALSCALE:GREGORIAN', ...events, 'END:VCALENDAR'].join('\r\n')
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
      .then((resolved) => setBundles(resolved))
      .catch(() => setBundles([]))
  }, [bookingId])

  function handleDownloadIcs(): void {
    if (bundles.length === 0) return
    const first = bundles[0]
    const content = bundles.length > 1 ? generateIcsFromBundles(bundles) : generateIcs(first.booking.id) ?? generateIcsFromBundles(bundles)
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
        <StateView kind="error" title="Запись не найдена" description="Проверьте ссылку или откройте страницу автошколы ещё раз." action={<Button onClick={() => navigate('/school/virazh')}>К записи</Button>} />
      </div>
    )
  }

  const firstBundle = bundles[0]
  const { booking, school } = firstBundle
  const activeBundles = bundles.filter((item) => item.booking.status !== 'cancelled')
  const isCancelled = activeBundles.length === 0
  const hasProfile = hasSavedStudentProfile(booking.schoolId, booking.studentPhone)
  const title = isCancelled ? (bundles.length > 1 ? 'Записи отменены' : 'Запись отменена') : 'Запись подтверждена'
  const subtitle = isCancelled ? 'Эта запись больше не активна.' : 'Мы сохранили вашу запись. Детали занятия ниже.'

  return (
    <div className="ui-shell">
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-3 px-4 py-4">
        <SuccessHeader title={title} subtitle={subtitle} />

        <div className="space-y-3">
          {bundles.map((item, index) => (
            <div key={item.booking.id} className="space-y-2">
              {bundles.length > 1 ? <p className="ui-kicker px-1">Занятие {index + 1}</p> : null}
              <BookingDetailsCard
                slot={item.slot}
                instructor={item.instructor}
                branch={item.branch}
                student={{ name: item.booking.studentName, phone: item.booking.studentPhone, email: item.booking.studentEmail }}
              />
            </div>
          ))}
        </div>

        <div className="mt-auto grid gap-2 pb-2 pt-2">
          <Button onClick={() => navigate(hasProfile ? '/student' : `/school/${school?.slug ?? 'virazh'}/book`)}>
            {hasProfile ? 'Мои записи' : 'К записи на занятие'}
          </Button>
          {!isCancelled ? (
            <Button variant="secondary" onClick={handleDownloadIcs}>
              <CalendarPlus size={18} />
              Добавить в календарь
            </Button>
          ) : null}
          <Button variant="ghost" onClick={() => navigate(`/school/${school?.slug ?? 'virazh'}`)}>Вернуться на страницу школы</Button>
        </div>
      </main>
    </div>
  )
}
