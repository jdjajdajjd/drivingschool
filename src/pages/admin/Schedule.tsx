import { Fragment, useMemo, useState } from 'react'
import { addDays, eachDayOfInterval, format, isSameDay, startOfWeek } from 'date-fns'
import { ru } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { db } from '../../services/storage'
import { getSlotDateTime } from '../../services/bookingService'
import { ADMIN_BASE_PATH } from '../../services/accessControl'
import { Modal } from '../../components/ui/Modal'
import { createAuditEntry } from '../../services/adminStorage'
import type { Booking, Slot } from '../../types'

type ViewMode = 'day' | 'week'

const HOURS = Array.from({ length: 14 }, (_, index) => `${String(index + 7).padStart(2, '0')}:00`)

function statusClass(status: Slot['status']) {
  if (status === 'available') return 'border-[#BFE7CF] bg-[#EAF7EF] text-[#157347]'
  if (status === 'cancelled') return 'border-[#DCE2E8] bg-[#EEF2F5] text-[#66717D]'
  return 'border-[#BFD1FF] bg-[#EEF4FF] text-[#2457C5]'
}

export function AdminSchedule() {
  const school = db.schools.all()[0]
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('')

  const data = useMemo(() => {
    if (!school) return { slots: [] as Slot[], bookings: [] as Booking[], instructors: db.instructors.all(), branches: db.branches.all() }
    return {
      slots: db.slots.bySchool(school.id),
      bookings: db.bookings.bySchool(school.id),
      instructors: db.instructors.bySchool(school.id),
      branches: db.branches.bySchool(school.id),
    }
  }, [school?.id])

  const viewRange = useMemo(() => {
    if (viewMode === 'day') return [selectedDate]
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end: addDays(start, 6) })
  }, [viewMode, selectedDate])

  const selectedSlot = selectedSlotId ? data.slots.find((slot) => slot.id === selectedSlotId) ?? null : null
  const selectedBooking = selectedSlot?.bookingId ? data.bookings.find((booking) => booking.id === selectedSlot.bookingId) ?? null : null
  const selectedInstructor = selectedSlot ? data.instructors.find((item) => item.id === selectedSlot.instructorId) ?? null : null
  const selectedBranch = selectedSlot ? data.branches.find((item) => item.id === selectedSlot.branchId) ?? null : null

  const dailySummary = viewRange.map((date) => {
    const dateKey = format(date, 'yyyy-MM-dd')
    const slots = data.slots.filter((slot) => slot.date === dateKey)
    return {
      date,
      total: slots.length,
      booked: slots.filter((slot) => slot.status === 'booked').length,
      free: slots.filter((slot) => slot.status === 'available').length,
      cancelled: slots.filter((slot) => slot.status === 'cancelled').length,
    }
  })

  const getSlotsForCell = (date: Date, hour: string) => {
    const key = format(date, 'yyyy-MM-dd')
    const prefix = hour.split(':')[0]
    return data.slots
      .filter((slot) => slot.date === key && slot.time.startsWith(prefix))
      .sort((left, right) => left.time.localeCompare(right.time))
  }

  const handleCancel = () => {
    if (!school || !selectedSlot || !selectedBooking) return
    db.slots.upsert({ ...selectedSlot, status: 'cancelled' })
    db.bookings.upsert({
      ...selectedBooking,
      status: 'cancelled',
      cancellationReason: cancelReason || 'Отменено администратором',
      cancelledBy: 'school',
    })
    createAuditEntry(
      school.id,
      'admin',
      'Администратор',
      'booking_cancelled',
      'booking',
      selectedBooking.id,
      `Отменено занятие: ${selectedBooking.studentName} на ${format(getSlotDateTime(selectedSlot), 'dd.MM.yyyy HH:mm')}`,
      'status: booked',
      `status: cancelled, reason: ${cancelReason || 'Не указана'}`,
    )
    setShowCancelModal(false)
    setSelectedSlotId(null)
    setCancelReason('')
  }

  const handleReschedule = () => {
    if (!school || !selectedSlot || !selectedBooking || !rescheduleDate || !rescheduleTime) return
    const newSlot = data.slots.find((slot) =>
      slot.date === rescheduleDate &&
      slot.time === rescheduleTime &&
      slot.instructorId === selectedSlot.instructorId &&
      slot.status === 'available',
    )
    if (!newSlot) {
      alert('Свободный слот на это время не найден. Сначала создайте окно в расписании.')
      return
    }
    db.slots.upsert({ ...newSlot, status: 'booked', bookingId: selectedBooking.id })
    db.slots.upsert({ ...selectedSlot, status: 'available', bookingId: undefined })
    createAuditEntry(
      school.id,
      'admin',
      'Администратор',
      'booking_rescheduled',
      'booking',
      selectedBooking.id,
      `Перенесено занятие: ${selectedBooking.studentName} на ${rescheduleDate} ${rescheduleTime}`,
    )
    setShowRescheduleModal(false)
    setSelectedSlotId(null)
    setRescheduleDate('')
    setRescheduleTime('')
  }

  const handleNoShow = () => {
    if (!school || !selectedBooking) return
    db.bookings.upsert({ ...selectedBooking, status: 'no_show' })
    createAuditEntry(school.id, 'admin', 'Администратор', 'booking_no_show', 'booking', selectedBooking.id, `Отмечена неявка: ${selectedBooking.studentName}`)
    setSelectedSlotId(null)
  }

  const handleComplete = () => {
    if (!school || !selectedSlot || !selectedBooking) return
    db.bookings.upsert({
      ...selectedBooking,
      status: 'completed',
      confirmedHours: (selectedBooking.confirmedHours ?? 0) + selectedSlot.duration,
    })
    createAuditEntry(school.id, 'admin', 'Администратор', 'booking_completed', 'booking', selectedBooking.id, `Занятие засчитано: ${selectedBooking.studentName}`)
    setSelectedSlotId(null)
  }

  if (!school) return null

  return (
    <div className="flex h-full flex-col">
      <div className="v-admin-toolbar">
        <div>
          <h1 className="v-admin-heading">Расписание</h1>
          <p className="v-admin-note mt-1">{format(selectedDate, 'LLLL yyyy', { locale: ru })} · окна, записи и статусы занятий</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button onClick={() => setSelectedDate((date) => addDays(date, viewMode === 'day' ? -1 : -7))} className="v-admin-button-secondary px-3" aria-label="Назад">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => setSelectedDate(new Date())} className="v-admin-button-secondary">Сегодня</button>
          <button onClick={() => setSelectedDate((date) => addDays(date, viewMode === 'day' ? 1 : 7))} className="v-admin-button-secondary px-3" aria-label="Вперёд">
            <ChevronRight size={16} />
          </button>
          <div className="flex rounded-[10px] border border-[#DCE2E8] bg-white p-1">
            {(['day', 'week'] as ViewMode[]).map((mode) => (
              <button key={mode} onClick={() => setViewMode(mode)} className={`rounded-[7px] px-3 py-2 text-[13px] font-black ${viewMode === mode ? 'bg-[#101418] text-white' : 'text-[#66717D]'}`}>
                {mode === 'day' ? 'День' : 'Неделя'}
              </button>
            ))}
          </div>
          <button className="v-admin-button">
            <Plus size={16} />
            Создать окна
          </button>
        </div>
      </div>

      <div className="grid gap-3 border-b border-[#DCE2E8] bg-white p-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {dailySummary.map((day) => (
          <button
            key={day.date.toISOString()}
            onClick={() => { setSelectedDate(day.date); setViewMode('day') }}
            className={`rounded-[10px] border p-3 text-left transition hover:border-[#B8C2CC] ${isSameDay(day.date, new Date()) ? 'border-[#101418] bg-[#F7F9FB]' : 'border-[#DCE2E8] bg-white'}`}
          >
            <span className="block text-[12px] font-black uppercase text-[#66717D]">{format(day.date, 'EEEEEE', { locale: ru })}</span>
            <strong className="mt-1 block text-[22px] font-black text-[#111418]">{format(day.date, 'd MMM', { locale: ru })}</strong>
            <span className="mt-2 flex gap-2 text-[12px] font-black">
              <span className="text-[#2457C5]">{day.booked} занято</span>
              <span className="text-[#157347]">{day.free} свободно</span>
            </span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto bg-[#F3F5F7] p-3 md:p-5">
        <div className="v-admin-panel min-w-[880px] overflow-hidden">
          <div className="grid bg-[#F7F9FB]" style={{ gridTemplateColumns: viewMode === 'day' ? '80px minmax(0,1fr)' : '80px repeat(7,minmax(128px,1fr))' }}>
            <div className="border-b border-r border-[#DCE2E8]" />
            {viewRange.map((date) => (
              <div key={date.toISOString()} className={`border-b border-r border-[#DCE2E8] p-3 text-center ${isSameDay(date, new Date()) ? 'bg-[#EEF4FF]' : ''}`}>
                <p className="text-[11px] font-black uppercase text-[#66717D]">{format(date, 'EEE', { locale: ru })}</p>
                <p className="text-[22px] font-black leading-none text-[#111418]">{format(date, 'd')}</p>
              </div>
            ))}

            {HOURS.map((hour) => (
              <Fragment key={hour}>
                <div className="flex min-h-[68px] items-start justify-end border-r border-[#DCE2E8] px-3 py-3 text-[12px] font-black text-[#8D98A4]">
                  {hour}
                </div>
                {viewRange.map((date) => {
                  const cellSlots = getSlotsForCell(date, hour)
                  return (
                    <div key={`${date.toISOString()}-${hour}`} className="min-h-[68px] border-r border-t border-[#EEF2F5] bg-white p-1.5">
                      <div className="grid gap-1.5">
                        {cellSlots.map((slot) => {
                          const booking = slot.bookingId ? data.bookings.find((item) => item.id === slot.bookingId) ?? null : null
                          const instructor = data.instructors.find((item) => item.id === slot.instructorId)
                          return (
                            <button
                              key={slot.id}
                              onClick={() => setSelectedSlotId(slot.id)}
                              className={`rounded-[8px] border px-2.5 py-2 text-left text-[12px] font-black leading-4 transition hover:brightness-[0.98] ${statusClass(slot.status)}`}
                            >
                              <span className="block truncate">{booking?.studentName ?? `Свободно · ${slot.duration} мин`}</span>
                              <span className="mt-0.5 block truncate text-[11px] font-bold opacity-75">{format(getSlotDateTime(slot), 'HH:mm')} · {instructor?.name ?? 'Инструктор'}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </Fragment>
            ))}
          </div>
        </div>
      </div>

      <Modal open={Boolean(selectedSlot)} onClose={() => setSelectedSlotId(null)} title="Занятие" size="sm">
        {selectedSlot ? (
          <div className="space-y-4 p-5">
            <div className="rounded-[12px] bg-[#F7F9FB] p-4">
              <p className="text-[30px] font-black leading-none text-[#111418]">{format(getSlotDateTime(selectedSlot), 'HH:mm')}</p>
              <p className="mt-1 text-[14px] font-bold text-[#66717D]">{format(getSlotDateTime(selectedSlot), 'EEEE, d MMMM', { locale: ru })}</p>
            </div>
            <div className="grid gap-3 text-[14px] font-bold">
              <div className="flex justify-between gap-4"><span className="text-[#66717D]">Статус</span><span className={`v-admin-pill ${selectedSlot.status === 'available' ? 'v-tone-ok' : selectedSlot.status === 'cancelled' ? 'v-tone-muted' : 'v-tone-info'}`}>{selectedSlot.status === 'available' ? 'Свободно' : selectedSlot.status === 'cancelled' ? 'Отменено' : 'Занято'}</span></div>
              <div className="flex justify-between gap-4"><span className="text-[#66717D]">Инструктор</span><span className="text-right text-[#111418]">{selectedInstructor?.name ?? 'Не назначен'}</span></div>
              <div className="flex justify-between gap-4"><span className="text-[#66717D]">Филиал</span><span className="text-right text-[#111418]">{selectedBranch?.name ?? 'Не указан'}</span></div>
              {selectedBooking ? (
                <>
                  <div className="flex justify-between gap-4"><span className="text-[#66717D]">Ученик</span><span className="text-right text-[#111418]">{selectedBooking.studentName}</span></div>
                  <div className="flex justify-between gap-4"><span className="text-[#66717D]">Телефон</span><a href={`tel:${selectedBooking.studentPhone}`} className="text-right text-[#2457C5]">{selectedBooking.studentPhone}</a></div>
                </>
              ) : null}
              <div className="flex justify-between gap-4"><span className="text-[#66717D]">Длительность</span><span className="text-[#111418]">{selectedSlot.duration} минут</span></div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {selectedSlot.status === 'booked' && selectedBooking ? (
                <>
                  <button onClick={() => setShowRescheduleModal(true)} className="v-admin-button-secondary">Перенести</button>
                  <button onClick={handleComplete} className="v-admin-button bg-[#157347] hover:bg-[#0F5D38]">Засчитать</button>
                  <button onClick={handleNoShow} className="v-admin-button bg-[#A45A00] hover:bg-[#864900]">Неявка</button>
                  <button onClick={() => setShowCancelModal(true)} className="v-admin-button bg-[#B42318] hover:bg-[#8F1C14]">Отменить</button>
                </>
              ) : (
                <a href={`${ADMIN_BASE_PATH}/students`} className="v-admin-button sm:col-span-2">Записать ученика</a>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={showCancelModal} onClose={() => setShowCancelModal(false)} title="Отмена занятия" size="sm">
        <div className="space-y-4 p-5">
          <p className="text-[14px] font-bold text-[#66717D]">Занятие ученика <strong className="text-[#111418]">{selectedBooking?.studentName}</strong> будет отменено.</p>
          <textarea value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="Причина отмены" className="v-admin-input min-h-[94px] w-full resize-none py-3" />
          <div className="flex gap-2"><button onClick={() => setShowCancelModal(false)} className="v-admin-button-secondary flex-1">Назад</button><button onClick={handleCancel} className="v-admin-button flex-1 bg-[#B42318] hover:bg-[#8F1C14]">Подтвердить</button></div>
        </div>
      </Modal>

      <Modal open={showRescheduleModal} onClose={() => setShowRescheduleModal(false)} title="Перенос занятия" size="sm">
        <div className="space-y-4 p-5">
          <p className="text-[14px] font-bold text-[#66717D]">Перенести занятие ученика <strong className="text-[#111418]">{selectedBooking?.studentName}</strong>.</p>
          <input type="date" value={rescheduleDate} min={format(new Date(), 'yyyy-MM-dd')} onChange={(event) => setRescheduleDate(event.target.value)} className="v-admin-input w-full" />
          <select value={rescheduleTime} onChange={(event) => setRescheduleTime(event.target.value)} className="v-admin-input w-full">
            <option value="">Выберите время</option>
            {HOURS.map((time) => <option key={time} value={time}>{time}</option>)}
          </select>
          <div className="flex gap-2"><button onClick={() => setShowRescheduleModal(false)} className="v-admin-button-secondary flex-1">Назад</button><button onClick={handleReschedule} className="v-admin-button flex-1">Перенести</button></div>
        </div>
      </Modal>
    </div>
  )
}
