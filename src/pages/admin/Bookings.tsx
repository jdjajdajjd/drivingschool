import { addDays, endOfWeek, isAfter, isBefore, isSameDay, startOfDay, startOfWeek } from 'date-fns'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
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
  getBookingsBySchool,
  getSlotDateTime,
  rescheduleBookingConfirmed,
} from '../../services/bookingService'
import { ADMIN_BASE_PATH } from '../../services/accessControl'
import { db } from '../../services/storage'
import { getAvailableSlots } from '../../services/slotService'

type StatusFilter = 'all' | 'active' | 'cancelled' | 'completed'
type PeriodFilter = 'all' | 'today' | 'tomorrow' | 'week' | 'future' | 'past'

export function AdminBookings() {
  const school = db.schools.all()[0] ?? null
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

  const branches = school ? db.branches.bySchool(school.id) : []
  const instructors = school ? db.instructors.bySchool(school.id) : []
  const allBookings = school ? getBookingsBySchool(school.id) : []
  const activeCount = allBookings.filter((e) => e.booking.status === 'active').length
  const todayCount = allBookings.filter((e) => e.slot && isSameDay(getSlotDateTime(e.slot), new Date())).length

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
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Ошибка', 'error')
    }
    setRescheduleId(null)
    setSelectedSlotId('')
  }

  if (!school) return <div className="px-3 py-4"><p className="text-sm text-[#6F747A]">Данные школы не загружены</p></div>

  return (
    <div className="px-3 pb-24 pt-3 md:px-5 md:pt-4">
      <div className="mb-4">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#9EA3A8]">{school.name}</p>
        <h1 className="mt-1 text-[22px] font-black tracking-[-0.03em] text-[#050609] md:text-[26px]">Записи</h1>
      </div>

      {/* Stats */}
      <div className="mb-3 grid grid-cols-3 gap-2">
        {[
          { label: 'Всего', value: allBookings.length, active: status === 'all' && period === 'all', onClick: () => { setStatus('all'); setPeriod('all') } },
          { label: 'Сегодня', value: todayCount, active: period === 'today', onClick: () => { setPeriod('today') } },
          { label: 'Активных', value: activeCount, active: status === 'active', onClick: () => { setStatus('active') } },
        ].map((s) => (
          <button
            key={s.label}
            onClick={s.onClick}
            className={`rounded-[12px] border px-2.5 py-2 text-left transition ${s.active ? 'border-[#050609] bg-[#050609] text-white' : 'border-[rgba(0,0,0,0.06)] bg-white text-[#050609]'}`}
          >
            <p className="text-[18px] font-black leading-none">{s.value}</p>
            <p className="mt-0.5 text-[10px] font-semibold opacity-70">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-3 space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9EA3A8]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ученик или телефон"
              className="h-10 w-full rounded-[12px] border border-[rgba(0,0,0,0.06)] bg-white pl-9 pr-3 text-[14px] font-medium text-[#050609] outline-none placeholder:text-[#9EA3A8] focus:border-[#050609]"
            />
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-10 w-[130px] rounded-[12px] border border-[rgba(0,0,0,0.06)] bg-white px-3 text-[13px] text-[#050609] outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="h-9 rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-white px-2.5 text-[13px] font-semibold text-[#050609] outline-none">
            <option value="all">Все филиалы</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select value={instructorId} onChange={(e) => setInstructorId(e.target.value)} className="h-9 rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-white px-2.5 text-[13px] font-semibold text-[#050609] outline-none">
            <option value="all">Все инструкторы</option>
            {instructors.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-[#CBD5E1] bg-white px-4 py-5 text-center">
          <p className="font-black text-[#050609]">Записей пока нет</p>
          <p className="mt-1 text-sm text-[#9EA3A8]">Когда ученики запишутся, они появятся здесь</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => (
            <div key={entry.booking.id} className="rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white px-3 py-2.5">
              <div className="flex items-start gap-3">
                <div className="shrink-0 text-center">
                  <p className="text-[12px] font-black text-[#050609]">
                    {entry.slot ? formatTimeRange(entry.slot) : '—'}
                  </p>
                  <p className="text-[10px] font-semibold text-[#9EA3A8]">
                    {entry.slot ? formatHumanDate(entry.slot.date, false) : '—'}
                  </p>
                </div>
                <div className="min-w-0 flex-1">
                  <Link to={`${ADMIN_BASE_PATH}/students/${entry.student?.id ?? ''}`} className="block truncate text-[14px] font-black text-[#050609] hover:text-[#1F2BD8]">
                    {entry.booking.studentName}
                  </Link>
                  <p className="truncate text-[12px] font-semibold text-[#6F747A]">
                    {entry.instructor ? formatInstructorName(entry.instructor.name) : 'Инструктор'} · {entry.branch?.name ?? 'Филиал'}
                  </p>
                </div>
                <StatusBadge status={entry.booking.status} />
              </div>

              {entry.booking.status === 'active' && (
                <div className="mt-2 flex gap-2 border-t border-[rgba(0,0,0,0.05)] pt-2">
                  <button onClick={() => openReschedule(entry.booking.id)} className="flex-1 rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-white px-2 py-1.5 text-[12px] font-black text-[#1F2BD8] transition hover:bg-[#F1F2F5]">
                    Перенести
                  </button>
                  <button onClick={() => setCompleteId(entry.booking.id)} className="flex-1 rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-white px-2 py-1.5 text-[12px] font-black text-[#050609] transition hover:bg-[#F1F2F5]">
                    Проведена
                  </button>
                  <button onClick={() => setCancelId(entry.booking.id)} className="flex-1 rounded-[10px] border border-[rgba(229,83,75,0.15)] bg-white px-2 py-1.5 text-[12px] font-black text-[#E5534B] transition hover:bg-[#FEF2F2]">
                    Отменить
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog open={Boolean(cancelId)} title="Отменить запись" description="Время снова станет доступным для записи." confirmLabel="Отменить" onClose={() => setCancelId(null)} onConfirm={handleCancel} danger />
      <ConfirmDialog open={Boolean(completeId)} title="Отметить проведённой" description="Занятие будет считаться проведённым." confirmLabel="Подтвердить" onClose={() => setCompleteId(null)} onConfirm={handleComplete} />

      <Modal open={Boolean(rescheduleId)} onClose={() => setRescheduleId(null)} title="Перенести запись">
        <div className="space-y-4 px-5 pb-5">
          <div className="grid grid-cols-2 gap-2">
            <select value={rescheduleBranchId} onChange={(e) => setRescheduleBranchId(e.target.value)} className="h-10 rounded-[12px] border border-[rgba(0,0,0,0.06)] bg-white px-3 text-[13px] font-semibold text-[#050609] outline-none">
              <option value="all">Все филиалы</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select value={rescheduleInstructorId} onChange={(e) => setRescheduleInstructorId(e.target.value)} className="h-10 rounded-[12px] border border-[rgba(0,0,0,0.06)] bg-white px-3 text-[13px] font-semibold text-[#050609] outline-none">
              <option value="all">Все инструкторы</option>
              {instructors.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
            <input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} className="col-span-2 h-10 rounded-[12px] border border-[rgba(0,0,0,0.06)] bg-white px-3 text-[13px] text-[#050609] outline-none" />
          </div>

          {rescheduleSlots.length === 0 ? (
            <p className="text-sm text-[#9EA3A8]">Нет свободного времени. Измените фильтры.</p>
          ) : (
            <div className="max-h-[260px] space-y-1.5 overflow-y-auto">
              {rescheduleSlots.map((slot) => {
                const inst = db.instructors.byId(slot.instructorId)
                const br = db.branches.byId(slot.branchId)
                return (
                  <button
                    key={slot.id}
                    onClick={() => setSelectedSlotId(slot.id)}
                    className={`flex w-full items-center gap-2 rounded-[12px] border px-3 py-2 text-left transition ${selectedSlotId === slot.id ? 'border-[#050609] bg-[#050609] text-white' : 'border-[rgba(0,0,0,0.06)] bg-white hover:border-[rgba(0,0,0,0.12)]'}`}
                  >
                    <span className="text-[13px] font-black">{formatHumanDate(slot.date, false)} · {formatTimeRange(slot)}</span>
                    <span className={`text-[12px] font-semibold ${selectedSlotId === slot.id ? 'text-white/70' : 'text-[#6F747A]'}`}>{inst?.name} · {br?.name}</span>
                  </button>
                )
              })}
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={() => void handleReschedule()} disabled={!selectedSlotId} className="flex-1">Подтвердить</Button>
            <Button variant="secondary" onClick={() => setRescheduleId(null)} className="flex-1">Закрыть</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
