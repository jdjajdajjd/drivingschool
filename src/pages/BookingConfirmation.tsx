import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CalendarPlus, UserRound } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '../components/ui/Button'
import { StateView } from '../components/ui/StateView'
import { useToast } from '../components/ui/Toast'
import { BookingDetailsCard, SuccessHeader } from '../components/product/CompactCards'
import { generateIcs, getSlotDateTime } from '../services/bookingService'
import { db } from '../services/storage'
import { saveStudentProfile } from '../services/studentProfile'
import { getBookingGroupFromSupabase } from '../services/supabasePublicService'
import type { Booking, Branch, Instructor, School, Slot } from '../types'

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
    showToast('Файл календаря готов.', 'success')
  }

  function createCabinetFromBooking() {
    const first = bundles[0]
    if (!first?.school) return
    saveStudentProfile(
      first.school.id,
      { name: first.booking.studentName, phone: first.booking.studentPhone, email: first.booking.studentEmail },
      { passwordSet: false, assignedBranchId: first.branch?.id },
    )
    navigate('/student')
  }

  if (bundles.length === 0) {
    return (
      <div className="shell flex min-h-screen items-center justify-center px-4">
        <StateView kind="error" title="Запись не найдена" description="Проверьте ссылку или вернитесь в кабинет ученика." action={<Button onClick={() => navigate('/student')}>В кабинет</Button>} />
      </div>
    )
  }

  const activeBundles = bundles.filter((item) => item.booking.status !== 'cancelled')
  const isCancelled = activeBundles.length === 0
  const title = isCancelled ? (bundles.length > 1 ? 'Записи отменены' : 'Запись отменена') : 'Запись подтверждена'
  const subtitle = isCancelled ? 'Эта запись больше не активна.' : 'Мы сохранили вашу запись. Если нужно, автошкола свяжется с вами.'

  return (
    <div className="shell">
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-3 overflow-x-hidden px-4 py-4">
        <SuccessHeader title={title} subtitle={subtitle} />

        <div className="space-y-3">
          {bundles.map((item, index) => (
            <motion.div key={item.booking.id} className="space-y-2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: index * 0.04 }}>
              {bundles.length > 1 ? <p className="caption px-1">Занятие {index + 1}</p> : null}
              <BookingDetailsCard
                slot={item.slot}
                instructor={item.instructor}
                branch={item.branch}
                student={{ name: item.booking.studentName, phone: item.booking.studentPhone, email: item.booking.studentEmail }}
              />
            </motion.div>
          ))}
        </div>

        <div className="mt-auto grid gap-2 pb-2 pt-2">
          {!isCancelled ? (
            <Button onClick={handleDownloadIcs}>
              <CalendarPlus size={18} />
              Добавить в календарь
            </Button>
          ) : null}
          <Button variant="secondary" onClick={() => navigate('/student/book')}>Записаться ещё</Button>
          <Button variant="ghost" onClick={() => navigate('/student')}>В кабинет</Button>
        </div>

        {!isCancelled ? (
          <div className="rounded-2xl border rgba(246,184,77,0.20) rgba(196,147,90,0.12) p-4 ">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl white #9B7034 ">
                <UserRound size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold leading-[22px] #111418">Создать кабинет?</p>
                <p className="mt-1 text-[13px] font-medium leading-5 #6F747A">Эта запись появится в вашем кабинете, а следующая запись будет быстрее.</p>
              </div>
            </div>
            <Button className="mt-4 w-full" variant="secondary" onClick={createCabinetFromBooking}>Создать кабинет</Button>
          </div>
        ) : null}
      </main>
    </div>
  )
}
