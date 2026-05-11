import { Fragment, useMemo, useState } from 'react'
import { format, addDays, startOfWeek, startOfMonth, eachDayOfInterval, isSameDay } from 'date-fns'
import { ru } from 'date-fns/locale'
import { db } from '../../services/storage'
import { getSlotDateTime } from '../../services/bookingService'
import { ADMIN_BASE_PATH } from '../../services/accessControl'
import { Modal } from '../../components/ui/Modal'
import { createAuditEntry } from '../../services/adminStorage'

type ViewMode = 'day' | 'week' | 'month'

const TIME_SLOTS = Array.from({ length: 14 }, (_, i) => {
  const hour = i + 7
  return `${hour.toString().padStart(2, '0')}:00`
})

export function AdminSchedule() {
  const school = db.schools.all()[0]
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('')

    // Отмена занятия
  const handleCancel = () => {
    if (!school || !selectedSlotData || !selectedBooking) return
    
    const slot = selectedSlotData
    const booking = selectedBooking
    
    // Обновляем слот
    db.slots.upsert({ ...slot, status: 'cancelled' })
    
    // Обновляем booking - используем правильные поля из типа
    db.bookings.upsert({ 
      ...booking, 
      status: 'cancelled',
      cancellationReason: cancelReason || 'Отменено администратором',
      cancelledBy: 'school'
    })
    
    // Аудит
    createAuditEntry(
      school.id,
      'admin',
      'Администратор',
      'booking_cancelled',
      'booking',
      booking.id,
      `Отменено занятие: ${booking.studentName} на ${format(getSlotDateTime(slot), 'dd.MM.yyyy HH:mm')}. Причина: ${cancelReason || 'Не указана'}`,
      `status: booked`,
      `status: cancelled, reason: ${cancelReason}`
    )
    
    setShowCancelModal(false)
    setSelectedSlot(null)
    setCancelReason('')
  }

  // Перенос занятия
  const handleReschedule = () => {
    if (!school || !selectedSlotData || !selectedBooking || !rescheduleDate || !rescheduleTime) return
    
    const slot = selectedSlotData
    const booking = selectedBooking
    const oldDateTime = format(getSlotDateTime(slot), 'dd.MM.yyyy HH:mm')
    
    // Находим свободный слот для переноса
    const newDate = rescheduleDate
    const newSlot = db.slots.bySchool(school.id).find(s => 
      s.date === newDate && s.time === rescheduleTime && s.instructorId === slot.instructorId && s.status === 'available'
    )
    
    if (newSlot) {
      // Используем существующий свободный слот
      db.slots.upsert({ ...newSlot, status: 'booked', bookingId: booking.id })
      db.slots.upsert({ ...slot, status: 'available', bookingId: undefined })
    } else {
      // Просто освобождаем текущий слот и добавляем комментарий - создание слотов нужно делать отдельно
      alert('Свободный слот на это время не найден. Сначала создайте окно в расписании.')
      return
    }
    
    // Аудит
    createAuditEntry(
      school.id,
      'admin',
      'Администратор',
      'booking_rescheduled',
      'booking',
      booking.id,
      `Перенесено занятие: ${booking.studentName} с ${oldDateTime} на ${rescheduleDate} ${rescheduleTime}`,
      `slot: ${slot.date} ${slot.time}`,
      `slot: ${rescheduleDate} ${rescheduleTime}`
    )
    
    setShowRescheduleModal(false)
    setSelectedSlot(null)
    setRescheduleDate('')
    setRescheduleTime('')
  }

  // Отметить неявку
  const handleNoShow = () => {
    if (!school || !selectedSlotData || !selectedBooking) return
    
    const booking = selectedBooking
    
    db.bookings.upsert({ 
      ...booking, 
      status: 'no_show'
    })
    
    // Аудит
    createAuditEntry(
      school.id,
      'admin',
      'Администратор',
      'booking_no_show',
      'booking',
      booking.id,
      `Отмечена неявка: ${booking.studentName}`,
      `status: booked`,
      `status: no_show`
    )
    
    setSelectedSlot(null)
  }

  // Засчитать занятие
  const handleComplete = () => {
    if (!school || !selectedSlotData || !selectedBooking) return
    
    const booking = selectedBooking
    
    db.bookings.upsert({ 
      ...booking, 
      status: 'completed',
      confirmedHours: (booking.confirmedHours ?? 0) + selectedSlotData.duration
    })
    
    // Аудит
    createAuditEntry(
      school.id,
      'admin',
      'Администратор',
      'booking_completed',
      'booking',
      booking.id,
      `Занятие засчитано: ${booking.studentName} (+${selectedSlotData.duration} мин, всего: ${(booking.confirmedHours ?? 0) + selectedSlotData.duration} мин)`,
      `status: booked`,
      `status: completed`
    )
    
    setSelectedSlot(null)
  }

  const viewRange = useMemo(() => {
    if (viewMode === 'day') return [selectedDate]
    if (viewMode === 'week') {
      const start = startOfWeek(selectedDate, { weekStartsOn: 1 })
      return eachDayOfInterval({ start, end: addDays(start, 6) })
    }
    // month
    const start = startOfMonth(selectedDate)
    return eachDayOfInterval({ start, end: addDays(start, 27) })
  }, [viewMode, selectedDate])

  const data = useMemo(() => {
    if (!school) return { slots: [], bookings: [], instructors: [], branches: [] }
    const slots = db.slots.bySchool(school.id)
    const bookings = db.bookings.bySchool(school.id)
    const instructors = db.instructors.bySchool(school.id)
    const branches = db.branches.bySchool(school.id)
    return { slots, bookings, instructors, branches }
  }, [school?.id])

  const getSlotForCell = (date: Date, time: string) => {
    return data.slots.filter((s) => {
      const slotDate = new Date(`${s.date}T${s.time}`)
      return isSameDay(slotDate, date) && s.time.startsWith(time.split(':')[0])
    })
  }

  const selectedSlotData = selectedSlot
    ? data.slots.find((s) => s.id === selectedSlot) ?? null
    : null

  const selectedBooking = selectedSlotData?.bookingId
    ? data.bookings.find((b) => b.id === selectedSlotData.bookingId) ?? null
    : null

  const selectedInstructor = selectedSlotData
    ? data.instructors.find((i) => i.id === selectedSlotData.instructorId)
    : null

  const navigatePrev = () => setSelectedDate((d) => addDays(d, viewMode === 'day' ? -1 : viewMode === 'week' ? -7 : -28))
  const navigateNext = () => setSelectedDate((d) => addDays(d, viewMode === 'day' ? 1 : viewMode === 'week' ? 7 : 28))

  if (!school) return null

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex flex-shrink-0 flex-wrap items-center gap-3 border-b border-gray-100 bg-white px-4 py-3 md:px-6">
        <div className="flex items-center gap-2">
          <button onClick={navigatePrev} className="rounded-lg p-2 hover:bg-gray-100">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8l4-4" stroke="#6F747A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="min-w-[180px] text-center text-[15px] font-bold text-gray-900">
            {format(selectedDate, 'MMMM yyyy', { locale: ru })}
          </span>
          <button onClick={navigateNext} className="rounded-lg p-2 hover:bg-gray-100">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 12l4-4-4-4" stroke="#6F747A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={() => setSelectedDate(new Date())}
            className="rounded-lg px-3 py-1.5 text-[13px] font-semibold text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
          >
            Сегодня
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-xl border border-gray-200 p-0.5">
            {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold transition ${
                  viewMode === mode
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {mode === 'day' ? 'День' : mode === 'week' ? 'Неделя' : 'Месяц'}
              </button>
            ))}
          </div>
          <button className="rounded-xl bg-gray-900 px-4 py-2 text-[13px] font-bold text-white">
            + Создать окна
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-shrink-0 gap-4 border-b border-gray-100 bg-white px-4 py-2 text-[12px] font-semibold text-gray-400 md:px-6">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-green-400" /> Свободно
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-blue-400" /> Занято
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-gray-200" /> Отменено
        </span>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto">
        {viewMode === 'month' ? (
          <div className="min-w-[800px]">
            {/* Month header */}
            <div className="grid border-b border-gray-100" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => (
                <div key={day} className="px-3 py-2 text-center text-[12px] font-bold text-gray-400">{day}</div>
              ))}
            </div>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {viewRange.map((date, idx) => {
                const daySlots = data.slots.filter((s) => {
                  const slotDate = new Date(`${s.date}T00:00`)
                  return isSameDay(slotDate, date)
                })
                const booked = daySlots.filter((s) => s.status === 'booked').length
                const available = daySlots.filter((s) => s.status === 'available').length
                const isToday = isSameDay(date, new Date())
                return (
                  <button
                    key={idx}
                    onClick={() => { setSelectedDate(date); setViewMode('day') }}
                    className={`min-h-[80px] border-b border-r border-gray-100 p-2 text-left transition hover:bg-gray-50 ${
                      isToday ? 'bg-blue-50/30' : ''
                    }`}
                  >
                    <span className={`text-[13px] font-bold ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                      {format(date, 'd')}
                    </span>
                    {(booked > 0 || available > 0) && (
                      <div className="mt-1 flex gap-1">
                        {booked > 0 && <span className="text-[11px] font-bold text-blue-500">{booked}зан</span>}
                        {available > 0 && <span className="text-[11px] font-bold text-green-500">{available}св</span>}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="min-w-[700px]">
            {/* Time grid */}
            <div className="grid" style={{ gridTemplateColumns: viewMode === 'day' ? '1fr' : '60px repeat(7, 1fr)' }}>
              {/* Day headers */}
              {viewMode === 'week' && (
                <>
                  <div className="border-b border-gray-100" />
                  {viewRange.map((date) => {
                    const isToday = isSameDay(date, new Date())
                    return (
                      <div
                        key={date.toISOString()}
                        className={`border-b border-l border-gray-100 px-2 py-2 text-center ${isToday ? 'bg-blue-50/30' : ''}`}
                      >
                        <p className="text-[11px] font-semibold text-gray-400">{format(date, 'EEE', { locale: ru })}</p>
                        <p className={`text-[18px] font-black ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>{format(date, 'd')}</p>
                      </div>
                    )
                  })}
                </>
              )}

              {/* Time slots */}
              {TIME_SLOTS.map((time) => (
                <Fragment key={time}>
                  {/* Time label */}
                  {viewMode === 'week' && (
                    <div key={`time-${time}`} className="flex items-center justify-end pr-2 text-[11px] font-semibold text-gray-300">
                      {time}
                    </div>
                  )}

                  {/* Cells */}
                  {viewRange.map((date) => {
                    const cellSlots = getSlotForCell(date, time)
                    const isToday = isSameDay(date, new Date())
                    return (
                      <div
                        key={`${date.toISOString()}-${time}`}
                        className={`relative min-h-[48px] border-b border-l border-gray-100 p-0.5 ${
                          isToday ? 'bg-blue-50/20' : ''
                        }`}
                      >
                        {cellSlots.map((slot) => {
                          const instructor = data.instructors.find((i) => i.id === slot.instructorId)
                          const booking = slot.bookingId ? data.bookings.find((b) => b.id === slot.bookingId) : null
                          const statusColor = slot.status === 'available' ? 'bg-green-100 border-green-200 text-green-700' :
                            slot.status === 'cancelled' ? 'bg-gray-100 border-gray-200 text-gray-400' :
                            'bg-blue-100 border-blue-200 text-blue-700'
                          return (
                            <button
                              key={slot.id}
                              onClick={() => setSelectedSlot(slot.id)}
                              className={`mb-0.5 w-full rounded-lg border px-2 py-1 text-left text-[12px] font-semibold transition hover:scale-[1.02] active:scale-[0.98] ${statusColor}`}
                            >
                              {booking ? (
                                <>
                                  <p className="truncate font-bold">{booking.studentName}</p>
                                  <p className="truncate text-[11px] opacity-70">{instructor?.name}</p>
                                </>
                              ) : (
                                <p className="truncate text-[11px] opacity-70">Свободно · {slot.duration}м</p>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Slot detail modal */}
      <Modal
        open={!!selectedSlot}
        onClose={() => setSelectedSlot(null)}
        title="Занятие"
        size="sm"
      >
        {selectedSlotData && (
          <div className="p-5">
            <div className="mb-4 rounded-xl bg-gray-50 p-4">
              <p className="text-[24px] font-black text-gray-900">{format(getSlotDateTime(selectedSlotData), 'HH:mm')}</p>
              <p className="mt-1 text-[14px] font-semibold text-gray-400">
                {format(getSlotDateTime(selectedSlotData), 'EEEE, d MMMM', { locale: ru })}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-gray-400">Статус</span>
                <span className={`rounded-lg px-2.5 py-1 text-[12px] font-bold ${
                  selectedSlotData.status === 'available' ? 'bg-green-100 text-green-600' :
                  selectedSlotData.status === 'cancelled' ? 'bg-gray-100 text-gray-500' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  {selectedSlotData.status === 'available' ? 'Свободно' :
                   selectedSlotData.status === 'cancelled' ? 'Отменено' : 'Занято'}
                </span>
              </div>

              {selectedInstructor && (
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-gray-400">Инструктор</span>
                  <span className="font-bold text-gray-900">{selectedInstructor.name}</span>
                </div>
              )}

              {selectedBooking && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-gray-400">Ученик</span>
                    <span className="font-bold text-gray-900">{selectedBooking.studentName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-gray-400">Телефон</span>
                    <a href={`tel:${selectedBooking.studentPhone}`} className="font-bold text-blue-600">{selectedBooking.studentPhone}</a>
                  </div>
                </>
              )}

              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-gray-400">Длительность</span>
                <span className="font-bold text-gray-900">{selectedSlotData.duration} минут</span>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              {selectedSlotData.status === 'booked' && selectedBooking && (
                <>
                  <button 
                    onClick={() => setShowRescheduleModal(true)}
                    className="flex-1 rounded-xl border border-gray-200 py-2.5 text-[13px] font-bold text-gray-600 transition hover:bg-gray-50"
                  >
                    Перенести
                  </button>
                  <button 
                    onClick={() => setShowCancelModal(true)}
                    className="flex-1 rounded-xl bg-red-500 py-2.5 text-[13px] font-bold text-white"
                  >
                    Отменить
                  </button>
                  <button 
                    onClick={handleNoShow}
                    className="flex-1 rounded-xl bg-amber-500 py-2.5 text-[13px] font-bold text-white"
                  >
                    Неявка
                  </button>
                  <button 
                    onClick={handleComplete}
                    className="flex-1 rounded-xl bg-green-600 py-2.5 text-[13px] font-bold text-white"
                  >
                    Засчитать
                  </button>
                </>
              )}
              {selectedSlotData.status === 'available' && (
                <a
                  href={`${ADMIN_BASE_PATH}/students`}
                  className="flex-1 rounded-xl bg-gray-900 py-2.5 text-center text-[13px] font-bold text-white"
                >
                  Записать ученика
                </a>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Модалка отмены */}
      <Modal open={showCancelModal} onClose={() => setShowCancelModal(false)} title="Отмена занятия" size="sm">
        <div className="p-5 space-y-4">
          <p className="text-[14px] text-gray-600">
            Занятие ученика <strong>{selectedBooking?.studentName}</strong> будет отменено.
          </p>
          <div>
            <label className="block text-[12px] font-semibold text-gray-500 mb-1.5">Причина отмены</label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Например: ученик предупредил заранее"
              className="w-full rounded-xl border border-gray-200 p-3 text-[14px] resize-none"
              rows={3}
            />
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowCancelModal(false)}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-[13px] font-bold text-gray-600"
            >
              Отмена
            </button>
            <button 
              onClick={handleCancel}
              className="flex-1 rounded-xl bg-red-500 py-2.5 text-[13px] font-bold text-white"
            >
              Подтвердить
            </button>
          </div>
        </div>
      </Modal>

      {/* Модалка переноса */}
      <Modal open={showRescheduleModal} onClose={() => setShowRescheduleModal(false)} title="Перенос занятия" size="sm">
        <div className="p-5 space-y-4">
          <p className="text-[14px] text-gray-600">
            Перенести занятие ученика <strong>{selectedBooking?.studentName}</strong>?
          </p>
          <div>
            <label className="block text-[12px] font-semibold text-gray-500 mb-1.5">Новая дата</label>
            <input
              type="date"
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-3 text-[14px]"
              min={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-gray-500 mb-1.5">Новое время</label>
            <select
              value={rescheduleTime}
              onChange={(e) => setRescheduleTime(e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-3 text-[14px]"
            >
              <option value="">Выберите время</option>
              {TIME_SLOTS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowRescheduleModal(false)}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-[13px] font-bold text-gray-600"
            >
              Отмена
            </button>
            <button 
              onClick={handleReschedule}
              disabled={!rescheduleDate || !rescheduleTime}
              className="flex-1 rounded-xl bg-blue-600 py-2.5 text-[13px] font-bold text-white disabled:opacity-50"
            >
              Перенести
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
