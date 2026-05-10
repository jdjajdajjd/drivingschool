import { isAfter, isBefore, isSameDay, startOfDay } from 'date-fns'
import { useMemo, useState } from 'react'
import { StatusPill } from '../../../components/admin/core/StatusPill'
import { BottomSheet } from '../../../components/admin/core/BottomSheet'
import { Button } from '../../../components/ui/Button'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { useToast } from '../../../components/ui/Toast'
import { formatPhone, formatInstructorName } from '../../../lib/utils'
import { formatHumanDate, formatTimeRange, isoDate } from '../../../utils/date'
import {
  cancelBookingConfirmed,
  completeBookingConfirmed,
  getBookingsBySchool,
  getSlotDateTime,
  rescheduleBookingConfirmed,
} from '../../../services/bookingService'
import { getAvailableSlots } from '../../../services/slotService'
import { db } from '../../../services/storage'

type Tab = 'all' | 'today' | 'future' | 'attention' | 'cancelled'

const STATUS_PILL_MAP: Record<string, { label: string; status: 'success' | 'warning' | 'error' | 'info' | 'neutral' }> = {
  active: { label: 'Активна', status: 'success' },
  completed: { label: 'Проведена', status: 'neutral' },
  cancelled: { label: 'Отменена', status: 'error' },
}

export default function BookingsPage() {
  const school = db.schools.all()[0] ?? null
  const { showToast } = useToast()

  const [tab, setTab] = useState<Tab>('all')
  const [query, setQuery] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterBranch, setFilterBranch] = useState('all')
  const [filterInstructor, setFilterInstructor] = useState('all')
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [completeId, setCompleteId] = useState<string | null>(null)
  const [rescheduleId, setRescheduleId] = useState<string | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleBranch, setRescheduleBranch] = useState('all')
  const [rescheduleInstructor, setRescheduleInstructor] = useState('all')
  const [selectedSlot, setSelectedSlot] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const branches = school ? db.branches.bySchool(school.id) : []
  const instructors = school ? db.instructors.bySchool(school.id) : []
  const allBookings = useMemo(
    () => (school ? getBookingsBySchool(school.id) : []),
    [school, refreshKey],
  )

  const filtered = useMemo(() => {
    const now = new Date()
    const today = startOfDay(now)
    const q = query.trim().toLowerCase()
    return [...allBookings].filter((entry) => {
      if (q && !entry.booking.studentName.toLowerCase().includes(q) && !entry.booking.studentPhone.replace(/\D/g, '').includes(q.replace(/\D/g, ''))) return false
      if (filterBranch !== 'all' && entry.booking.branchId !== filterBranch) return false
      if (filterInstructor !== 'all' && entry.booking.instructorId !== filterInstructor) return false
      const slotTime = entry.slot ? getSlotDateTime(entry.slot) : null
      if (tab === 'today') return slotTime && isSameDay(slotTime, today)
      if (tab === 'future') return slotTime && isAfter(slotTime, today)
      if (tab === 'cancelled') return entry.booking.status === 'cancelled'
      if (tab === 'attention') {
        const pastActive = slotTime && isBefore(slotTime, now) && entry.booking.status === 'active'
        const hasNotes = entry.booking.notes || entry.booking.comment
        return Boolean(pastActive || hasNotes)
      }
      return true
    }).sort((a, b) => {
      const ta = a.slot ? getSlotDateTime(a.slot).getTime() : 0
      const tb = b.slot ? getSlotDateTime(b.slot).getTime() : 0
      if (tab === 'cancelled') return tb - ta
      const pa = a.slot ? isBefore(getSlotDateTime(a.slot), startOfDay(now)) : false
      const pb = b.slot ? isBefore(getSlotDateTime(b.slot), startOfDay(now)) : false
      if (pa !== pb) return pa ? 1 : -1
      return ta - tb
    })
  }, [allBookings, tab, query, filterBranch, filterInstructor])

  const rescheduleSlots = useMemo(() => {
    if (!rescheduleId) return []
    return getAvailableSlots(
      rescheduleInstructor === 'all' ? undefined : rescheduleInstructor,
      rescheduleDate || undefined,
      rescheduleBranch === 'all' ? undefined : rescheduleBranch,
    )
  }, [rescheduleId, rescheduleDate, rescheduleBranch, rescheduleInstructor, refreshKey])

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'all', label: 'Все', count: allBookings.length },
    { key: 'today', label: 'Сегодня', count: allBookings.filter((e) => e.slot && isSameDay(getSlotDateTime(e.slot), new Date())).length },
    { key: 'future', label: 'Будущие', count: allBookings.filter((e) => e.slot && isAfter(getSlotDateTime(e.slot), startOfDay(new Date()))).length },
    { key: 'attention', label: 'Требуют внимания', count: allBookings.filter((e) => { const t = e.slot ? getSlotDateTime(e.slot) : null; const past = t && isBefore(t, new Date()) && e.booking.status === 'active'; return Boolean(past || e.booking.notes || e.booking.comment) }).length },
    { key: 'cancelled', label: 'Отменённые', count: allBookings.filter((e) => e.booking.status === 'cancelled').length },
  ]

  async function handleCancel() {
    if (!cancelId) return
    try {
      const r = await cancelBookingConfirmed(cancelId)
      if (!r.ok) { showToast(r.error ?? 'Ошибка', 'error'); return }
      showToast('Запись отменена', 'success')
      setRefreshKey((k) => k + 1)
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
      setRefreshKey((k) => k + 1)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Ошибка', 'error')
    }
    setCompleteId(null)
  }

  async function handleReschedule() {
    if (!rescheduleId || !selectedSlot) { showToast('Выберите новое время', 'error'); return }
    try {
      const r = await rescheduleBookingConfirmed({ bookingId: rescheduleId, newSlotId: selectedSlot, ignoreLimits: true })
      if (!r.ok) { showToast(r.error ?? 'Ошибка', 'error'); return }
      showToast(r.warning ?? 'Запись перенесена', 'success')
      setRefreshKey((k) => k + 1)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Ошибка', 'error')
    }
    setRescheduleId(null)
    setSelectedSlot('')
  }

  function openReschedule(bookingId: string) {
    const entry = allBookings.find((e) => e.booking.id === bookingId)
    setRescheduleId(bookingId)
    setRescheduleBranch(entry?.booking.branchId ?? 'all')
    setRescheduleInstructor(entry?.booking.instructorId ?? 'all')
    setRescheduleDate(entry?.slot?.date ?? isoDate(new Date()))
    setSelectedSlot('')
  }

  if (!school) return <div className="p-4"><p className="text-sm text-[#6F747A]">Загрузка…</p></div>

  return (
    <div className="min-h-dvh bg-bg pb-20">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-border bg-surface px-3 pt-3">
        <div className="mb-3">
          <h1 className="text-[20px] font-black tracking-[-0.03em] text-ink">Записи</h1>
          <p className="mt-0.5 text-[12px] font-semibold text-[#6F747A]">{allBookings.length} записей</p>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9EA3A8]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по ученику, телефону…"
            className="min-h-11 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-[14px] font-semibold text-ink outline-none placeholder:text-[#9EA3A8] focus:border-[#9EA3A8]"
          />
        </div>

        {/* Tabs */}
        <div className="-mx-3 mb-0 flex gap-0 overflow-x-auto border-b border-border px-3">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 border-b-2 px-3 pb-2.5 text-[12px] font-black transition-colors ${
                tab === t.key
                  ? 'border-ink text-ink'
                  : 'border-transparent text-[#9EA3A8] hover:text-[#6F747A]'
              }`}
            >
              {t.label}
              {t.count !== undefined && (
                <span className={`ml-1.5 text-[11px] font-bold ${tab === t.key ? 'text-[#9EA3A8]' : 'text-[#C5C9CF]'}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
          <button
            onClick={() => setFilterOpen(true)}
            className="ml-auto shrink-0 px-2 pb-2.5 text-[12px] font-bold text-[#9EA3A8]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#9EA3A8]">
              <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-border">
        {filtered.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-[14px] font-bold text-[#9EA3A8]">Нет записей</p>
          </div>
        ) : (
          filtered.map((entry) => {
            const slotTime = entry.slot ? getSlotDateTime(entry.slot) : null
            const isPast = slotTime && isBefore(slotTime, new Date()) && entry.booking.status === 'active'
            const pill = STATUS_PILL_MAP[entry.booking.status] ?? { label: entry.booking.status, status: 'neutral' as const }
            return (
              <div
                key={entry.booking.id}
                className={`px-3 py-2.5 ${isPast ? 'bg-error-soft/20' : 'bg-surface'}`}
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-black text-ink">
                        {entry.slot ? formatTimeRange(entry.slot) : '—'}
                      </span>
                      <StatusPill label={pill.label} status={pill.status} size="sm" />
                    </div>
                    <p className="mt-0.5 text-[11px] font-semibold text-[#9EA3A8]">
                      {entry.slot ? formatHumanDate(entry.slot.date, false) : '—'}
                      {entry.instructor ? ` · ${formatInstructorName(entry.instructor.name)}` : ''}
                      {entry.branch ? ` · ${entry.branch.name}` : ''}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[14px] font-black text-ink">{entry.booking.studentName}</p>
                    <p className="text-[11px] font-semibold text-[#9EA3A8]">{formatPhone(entry.booking.studentPhone)}</p>
                  </div>
                </div>

                {/* Meta */}
                {entry.slot && (
                  <p className="mt-1 text-[11px] font-semibold text-[#C5C9CF]">
                    {entry.slot.duration} мин
                    {entry.booking.studentEmail ? ` · ${entry.booking.studentEmail}` : ''}
                  </p>
                )}

                {/* Notes */}
                {(entry.booking.notes || entry.booking.comment) && (
                  <p className="mt-1.5 border-l-2 border-[#D4DAE1] pl-2 text-[11px] font-semibold text-[#6F747A]">
                    {entry.booking.notes || entry.booking.comment}
                  </p>
                )}

                {/* Actions */}
                {entry.booking.status === 'active' && (
                  <div className="mt-2 flex gap-1.5">
                    <button
                      onClick={() => setCompleteId(entry.booking.id)}
                      className="min-h-8 flex-1 rounded-lg border border-success/30 bg-success-soft px-2 text-[11px] font-black text-success transition hover:border-success hover:bg-success/10"
                    >
                      Провести
                    </button>
                    <button
                      onClick={() => openReschedule(entry.booking.id)}
                      className="min-h-8 flex-1 rounded-lg border border-info/30 bg-info-soft px-2 text-[11px] font-black text-info transition hover:border-info hover:bg-info/10"
                    >
                      Перенести
                    </button>
                    <button
                      onClick={() => setCancelId(entry.booking.id)}
                      className="min-h-8 flex-1 rounded-lg border border-error/30 bg-error-soft px-2 text-[11px] font-black text-error transition hover:border-error hover:bg-error/10"
                    >
                      Отменить
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Filter BottomSheet */}
      <BottomSheet open={filterOpen} onClose={() => setFilterOpen(false)} title="Фильтры">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[12px] font-bold text-[#6F747A]">Филиал</label>
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-[14px] font-semibold text-ink outline-none focus:border-[#9EA3A8]"
            >
              <option value="all">Все филиалы</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-bold text-[#6F747A]">Инструктор</label>
            <select
              value={filterInstructor}
              onChange={(e) => setFilterInstructor(e.target.value)}
              className="min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-[14px] font-semibold text-ink outline-none focus:border-[#9EA3A8]"
            >
              <option value="all">Все инструкторы</option>
              {instructors.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => { setFilterBranch('all'); setFilterInstructor('all') }}
              className="flex-1"
            >
              Сбросить
            </Button>
            <Button onClick={() => setFilterOpen(false)} className="flex-1">Применить</Button>
          </div>
        </div>
      </BottomSheet>

      {/* Reschedule BottomSheet */}
      <BottomSheet
        open={Boolean(rescheduleId)}
        onClose={() => { setRescheduleId(null); setSelectedSlot('') }}
        title="Перенести запись"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[11px] font-bold text-[#6F747A]">Филиал</label>
              <select value={rescheduleBranch} onChange={(e) => setRescheduleBranch(e.target.value)} className="min-h-10 w-full rounded-lg border border-border bg-surface px-2 text-[13px] font-semibold outline-none">
                <option value="all">Все</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold text-[#6F747A]">Инструктор</label>
              <select value={rescheduleInstructor} onChange={(e) => setRescheduleInstructor(e.target.value)} className="min-h-10 w-full rounded-lg border border-border bg-surface px-2 text-[13px] font-semibold outline-none">
                <option value="all">Все</option>
                {instructors.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold text-[#6F747A]">Дата</label>
            <input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} className="min-h-10 w-full rounded-lg border border-border bg-surface px-3 text-[13px] font-semibold outline-none" />
          </div>
          <div className="max-h-[260px] space-y-1.5 overflow-y-auto">
            {rescheduleSlots.length === 0 ? (
              <p className="py-4 text-center text-[13px] font-semibold text-[#9EA3A8]">Нет свободных окон</p>
            ) : (
              rescheduleSlots.map((slot) => {
                const inst = db.instructors.byId(slot.instructorId)
                const br = db.branches.byId(slot.branchId)
                return (
                  <button
                    key={slot.id}
                    onClick={() => setSelectedSlot(slot.id)}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition ${
                      selectedSlot === slot.id
                        ? 'border-ink bg-ink text-surface'
                        : 'border-border bg-surface text-ink'
                    }`}
                  >
                    <span>
                      <span className="block text-[13px] font-black">{formatHumanDate(slot.date, false)} · {formatTimeRange(slot)}</span>
                      <span className="block text-[11px] font-semibold opacity-70">{inst?.name} · {br?.name} · {slot.duration} мин</span>
                    </span>
                    <span className={`text-[11px] font-black ${selectedSlot === slot.id ? 'text-white' : 'text-[#9EA3A8]'}`}>выбрать</span>
                  </button>
                )
              })
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={() => void handleReschedule()} disabled={!selectedSlot} className="flex-1">
              Перенести
            </Button>
            <Button variant="secondary" onClick={() => { setRescheduleId(null); setSelectedSlot('') }} className="flex-1">
              Отмена
            </Button>
          </div>
        </div>
      </BottomSheet>

      <ConfirmDialog open={Boolean(cancelId)} title="Отменить запись" description="Время снова станет доступным." confirmLabel="Отменить" onClose={() => setCancelId(null)} onConfirm={handleCancel} danger />
      <ConfirmDialog open={Boolean(completeId)} title="Провести занятие" description="Занятие будет отмечено как проведённое." confirmLabel="Подтвердить" onClose={() => setCompleteId(null)} onConfirm={handleComplete} />
    </div>
  )
}
