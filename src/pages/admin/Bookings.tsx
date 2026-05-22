import { addDays, endOfWeek, isAfter, isBefore, isSameDay, startOfDay, startOfWeek } from 'date-fns'
import { useMemo, useState } from 'react'
import { StatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/Toast'
import { formatInstructorName } from '../../lib/utils'
import { formatHumanDate, formatTimeRange } from '../../utils/date'
import {
  cancelBookingConfirmed,
  completeBookingConfirmed,
  createBookingConfirmed,
  getBookingsBySchool,
  getSlotDateTime,
  rescheduleBookingConfirmed,
  updateBookingComment,
} from '../../services/bookingService'
import { getAdminBasePathForLocation } from '../../services/accessControl'
import { db } from '../../services/storage'
import { getAvailableSlots } from '../../services/slotService'

type StatusFilter = 'all' | 'active' | 'cancelled' | 'completed'
type PeriodFilter = 'all' | 'today' | 'tomorrow' | 'week' | 'future' | 'past'

const emptyIntakeForm = {
  studentName: '',
  studentPhone: '',
  date: '',
  branchId: 'all',
  instructorId: 'all',
  slotId: '',
  comment: '',
}

export function AdminBookings() {
  const school = db.schools.currentAdmin() ?? null
  const { showToast } = useToast()
  const [query, setQuery] = useState('')
  const [date, setDate] = useState('')
  const [branchId, setBranchId] = useState('all')
  const [instructorId, setInstructorId] = useState('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [period, setPeriod] = useState<PeriodFilter>('all')
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [completeId, setCompleteId] = useState<string | null>(null)
  const [rescheduleId, setRescheduleId] = useState<string | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleBranchId, setRescheduleBranchId] = useState('all')
  const [rescheduleInstructorId, setRescheduleInstructorId] = useState('all')
  const [selectedSlotId, setSelectedSlotId] = useState('')
  const [intakeForm, setIntakeForm] = useState(emptyIntakeForm)
  const [refreshKey, setRefreshKey] = useState(0)

  const branches = school ? db.branches.bySchool(school.id) : []
  const instructors = school ? db.instructors.bySchool(school.id) : []
  const allBookings = useMemo(() => school ? getBookingsBySchool(school.id) : [], [school, refreshKey])
  const activeCount = allBookings.filter((e) => e.booking.status === 'active').length
  const todayCount = allBookings.filter((e) => e.slot && isSameDay(getSlotDateTime(e.slot), new Date())).length
  const overdueCount = allBookings.filter((e) => e.booking.status === 'active' && e.slot && isBefore(getSlotDateTime(e.slot), new Date())).length

  const filtered = useMemo(() => {
    const now = new Date()
    const q = query.trim().toLowerCase()
    return [...allBookings]
      .filter((entry) => {
        if (q && !entry.booking.studentName.toLowerCase().includes(q) && !entry.booking.studentPhone.includes(q.replace(/\D/g, ''))) return false
        if (date && entry.slot?.date !== date) return false
        if (branchId !== 'all' && entry.booking.branchId !== branchId) return false
        if (instructorId !== 'all' && entry.booking.instructorId !== instructorId) return false
        if (status !== 'all' && entry.booking.status !== status) return false
        if (period !== 'all') {
          const slotDate = entry.slot ? getSlotDateTime(entry.slot) : null
          if (!slotDate) return false
          if (period === 'today') return isSameDay(slotDate, now)
          if (period === 'tomorrow') return isSameDay(slotDate, addDays(now, 1))
          if (period === 'week') {
            const ws = startOfWeek(now, { weekStartsOn: 1 })
            const we = endOfWeek(now, { weekStartsOn: 1 })
            return !isBefore(slotDate, ws) && !isAfter(slotDate, we)
          }
          if (period === 'future') return !isBefore(slotDate, startOfDay(now))
          if (period === 'past') return isBefore(slotDate, startOfDay(now))
        }
        return true
      })
      .sort((a, b) => {
        const ta = a.slot ? getSlotDateTime(a.slot).getTime() : 0
        const tb = b.slot ? getSlotDateTime(b.slot).getTime() : 0
        const pa = a.slot ? isBefore(getSlotDateTime(a.slot), startOfDay(now)) : false
        const pb = b.slot ? isBefore(getSlotDateTime(b.slot), startOfDay(now)) : false
        if (pa !== pb) return pa ? 1 : -1
        return ta - tb
      })
  }, [allBookings, query, date, branchId, instructorId, status, period])

  const rescheduleSlots = useMemo(() => {
    if (!rescheduleId) return []
    return getAvailableSlots(
      rescheduleInstructorId === 'all' ? undefined : rescheduleInstructorId,
      rescheduleDate || undefined,
      rescheduleBranchId === 'all' ? undefined : rescheduleBranchId,
    )
  }, [rescheduleId, rescheduleDate, rescheduleBranchId, rescheduleInstructorId])

  const intakeSlots = useMemo(() => {
    return getAvailableSlots(
      intakeForm.instructorId === 'all' ? undefined : intakeForm.instructorId,
      intakeForm.date || undefined,
      intakeForm.branchId === 'all' ? undefined : intakeForm.branchId,
    ).slice(0, 10)
  }, [intakeForm.branchId, intakeForm.date, intakeForm.instructorId, refreshKey])

  function openReschedule(bookingId: string) {
    const entry = allBookings.find((e) => e.booking.id === bookingId)
    setRescheduleId(bookingId)
    setRescheduleBranchId(entry?.booking.branchId ?? 'all')
    setRescheduleInstructorId(entry?.booking.instructorId ?? 'all')
    setRescheduleDate(entry?.slot?.date ?? '')
    setSelectedSlotId('')
  }

  async function handleCancel() {
    if (!cancelId) return
    try {
      const r = await cancelBookingConfirmed(cancelId)
      if (!r.ok) { showToast(r.error ?? 'Ошибка', 'error'); return }
      showToast('Запись отменена', 'success')
      setRefreshKey((value) => value + 1)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Ошибка', 'error')
    }
    setCancelId(null)
  }

  async function handleComplete() {
    if (!completeId) return
    try {
      const r = await completeBookingConfirmed(completeId)
      if (!r.ok) { showToast(r.error ?? 'Ошибка', 'error'); return }
      showToast('Занятие проведено', 'success')
      setRefreshKey((value) => value + 1)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Ошибка', 'error')
    }
    setCompleteId(null)
  }

  async function handleReschedule() {
    if (!rescheduleId || !selectedSlotId) { showToast('Выберите время', 'error'); return }
    try {
      const r = await rescheduleBookingConfirmed({ bookingId: rescheduleId, newSlotId: selectedSlotId, ignoreLimits: true })
      if (!r.ok) { showToast(r.error ?? 'Ошибка', 'error'); return }
      showToast(r.warning ?? 'Запись перенесена', 'success')
      setRefreshKey((value) => value + 1)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Ошибка', 'error')
    }
    setRescheduleId(null)
    setSelectedSlotId('')
  }

  async function handleIntakeSubmit() {
    if (!school) return
    const slot = db.slots.byId(intakeForm.slotId)
    if (!slot) { showToast('Выберите свободное окно', 'error'); return }
    const r = await createBookingConfirmed({
      schoolId: school.id,
      branchId: slot.branchId,
      instructorId: slot.instructorId,
      slotId: slot.id,
      studentName: intakeForm.studentName,
      studentPhone: intakeForm.studentPhone,
      sessionId: 'admin-intake',
    })
    if (!r.ok || !r.booking) { showToast(r.error ?? 'Не удалось записать ученика', 'error'); return }
    if (intakeForm.comment.trim()) updateBookingComment(r.booking.id, `Школа: ${intakeForm.comment.trim()}`)
    showToast('Ученик записан', 'success')
    setIntakeForm(emptyIntakeForm)
    setRefreshKey((value) => value + 1)
  }

  if (!school) return <div className="px-3 py-4"><p className="text-sm text-[#5F6875]">Данные школы не загружены</p></div>

  return (
    <div className="v-ops-shell min-h-dvh bg-[#F5F7FA] pb-4 text-[#0F172A]">
      <div className="mx-auto grid max-w-[1320px] gap-3 p-3 md:grid-cols-[360px_minmax(0,1fr)] md:p-5">
        <aside className="space-y-3">
          <section className="v-ops-hero border border-[#D7DEE8] bg-white text-[#0F172A]">
            <div className="p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#667085]">звонки и сайт</p>
              <h1 className="mt-1 text-[30px] font-black leading-none tracking-[-0.04em] text-[#111827]">Заявки</h1>
              <p className="mt-2 text-[13px] font-bold leading-5 text-[#667085]">Быстро записать ученика после звонка или заявки с сайта.</p>
            </div>
            <div className="grid grid-cols-3 border-t border-[#E5EAF1]">
              <button onClick={() => { setStatus('all'); setPeriod('all') }} className="min-h-[76px] border-r border-[#E5EAF1] bg-[#F8FAFC] p-3 text-left transition hover:bg-white">
                <strong className="block text-[26px] font-black leading-none text-[#111827]">{allBookings.length}</strong><span className="text-[10px] font-black uppercase text-[#667085]">всего</span>
              </button>
              <button onClick={() => setPeriod('today')} className="min-h-[76px] border-r border-[#E5EAF1] bg-[#F8FAFC] p-3 text-left transition hover:bg-white">
                <strong className="block text-[26px] font-black leading-none text-[#111827]">{todayCount}</strong><span className="text-[10px] font-black uppercase text-[#667085]">сегодня</span>
              </button>
              <button onClick={() => setStatus('active')} className="min-h-[76px] bg-[#F8FAFC] p-3 text-left transition hover:bg-white">
                <strong className="block text-[26px] font-black leading-none text-[#111827]">{activeCount}</strong><span className="text-[10px] font-black uppercase text-[#667085]">активно</span>
              </button>
            </div>
          </section>

          <section className="v-ops-panel border border-[#D7DEE8] bg-white">
            <div className="border-b border-[#CBD5E1] px-4 py-3">
              <h2 className="text-[16px] font-black">Записать ученика</h2>
            </div>
            <div className="space-y-2 p-3">
              <input value={intakeForm.studentName} onChange={(e) => setIntakeForm((f) => ({ ...f, studentName: e.target.value }))} placeholder="Имя ученика" className="min-h-11 w-full border border-[#CBD5E1] bg-white px-3 text-[14px] font-bold outline-none focus:border-[#0F172A]" />
              <input value={intakeForm.studentPhone} onChange={(e) => setIntakeForm((f) => ({ ...f, studentPhone: e.target.value }))} placeholder="Телефон" className="min-h-11 w-full border border-[#CBD5E1] bg-white px-3 text-[14px] font-bold outline-none focus:border-[#0F172A]" />
              <div className="grid grid-cols-2 gap-2">
                <select value={intakeForm.branchId} onChange={(e) => setIntakeForm((f) => ({ ...f, branchId: e.target.value, slotId: '' }))} className="min-h-11 border border-[#CBD5E1] bg-white px-2 text-[12px] font-bold outline-none">
                  <option value="all">Филиал</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <select value={intakeForm.instructorId} onChange={(e) => setIntakeForm((f) => ({ ...f, instructorId: e.target.value, slotId: '' }))} className="min-h-11 border border-[#CBD5E1] bg-white px-2 text-[12px] font-bold outline-none">
                  <option value="all">Инструктор</option>{instructors.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
              <input type="date" value={intakeForm.date} onChange={(e) => setIntakeForm((f) => ({ ...f, date: e.target.value, slotId: '' }))} className="min-h-11 w-full border border-[#CBD5E1] bg-white px-3 text-[13px] font-bold outline-none" />
              <textarea value={intakeForm.comment} onChange={(e) => setIntakeForm((f) => ({ ...f, comment: e.target.value }))} placeholder="Комментарий: откуда заявка, пожелания, что обещали" className="min-h-[76px] w-full border border-[#CBD5E1] bg-white px-3 py-2 text-[13px] font-bold outline-none" />
              <div className="max-h-[220px] space-y-1 overflow-y-auto">
                {intakeSlots.length === 0 ? <p className="border border-dashed border-[#CBD5E1] p-3 text-[12px] font-bold text-[#64748B]">Нет свободных окон по фильтрам.</p> : intakeSlots.map((slot) => {
                  const inst = db.instructors.byId(slot.instructorId)
                  const br = db.branches.byId(slot.branchId)
                  return (
                    <button key={slot.id} type="button" onClick={() => setIntakeForm((f) => ({ ...f, slotId: slot.id }))} className={`grid min-h-[54px] w-full grid-cols-[1fr_auto] items-center gap-2 border px-3 text-left ${intakeForm.slotId === slot.id ? 'border-[#0F172A] bg-[#0F172A] text-white' : 'border-[#CBD5E1] bg-white text-[#0F172A]'}`}>
                      <span><strong className="block text-[12px]">{formatHumanDate(slot.date, false)} · {formatTimeRange(slot)}</strong><span className="text-[11px] font-bold opacity-70">{inst?.name} · {br?.name}</span></span>
                      <span className="text-[11px] font-black">выбрать</span>
                    </button>
                  )
                })}
              </div>
              <Button onClick={handleIntakeSubmit} disabled={!intakeForm.slotId} className="w-full">Создать запись</Button>
            </div>
          </section>
        </aside>

        <main className="space-y-3">
          <section className="v-ops-panel border border-[#D7DEE8] bg-white">
            <div className="grid gap-2 border-b border-[#CBD5E1] p-3 md:grid-cols-[minmax(0,1fr)_170px]">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск по ученику или телефону" className="min-h-11 border border-[#CBD5E1] bg-white px-3 text-[14px] font-bold outline-none focus:border-[#0F172A]" />
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="min-h-11 border border-[#CBD5E1] bg-white px-3 text-[13px] font-bold outline-none" />
              <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="min-h-11 border border-[#CBD5E1] bg-white px-3 text-[13px] font-bold outline-none">
                <option value="all">Все филиалы</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <select value={instructorId} onChange={(e) => setInstructorId(e.target.value)} className="min-h-11 border border-[#CBD5E1] bg-white px-3 text-[13px] font-bold outline-none">
                <option value="all">Все инструкторы</option>{instructors.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
            <div className="v-bookings-filter-row flex gap-1 overflow-x-auto border-b border-[#CBD5E1] p-2">
              {[
                ['all', 'Все'], ['active', 'Активные'], ['completed', 'Проведены'], ['cancelled', 'Отменены'],
              ].map(([value, label]) => <button key={value} onClick={() => setStatus(value as StatusFilter)} className={`min-h-10 shrink-0 border px-3 text-[12px] font-black ${status === value ? 'border-[#0F172A] bg-[#0F172A] text-white' : 'border-[#CBD5E1] bg-white text-[#334155]'}`}>{label}</button>)}
              {[
                ['today', 'Сегодня'], ['week', 'Неделя'], ['past', 'Прошлые'],
              ].map(([value, label]) => <button key={value} onClick={() => setPeriod(period === value ? 'all' : value as PeriodFilter)} className={`min-h-10 shrink-0 border px-3 text-[12px] font-black ${period === value ? 'border-[#1D4ED8] bg-[#EFF6FF] text-[#1D4ED8]' : 'border-[#CBD5E1] bg-white text-[#334155]'}`}>{label}</button>)}
            </div>

            {overdueCount > 0 ? <div className="border-b border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-[13px] font-black text-[#DC2626]">Не закрыто прошедших занятий: {overdueCount}</div> : null}

            {filtered.length === 0 ? (
              <div className="p-5">
                <div className="border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-5">
                  <p className="text-[17px] font-black text-[#0F172A]">Журнал пустой</p>
                  <p className="mt-1 text-[13px] font-bold text-[#64748B]">Создайте окна в расписании или примите звонок слева.</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-[#E2E8F0]">
                {filtered.map((entry) => {
                  const pastActive = entry.booking.status === 'active' && entry.slot && isBefore(getSlotDateTime(entry.slot), new Date())
                  return (
                    <article key={entry.booking.id} className={`grid gap-3 px-4 py-3 md:grid-cols-[94px_minmax(0,1fr)_130px] ${pastActive ? 'bg-[#FEF2F2]' : 'bg-white'}`}>
                      <div>
                        <p className="text-[16px] font-black text-[#0F172A]">{entry.slot ? formatTimeRange(entry.slot) : '—'}</p>
                        <p className="mt-1 text-[11px] font-black uppercase text-[#64748B]">{entry.slot ? formatHumanDate(entry.slot.date, false) : 'нет даты'}</p>
                      </div>
                      <div className="min-w-0">
                        <a href={`${getAdminBasePathForLocation()}/students/${entry.student?.id ?? ''}`} className="text-[16px] font-black leading-5 text-[#0F172A]">{entry.booking.studentName}</a>
                        <p className="mt-1 text-[13px] font-bold text-[#64748B]">{entry.instructor ? formatInstructorName(entry.instructor.name) : 'Инструктор'} · {entry.branch?.name ?? 'Филиал'} · {entry.booking.studentPhone}</p>
                        {entry.booking.comment || entry.booking.notes ? <p className="mt-2 border-l-2 border-[#CBD5E1] pl-2 text-[12px] font-bold text-[#475569]">{entry.booking.comment || entry.booking.notes}</p> : null}
                      </div>
                      <div className="space-y-2 md:text-right">
                        <StatusBadge status={entry.booking.status} />
                        {entry.booking.status === 'active' && (
                          <div className="v-booking-row-actions grid grid-cols-3 gap-1 md:grid-cols-1">
                            <button onClick={() => openReschedule(entry.booking.id)} className="min-h-9 border border-[#CBD5E1] bg-white px-2 text-[11px] font-black text-[#1D4ED8]">Перенос</button>
                            <button onClick={() => setCompleteId(entry.booking.id)} className="min-h-9 border border-[#CBD5E1] bg-white px-2 text-[11px] font-black text-[#0F172A]">Провести</button>
                            <button onClick={() => setCancelId(entry.booking.id)} className="min-h-9 border border-[#FCA5A5] bg-white px-2 text-[11px] font-black text-[#DC2626]">Отмена</button>
                          </div>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        </main>
      </div>

      <ConfirmDialog open={Boolean(cancelId)} title="Отменить запись" description="Время снова станет доступным для записи." confirmLabel="Отменить" onClose={() => setCancelId(null)} onConfirm={handleCancel} danger />
      <ConfirmDialog open={Boolean(completeId)} title="Отметить проведённой" description="Занятие будет считаться проведённым." confirmLabel="Подтвердить" onClose={() => setCompleteId(null)} onConfirm={handleComplete} />

      <Modal open={Boolean(rescheduleId)} onClose={() => setRescheduleId(null)} title="Перенести запись">
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-2">
            <select value={rescheduleBranchId} onChange={(e) => setRescheduleBranchId(e.target.value)} className="min-h-11 border border-[#CBD5E1] bg-white px-3 text-[13px] font-bold outline-none">
              <option value="all">Все филиалы</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select value={rescheduleInstructorId} onChange={(e) => setRescheduleInstructorId(e.target.value)} className="min-h-11 border border-[#CBD5E1] bg-white px-3 text-[13px] font-bold outline-none">
              <option value="all">Все инструкторы</option>{instructors.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
            <input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} className="col-span-2 min-h-11 border border-[#CBD5E1] bg-white px-3 text-[13px] font-bold outline-none" />
          </div>
          {rescheduleSlots.length === 0 ? <p className="text-sm font-bold text-[#64748B]">Нет свободного времени.</p> : (
            <div className="max-h-[260px] space-y-1.5 overflow-y-auto">
              {rescheduleSlots.map((slot) => {
                const inst = db.instructors.byId(slot.instructorId)
                const br = db.branches.byId(slot.branchId)
                return <button key={slot.id} onClick={() => setSelectedSlotId(slot.id)} className={`grid min-h-[56px] w-full grid-cols-[1fr_auto] items-center gap-2 border px-3 text-left ${selectedSlotId === slot.id ? 'border-[#0F172A] bg-[#0F172A] text-white' : 'border-[#CBD5E1] bg-white'}`}><span><strong className="block text-[13px]">{formatHumanDate(slot.date, false)} · {formatTimeRange(slot)}</strong><span className="text-[12px] font-bold opacity-70">{inst?.name} · {br?.name}</span></span><span className="text-[11px] font-black">выбрать</span></button>
              })}
            </div>
          )}
          <div className="flex gap-2"><Button onClick={() => void handleReschedule()} disabled={!selectedSlotId} className="flex-1">Подтвердить</Button><Button variant="secondary" onClick={() => setRescheduleId(null)} className="flex-1">Закрыть</Button></div>
        </div>
      </Modal>
    </div>
  )
}
