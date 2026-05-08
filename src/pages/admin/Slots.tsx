import { addDays, endOfWeek, isAfter, isBefore, isSameDay, startOfDay, startOfWeek } from 'date-fns'
import { useMemo, useState } from 'react'
import { StatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../components/ui/Toast'
import { formatInstructorName } from '../../lib/utils'
import { formatHumanDate, formatTimeRange } from '../../utils/date'
import {
  createBulkSlotsConfirmed,
  createSlotConfirmed,
  getSlotsBySchool,
  updateSlotStatusConfirmed,
} from '../../services/slotService'
import { db } from '../../services/storage'
import type { LessonType } from '../../types'

type SlotStatusFilter = 'all' | 'available' | 'booked' | 'cancelled'
type PeriodFilter = 'all' | 'today' | 'tomorrow' | 'week' | 'future'

export function AdminSlots() {
  const school = db.schools.all()[0] ?? null
  const { showToast } = useToast()
  const [createMode, setCreateMode] = useState<'bulk' | 'single'>('bulk')
  const [search, setSearch] = useState('')
  const [date, setDate] = useState('')
  const [branchId, setBranchId] = useState('all')
  const [instructorId, setInstructorId] = useState('all')
  const [status] = useState<SlotStatusFilter>('all')
  const [period] = useState<PeriodFilter>('future')
  const [toggleId, setToggleId] = useState<string | null>(null)

  const branches = school ? db.branches.bySchool(school.id).filter((b) => b.isActive) : []
  const instructors = school ? db.instructors.bySchool(school.id).filter((i) => i.isActive) : []
  const defaultDuration = String(school?.defaultLessonDuration ?? 90)

  const [bulkForm, setBulkForm] = useState({
    branchId: branches[0]?.id ?? '',
    instructorId: instructors[0]?.id ?? '',
    dateFrom: '',
    dateTo: '',
    weekdays: [1, 2, 3, 4, 5] as number[],
    windowStart: '09:00',
    windowEnd: '18:00',
    duration: defaultDuration,
    lessonType: 'driving' as LessonType,
    breakMinutes: '15',
  })

  const [singleForm, setSingleForm] = useState({
    branchId: branches[0]?.id ?? '',
    instructorId: instructors[0]?.id ?? '',
    date: '',
    startTime: '10:00',
    duration: defaultDuration,
    lessonType: 'driving' as LessonType,
  })

  const slots = school ? getSlotsBySchool(school.id) : []

  const filtered = useMemo(() => {
    const now = new Date()
    const q = search.trim().toLowerCase()
    return slots.filter((entry) => {
      const startsAt = new Date(`${entry.slot.date}T${entry.slot.time}:00`)
      if (q && !entry.instructor?.name.toLowerCase().includes(q) && !entry.branch?.name.toLowerCase().includes(q) && !entry.slot.time.includes(q)) return false
      if (date && entry.slot.date !== date) return false
      if (branchId !== 'all' && entry.slot.branchId !== branchId) return false
      if (instructorId !== 'all' && entry.slot.instructorId !== instructorId) return false
      if (status !== 'all' && entry.slot.status !== status) return false
      if (period !== 'all') {
        if (period === 'today') return isSameDay(startsAt, now)
        if (period === 'tomorrow') return isSameDay(startsAt, addDays(now, 1))
        if (period === 'week') {
          const ws = startOfWeek(now, { weekStartsOn: 1 })
          const we = endOfWeek(now, { weekStartsOn: 1 })
          return !isBefore(startsAt, ws) && !isAfter(startsAt, we)
        }
        return !isBefore(startsAt, startOfDay(now))
      }
      return true
    })
  }, [slots, search, date, branchId, instructorId, status, period])

  async function handleBulkCreate() {
    if (!school || !bulkForm.branchId || !bulkForm.instructorId) { showToast('Заполните все поля', 'error'); return }
    try {
      const r = await createBulkSlotsConfirmed({
        schoolId: school.id,
        branchId: bulkForm.branchId,
        instructorId: bulkForm.instructorId,
        dateFrom: bulkForm.dateFrom,
        dateTo: bulkForm.dateTo,
        weekdays: bulkForm.weekdays,
        windowStart: bulkForm.windowStart,
        windowEnd: bulkForm.windowEnd,
        duration: Number(bulkForm.duration),
        lessonType: bulkForm.lessonType,
        breakMinutes: Number(bulkForm.breakMinutes),
      })
      if (!r.ok || !r.result) { showToast(r.error ?? 'Ошибка', 'error'); return }
      const { createdCount, skippedDuplicates, skippedPast } = r.result
      showToast(`Создано: ${createdCount}. Дублей: ${skippedDuplicates}. Прошлых: ${skippedPast}.`, 'success')
    } catch (e) { showToast(e instanceof Error ? e.message : 'Ошибка', 'error') }
  }

  async function handleSingleCreate() {
    if (!school || !singleForm.branchId || !singleForm.instructorId || !singleForm.date) { showToast('Заполните все поля', 'error'); return }
    try {
      const r = await createSlotConfirmed({
        schoolId: school.id,
        branchId: singleForm.branchId,
        instructorId: singleForm.instructorId,
        date: singleForm.date,
        startTime: singleForm.startTime,
        duration: Number(singleForm.duration),
        lessonType: singleForm.lessonType,
      })
      if (!r.ok) { showToast(r.error ?? 'Ошибка', 'error'); return }
      showToast('Занятие добавлено', 'success')
    } catch (e) { showToast(e instanceof Error ? e.message : 'Ошибка', 'error') }
  }

  async function handleToggle() {
    if (!toggleId) return
    const entry = slots.find((e) => e.slot.id === toggleId)
    if (!entry) return
    const next = entry.slot.status === 'cancelled' ? 'available' : 'cancelled'
    try {
      const r = await updateSlotStatusConfirmed(toggleId, next)
      if (!r.ok) { showToast(r.error ?? 'Ошибка', 'error'); return }
      showToast(next === 'cancelled' ? 'Занятие скрыто' : 'Занятие доступно', 'success')
    } catch (e) { showToast(e instanceof Error ? e.message : 'Ошибка', 'error') }
    setToggleId(null)
  }

  if (!school) return <div className="px-3 py-4"><p className="text-sm text-[#6F747A]">Данные школы не загружены</p></div>

  return (
    <div className="px-3 pb-24 pt-3 md:px-5 md:pt-4">
      <div className="mb-4">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#9EA3A8]">{school.name}</p>
        <h1 className="mt-1 text-[22px] font-black tracking-[-0.03em] text-[#111418] md:text-[26px]">Расписание</h1>
      </div>

      {/* Create form */}
      <div className="mb-5 space-y-3 rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white px-3 py-3">
        {/* Mode toggle */}
        <div className="flex gap-1 rounded-[12px] border border-[rgba(0,0,0,0.06)] p-0.5">
          <button onClick={() => setCreateMode('bulk')} className={`flex-1 rounded-[10px] py-1.5 text-[12px] font-black transition ${createMode === 'bulk' ? 'bg-[#111418] text-white' : 'text-[#6F747A]'}`}>Серия</button>
          <button onClick={() => setCreateMode('single')} className={`flex-1 rounded-[10px] py-1.5 text-[12px] font-black transition ${createMode === 'single' ? 'bg-[#111418] text-white' : 'text-[#6F747A]'}`}>Одно</button>
        </div>

        {createMode === 'bulk' ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <select value={bulkForm.branchId} onChange={(e) => setBulkForm((f) => ({ ...f, branchId: e.target.value }))} className="h-9 rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-white px-2.5 text-[13px] font-semibold outline-none">
                <option value="">Филиал</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <select value={bulkForm.instructorId} onChange={(e) => setBulkForm((f) => ({ ...f, instructorId: e.target.value }))} className="h-9 rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-white px-2.5 text-[13px] font-semibold outline-none">
                <option value="">Инструктор</option>
                {instructors.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
              <input type="date" value={bulkForm.dateFrom} onChange={(e) => setBulkForm((f) => ({ ...f, dateFrom: e.target.value }))} className="h-9 rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-white px-2.5 text-[12px] outline-none" placeholder="От" />
              <input type="date" value={bulkForm.dateTo} onChange={(e) => setBulkForm((f) => ({ ...f, dateTo: e.target.value }))} className="h-9 rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-white px-2.5 text-[12px] outline-none" placeholder="До" />
              <input type="time" value={bulkForm.windowStart} onChange={(e) => setBulkForm((f) => ({ ...f, windowStart: e.target.value }))} className="h-9 rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-white px-2.5 text-[12px] outline-none" />
              <input type="time" value={bulkForm.windowEnd} onChange={(e) => setBulkForm((f) => ({ ...f, windowEnd: e.target.value }))} className="h-9 rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-white px-2.5 text-[12px] outline-none" />
            </div>

            {/* Weekdays */}
            <div className="flex gap-1">
              {[{ label: 'Пн', v: 1 }, { label: 'Вт', v: 2 }, { label: 'Ср', v: 3 }, { label: 'Чт', v: 4 }, { label: 'Пт', v: 5 }, { label: 'Сб', v: 6 }, { label: 'Вс', v: 0 }].map((d) => {
                const active = bulkForm.weekdays.includes(d.v)
                return (
                  <button key={d.v} type="button" onClick={() => setBulkForm((f) => ({ ...f, weekdays: active ? f.weekdays.filter((x) => x !== d.v) : [...f.weekdays, d.v] }))}
                    className={`flex-1 rounded-[10px] border py-2 text-[11px] font-black transition ${active ? 'border-[#111418] bg-[#111418] text-white' : 'border-[rgba(0,0,0,0.06)] bg-white text-[#6F747A]'}`}>
                    {d.label}
                  </button>
                )
              })}
            </div>

            <div className="flex gap-2">
              <Button onClick={() => void handleBulkCreate()} className="flex-1">Создать серию</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <select value={singleForm.branchId} onChange={(e) => setSingleForm((f) => ({ ...f, branchId: e.target.value }))} className="h-9 rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-white px-2.5 text-[13px] font-semibold outline-none">
                <option value="">Филиал</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <select value={singleForm.instructorId} onChange={(e) => setSingleForm((f) => ({ ...f, instructorId: e.target.value }))} className="h-9 rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-white px-2.5 text-[13px] font-semibold outline-none">
                <option value="">Инструктор</option>
                {instructors.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
              <input type="date" value={singleForm.date} onChange={(e) => setSingleForm((f) => ({ ...f, date: e.target.value }))} className="h-9 rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-white px-2.5 text-[12px] outline-none" />
              <input type="time" value={singleForm.startTime} onChange={(e) => setSingleForm((f) => ({ ...f, startTime: e.target.value }))} className="h-9 rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-white px-2.5 text-[12px] outline-none" />
            </div>
            <Button onClick={() => void handleSingleCreate()} className="w-full">Добавить занятие</Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="mb-3 space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9EA3A8]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск" className="h-10 w-full rounded-[12px] border border-[rgba(0,0,0,0.06)] bg-white pl-9 pr-3 text-[14px] font-medium text-[#111418] outline-none placeholder:text-[#9EA3A8] focus:border-[#111418]" />
          </div>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10 w-[130px] rounded-[12px] border border-[rgba(0,0,0,0.06)] bg-white px-3 text-[13px] text-[#111418] outline-none" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="h-9 rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-white px-2.5 text-[13px] font-semibold text-[#111418] outline-none">
            <option value="all">Все филиалы</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select value={instructorId} onChange={(e) => setInstructorId(e.target.value)} className="h-9 rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-white px-2.5 text-[13px] font-semibold text-[#111418] outline-none">
            <option value="all">Все инструкторы</option>
            {instructors.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-[#CBD5E1] bg-white px-4 py-5 text-center">
          <p className="font-black text-[#111418]">Занятий не найдено</p>
          <p className="mt-1 text-sm text-[#9EA3A8]">Создайте занятия выше</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => (
            <div key={entry.slot.id} className="flex items-center gap-3 rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white px-3 py-2.5">
              <div className="shrink-0 text-center">
                <p className="text-[13px] font-black text-[#111418]">{formatTimeRange(entry.slot)}</p>
                <p className="text-[11px] font-semibold text-[#9EA3A8]">{formatHumanDate(entry.slot.date, false)}</p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-black text-[#111418]">{entry.instructor ? formatInstructorName(entry.instructor.name) : '—'}</p>
                <p className="truncate text-[12px] font-semibold text-[#6F747A]">{entry.branch?.name ?? '—'}</p>
              </div>
              <StatusBadge status={entry.slot.status} kind="slot" />
              {entry.slot.status !== 'booked' && (
                <button onClick={() => setToggleId(entry.slot.id)} className="shrink-0 text-[11px] font-bold text-[#3156D4]">
                  {entry.slot.status === 'cancelled' ? 'Вернуть' : 'Скрыть'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(toggleId)}
        title="Изменить доступность"
        description="Свободное занятие можно скрыть или вернуть."
        confirmLabel="Подтвердить"
        onClose={() => setToggleId(null)}
        onConfirm={() => void handleToggle()}
      />
    </div>
  )
}
