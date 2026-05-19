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
import { filterBranches, filterInstructors, filterSlots } from '../../services/staffScope'
import type { LessonType } from '../../types'

type SlotStatusFilter = 'all' | 'available' | 'booked' | 'cancelled'
type PeriodFilter = 'all' | 'today' | 'tomorrow' | 'week' | 'future' | 'past'

const weekdayOptions = [
  { label: 'ПН', v: 1 },
  { label: 'ВТ', v: 2 },
  { label: 'СР', v: 3 },
  { label: 'ЧТ', v: 4 },
  { label: 'ПТ', v: 5 },
  { label: 'СБ', v: 6 },
  { label: 'ВС', v: 0 },
]

const lessonTypeLabels: Record<LessonType, string> = {
  driving: 'Вождение',
  main: 'Основное',
  extra: 'Доп.',
  practice_ground: 'Площадка',
  city: 'Город',
  exam_route: 'Маршрут ГИБДД',
  internal_exam: 'Внутр. экзамен',
  retake: 'Пересдача',
  mistakes: 'Ошибки',
}

export function AdminSlots() {
  const school = db.schools.currentAdmin() ?? null
  const { showToast } = useToast()
  const [createMode, setCreateMode] = useState<'bulk' | 'single'>('bulk')
  const [search, setSearch] = useState('')
  const [date, setDate] = useState('')
  const [branchId, setBranchId] = useState('all')
  const [instructorId, setInstructorId] = useState('all')
  const [status, setStatus] = useState<SlotStatusFilter>('all')
  const [period, setPeriod] = useState<PeriodFilter>('future')
  const [toggleId, setToggleId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const branches = school ? filterBranches(db.branches.bySchool(school.id)).filter((b) => b.isActive) : []
  const instructors = school ? filterInstructors(db.instructors.bySchool(school.id)).filter((i) => i.isActive) : []
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

  const slots = useMemo(() => school ? getSlotsBySchool(school.id).filter((entry) => filterSlots([entry.slot]).length > 0) : [], [school, refreshKey])

  const stats = useMemo(() => {
    const now = new Date()
    const today = slots.filter((entry) => isSameDay(new Date(`${entry.slot.date}T${entry.slot.time}:00`), now))
    const week = slots.filter((entry) => {
      const startsAt = new Date(`${entry.slot.date}T${entry.slot.time}:00`)
      return !isBefore(startsAt, startOfWeek(now, { weekStartsOn: 1 })) && !isAfter(startsAt, endOfWeek(now, { weekStartsOn: 1 }))
    })
    const futureAvailable = slots.filter((entry) => entry.slot.status === 'available' && !isBefore(new Date(`${entry.slot.date}T${entry.slot.time}:00`), now))
    const pastOpen = slots.filter((entry) => entry.slot.status === 'available' && isBefore(new Date(`${entry.slot.date}T${entry.slot.time}:00`), now))
    return {
      todayTotal: today.length,
      todayBooked: today.filter((entry) => entry.slot.status === 'booked').length,
      weekTotal: week.length,
      futureAvailable: futureAvailable.length,
      pastOpen: pastOpen.length,
      load: week.length ? Math.round((week.filter((entry) => entry.slot.status === 'booked').length / week.length) * 100) : 0,
    }
  }, [slots])

  const filtered = useMemo(() => {
    const now = new Date()
    const q = search.trim().toLowerCase()
    return slots
      .filter((entry) => {
        const startsAt = new Date(`${entry.slot.date}T${entry.slot.time}:00`)
        if (q) {
          const haystack = [entry.instructor?.name, entry.branch?.name, entry.booking?.studentName, entry.booking?.studentPhone, entry.slot.time, entry.slot.date].filter(Boolean).join(' ').toLowerCase()
          if (!haystack.includes(q)) return false
        }
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
          if (period === 'future') return !isBefore(startsAt, startOfDay(now))
          if (period === 'past') return isBefore(startsAt, startOfDay(now))
        }
        return true
      })
      .sort((a, b) => new Date(`${a.slot.date}T${a.slot.time}:00`).getTime() - new Date(`${b.slot.date}T${b.slot.time}:00`).getTime())
  }, [slots, search, date, branchId, instructorId, status, period])

  const dayGroups = useMemo(() => {
    const map = new Map<string, typeof filtered>()
    filtered.forEach((entry) => {
      const current = map.get(entry.slot.date) ?? []
      current.push(entry)
      map.set(entry.slot.date, current)
    })
    return Array.from(map.entries()).slice(0, 8)
  }, [filtered])

  async function handleBulkCreate() {
    if (!school || !bulkForm.branchId || !bulkForm.instructorId || !bulkForm.dateFrom || !bulkForm.dateTo) { showToast('Заполните филиал, инструктора и даты', 'error'); return }
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
      showToast(`Сетка создана: ${createdCount}. Дубли: ${skippedDuplicates}. Прошлые: ${skippedPast}.`, 'success')
      setRefreshKey((value) => value + 1)
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
      showToast('Окно добавлено в журнал', 'success')
      setRefreshKey((value) => value + 1)
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
      showToast(next === 'cancelled' ? 'Окно снято с записи' : 'Окно возвращено в запись', 'success')
      setRefreshKey((value) => value + 1)
    } catch (e) { showToast(e instanceof Error ? e.message : 'Ошибка', 'error') }
    setToggleId(null)
  }

  if (!school) return <div className="px-3 py-4"><p className="text-sm text-[#5F6875]">Данные школы не загружены</p></div>

  const selectedToggle = toggleId ? slots.find((entry) => entry.slot.id === toggleId) : null

  return (
    <div className="v-ops-shell min-h-dvh bg-[#F5F7FA] pb-4 text-[#0F172A]">
      <div className="mx-auto grid max-w-[1320px] gap-3 p-3 md:grid-cols-[380px_minmax(0,1fr)] md:p-5">
        <aside className="space-y-3">
          <section className="v-ops-hero border border-[#D7DEE8] bg-white text-[#0F172A]">
            <div className="p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#667085]">диспетчерская · {school.name}</p>
              <h1 className="mt-1 text-[30px] font-black leading-none tracking-[-0.04em] text-[#111827]">Расписание</h1>
              <p className="mt-2 text-[13px] font-bold leading-5 text-[#667085]">Производственный табель: где есть свободное время, где занято, что провисло.</p>
            </div>
            <div className="grid grid-cols-2 border-t border-[#E5EAF1]">
              <button onClick={() => { setPeriod('today'); setStatus('all') }} className="min-h-[78px] border-r border-[#E5EAF1] bg-[#F8FAFC] p-3 text-left transition hover:bg-white">
                <strong className="block text-[30px] font-black leading-none text-[#111827]">{stats.todayTotal}</strong><span className="text-[10px] font-black uppercase text-[#667085]">окон сегодня</span>
              </button>
              <button onClick={() => { setPeriod('today'); setStatus('booked') }} className="min-h-[78px] bg-[#F8FAFC] p-3 text-left transition hover:bg-white">
                <strong className="block text-[30px] font-black leading-none text-[#111827]">{stats.todayBooked}</strong><span className="text-[10px] font-black uppercase text-[#667085]">занято сегодня</span>
              </button>
              <button onClick={() => { setPeriod('week'); setStatus('all') }} className="min-h-[78px] border-r border-t border-[#E5EAF1] bg-[#F8FAFC] p-3 text-left transition hover:bg-white">
                <strong className="block text-[30px] font-black leading-none text-[#111827]">{stats.load}%</strong><span className="text-[10px] font-black uppercase text-[#667085]">загрузка недели</span>
              </button>
              <button onClick={() => { setPeriod('future'); setStatus('available') }} className="min-h-[78px] border-t border-[#E5EAF1] bg-[#F8FAFC] p-3 text-left transition hover:bg-white">
                <strong className="block text-[30px] font-black leading-none text-[#111827]">{stats.futureAvailable}</strong><span className="text-[10px] font-black uppercase text-[#667085]">свободно впереди</span>
              </button>
            </div>
          </section>

          <section className="v-ops-panel border border-[#D7DEE8] bg-white">
            <div className="grid grid-cols-2 border-b border-[#CBD5E1]">
              <button onClick={() => setCreateMode('bulk')} className={`min-h-12 border-r border-[#CBD5E1] text-[12px] font-black uppercase ${createMode === 'bulk' ? 'bg-[#0F172A] text-white' : 'bg-white text-[#334155]'}`}>Собрать сетку</button>
              <button onClick={() => setCreateMode('single')} className={`min-h-12 text-[12px] font-black uppercase ${createMode === 'single' ? 'bg-[#0F172A] text-white' : 'bg-white text-[#334155]'}`}>Одно окно</button>
            </div>

            {createMode === 'bulk' ? (
              <div className="space-y-2 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <select value={bulkForm.branchId} onChange={(e) => setBulkForm((f) => ({ ...f, branchId: e.target.value }))} className="min-h-11 border border-[#CBD5E1] bg-white px-2 text-[12px] font-bold outline-none focus:border-[#0F172A]">
                    <option value="">Филиал</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  <select value={bulkForm.instructorId} onChange={(e) => setBulkForm((f) => ({ ...f, instructorId: e.target.value }))} className="min-h-11 border border-[#CBD5E1] bg-white px-2 text-[12px] font-bold outline-none focus:border-[#0F172A]">
                    <option value="">Инструктор</option>{instructors.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                  <input type="date" value={bulkForm.dateFrom} onChange={(e) => setBulkForm((f) => ({ ...f, dateFrom: e.target.value }))} className="min-h-11 border border-[#CBD5E1] bg-white px-2 text-[12px] font-bold outline-none" />
                  <input type="date" value={bulkForm.dateTo} onChange={(e) => setBulkForm((f) => ({ ...f, dateTo: e.target.value }))} className="min-h-11 border border-[#CBD5E1] bg-white px-2 text-[12px] font-bold outline-none" />
                  <input type="time" value={bulkForm.windowStart} onChange={(e) => setBulkForm((f) => ({ ...f, windowStart: e.target.value }))} className="min-h-11 border border-[#CBD5E1] bg-white px-2 text-[12px] font-bold outline-none" />
                  <input type="time" value={bulkForm.windowEnd} onChange={(e) => setBulkForm((f) => ({ ...f, windowEnd: e.target.value }))} className="min-h-11 border border-[#CBD5E1] bg-white px-2 text-[12px] font-bold outline-none" />
                  <input inputMode="numeric" value={bulkForm.duration} onChange={(e) => setBulkForm((f) => ({ ...f, duration: e.target.value }))} placeholder="Минут" className="min-h-11 border border-[#CBD5E1] bg-white px-2 text-[12px] font-bold outline-none" />
                  <input inputMode="numeric" value={bulkForm.breakMinutes} onChange={(e) => setBulkForm((f) => ({ ...f, breakMinutes: e.target.value }))} placeholder="Перерыв" className="min-h-11 border border-[#CBD5E1] bg-white px-2 text-[12px] font-bold outline-none" />
                  <select value={bulkForm.lessonType} onChange={(e) => setBulkForm((f) => ({ ...f, lessonType: e.target.value as LessonType }))} className="col-span-2 min-h-11 border border-[#CBD5E1] bg-white px-2 text-[12px] font-bold outline-none">
                    {(Object.keys(lessonTypeLabels) as LessonType[]).map((type) => <option key={type} value={type}>{lessonTypeLabels[type]}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {weekdayOptions.map((d) => {
                    const active = bulkForm.weekdays.includes(d.v)
                    return <button key={d.v} type="button" onClick={() => setBulkForm((f) => ({ ...f, weekdays: active ? f.weekdays.filter((x) => x !== d.v) : [...f.weekdays, d.v] }))} className={`min-h-10 border text-[11px] font-black ${active ? 'border-[#0F172A] bg-[#0F172A] text-white' : 'border-[#CBD5E1] bg-white text-[#64748B]'}`}>{d.label}</button>
                  })}
                </div>
                <Button onClick={() => void handleBulkCreate()} className="w-full">Сгенерировать окна</Button>
              </div>
            ) : (
              <div className="space-y-2 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <select value={singleForm.branchId} onChange={(e) => setSingleForm((f) => ({ ...f, branchId: e.target.value }))} className="min-h-11 border border-[#CBD5E1] bg-white px-2 text-[12px] font-bold outline-none">
                    <option value="">Филиал</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  <select value={singleForm.instructorId} onChange={(e) => setSingleForm((f) => ({ ...f, instructorId: e.target.value }))} className="min-h-11 border border-[#CBD5E1] bg-white px-2 text-[12px] font-bold outline-none">
                    <option value="">Инструктор</option>{instructors.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                  <input type="date" value={singleForm.date} onChange={(e) => setSingleForm((f) => ({ ...f, date: e.target.value }))} className="min-h-11 border border-[#CBD5E1] bg-white px-2 text-[12px] font-bold outline-none" />
                  <input type="time" value={singleForm.startTime} onChange={(e) => setSingleForm((f) => ({ ...f, startTime: e.target.value }))} className="min-h-11 border border-[#CBD5E1] bg-white px-2 text-[12px] font-bold outline-none" />
                  <input inputMode="numeric" value={singleForm.duration} onChange={(e) => setSingleForm((f) => ({ ...f, duration: e.target.value }))} className="min-h-11 border border-[#CBD5E1] bg-white px-2 text-[12px] font-bold outline-none" />
                  <select value={singleForm.lessonType} onChange={(e) => setSingleForm((f) => ({ ...f, lessonType: e.target.value as LessonType }))} className="min-h-11 border border-[#CBD5E1] bg-white px-2 text-[12px] font-bold outline-none">
                    {(Object.keys(lessonTypeLabels) as LessonType[]).map((type) => <option key={type} value={type}>{lessonTypeLabels[type]}</option>)}
                  </select>
                </div>
                <Button onClick={() => void handleSingleCreate()} className="w-full">Добавить окно</Button>
              </div>
            )}
          </section>

          {stats.pastOpen > 0 ? <button onClick={() => { setPeriod('past'); setStatus('available') }} className="w-full border border-[#DC2626] bg-[#FEF2F2] px-4 py-3 text-left text-[13px] font-black text-[#DC2626]">Прошлые незакрытые свободные окна: {stats.pastOpen}</button> : null}
        </aside>

        <main className="space-y-3">
          <section className="v-ops-panel border border-[#D7DEE8] bg-white">
            <div className="grid gap-2 border-b border-[#CBD5E1] p-3 md:grid-cols-[minmax(0,1fr)_170px]">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск: инструктор, филиал, ученик, телефон, время" className="min-h-11 border border-[#CBD5E1] bg-white px-3 text-[14px] font-bold outline-none focus:border-[#0F172A]" />
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="min-h-11 border border-[#CBD5E1] bg-white px-3 text-[13px] font-bold outline-none" />
              <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="min-h-11 border border-[#CBD5E1] bg-white px-3 text-[13px] font-bold outline-none">
                <option value="all">Все филиалы</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <select value={instructorId} onChange={(e) => setInstructorId(e.target.value)} className="min-h-11 border border-[#CBD5E1] bg-white px-3 text-[13px] font-bold outline-none">
                <option value="all">Все инструкторы</option>{instructors.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
            <div className="flex gap-1 overflow-x-auto border-b border-[#CBD5E1] p-2">
              {[
                ['all', 'Все статусы'], ['available', 'Свободно'], ['booked', 'Занято'], ['cancelled', 'Скрыто'],
              ].map(([value, label]) => <button key={value} onClick={() => setStatus(value as SlotStatusFilter)} className={`min-h-10 shrink-0 border px-3 text-[12px] font-black ${status === value ? 'border-[#0F172A] bg-[#0F172A] text-white' : 'border-[#CBD5E1] bg-white text-[#334155]'}`}>{label}</button>)}
              {[
                ['today', 'Сегодня'], ['week', 'Неделя'], ['future', 'Будущие'], ['past', 'Прошлые'],
              ].map(([value, label]) => <button key={value} onClick={() => setPeriod(period === value ? 'all' : value as PeriodFilter)} className={`min-h-10 shrink-0 border px-3 text-[12px] font-black ${period === value ? 'border-[#1D4ED8] bg-[#EFF6FF] text-[#1D4ED8]' : 'border-[#CBD5E1] bg-white text-[#334155]'}`}>{label}</button>)}
              <button onClick={() => { setSearch(''); setDate(''); setBranchId('all'); setInstructorId('all'); setStatus('all'); setPeriod('future') }} className="min-h-10 shrink-0 border border-[#CBD5E1] bg-[#F8FAFC] px-3 text-[12px] font-black text-[#64748B]">Сброс</button>
            </div>

            <div className="grid border-b border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-[#64748B] md:grid-cols-[88px_86px_110px_minmax(0,1fr)_minmax(0,1fr)_150px_104px]">
              <span>Дата</span><span>Время</span><span>Статус</span><span>Инструктор</span><span>Филиал / ученик</span><span>Тип</span><span className="text-right">Действие</span>
            </div>

            {filtered.length === 0 ? (
              <div className="p-5">
                <div className="border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-5">
                  <p className="text-[17px] font-black text-[#0F172A]">Окон не найдено</p>
                  <p className="mt-1 text-[13px] font-bold text-[#64748B]">Соберите сетку слева или ослабьте фильтры.</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-[#E2E8F0]">
                {filtered.map((entry) => {
                  const startsAt = new Date(`${entry.slot.date}T${entry.slot.time}:00`)
                  const stale = entry.slot.status === 'available' && isBefore(startsAt, new Date())
                  return (
                    <article key={entry.slot.id} className={`grid gap-2 px-3 py-3 text-[13px] md:grid-cols-[88px_86px_110px_minmax(0,1fr)_minmax(0,1fr)_150px_104px] md:items-center ${stale ? 'bg-[#FEF2F2]' : 'bg-white'}`}>
                      <div><span className="md:hidden text-[10px] font-black uppercase text-[#94A3B8]">Дата </span><strong>{formatHumanDate(entry.slot.date, false)}</strong></div>
                      <div className="text-[15px] font-black text-[#0F172A]">{formatTimeRange(entry.slot)}</div>
                      <div><StatusBadge status={entry.slot.status} kind="slot" /></div>
                      <div className="min-w-0"><p className="truncate font-black text-[#0F172A]">{entry.instructor ? formatInstructorName(entry.instructor.name) : '—'}</p><p className="truncate text-[11px] font-bold text-[#64748B]">{entry.instructor?.phone || 'телефон не указан'}</p></div>
                      <div className="min-w-0"><p className="truncate font-bold text-[#334155]">{entry.branch?.name ?? '—'}</p>{entry.booking ? <p className="truncate text-[12px] font-black text-[#0F172A]">{entry.booking.studentName} · {entry.booking.studentPhone}</p> : <p className="text-[12px] font-bold text-[#94A3B8]">свободная линия</p>}</div>
                      <div className="text-[12px] font-black text-[#475569]">{lessonTypeLabels[entry.slot.lessonType ?? 'driving']} · {entry.slot.duration} мин</div>
                      <div className="md:text-right">
                        {entry.slot.status !== 'booked' ? <button onClick={() => setToggleId(entry.slot.id)} className={`min-h-9 border px-3 text-[11px] font-black ${entry.slot.status === 'cancelled' ? 'border-[#16A34A] text-[#16A34A]' : 'border-[#DC2626] text-[#DC2626]'}`}>{entry.slot.status === 'cancelled' ? 'Вернуть' : 'Скрыть'}</button> : <span className="text-[11px] font-black text-[#94A3B8]">занято</span>}
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>

          {dayGroups.length > 0 ? (
            <section className="v-ops-panel border border-[#D7DEE8] bg-white">
              <div className="border-b border-[#CBD5E1] px-4 py-3"><h2 className="text-[16px] font-black">Плотность по дням</h2></div>
              <div className="grid gap-0 md:grid-cols-4">
                {dayGroups.map(([groupDate, entries]) => {
                  const booked = entries.filter((entry) => entry.slot.status === 'booked').length
                  const available = entries.filter((entry) => entry.slot.status === 'available').length
                  return <button key={groupDate} onClick={() => setDate(groupDate)} className="min-h-[92px] border-b border-r border-[#E2E8F0] p-3 text-left"><strong className="block text-[13px] font-black text-[#0F172A]">{formatHumanDate(groupDate, false)}</strong><span className="mt-2 block text-[24px] font-black leading-none">{entries.length}</span><span className="text-[11px] font-black uppercase text-[#64748B]">занято {booked} · свободно {available}</span></button>
                })}
              </div>
            </section>
          ) : null}
        </main>
      </div>

      <ConfirmDialog
        open={Boolean(toggleId)}
        title={selectedToggle?.slot.status === 'cancelled' ? 'Вернуть окно' : 'Скрыть окно'}
        description={selectedToggle ? `${formatHumanDate(selectedToggle.slot.date, false)} · ${formatTimeRange(selectedToggle.slot)} · ${selectedToggle.instructor?.name ?? 'инструктор'}` : 'Свободное окно можно скрыть или вернуть.'}
        confirmLabel="Подтвердить"
        onClose={() => setToggleId(null)}
        onConfirm={() => void handleToggle()}
      />
    </div>
  )
}
