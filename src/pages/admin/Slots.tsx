import { addDays, endOfWeek, isAfter, isBefore, isSameDay, startOfDay, startOfWeek } from 'date-fns'
import { CalendarAdd01Icon, Search01Icon } from '@hugeicons/core-free-icons'
import { useMemo, useState } from 'react'
import { StatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { createHugeIcon } from '../../components/ui/HugeIcon'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { StateView } from '../../components/ui/StateView'

import { CompactRow, FilterBar, SmallEmptyState, StickyBottomAction, WarningRow, compactFieldClassName } from '../../components/ui/CompactAdmin'
import { FormField } from '../../components/ui/FormField'
import { Input } from '../../components/ui/Input'
import { PageHeader } from '../../components/ui/PageHeader'
import { Section } from '../../components/ui/Section'
import { useToast } from '../../components/ui/Toast'
import { formatDuration, formatInstructorName } from '../../lib/utils'
import { formatHumanDate, formatTimeRange } from '../../utils/date'
import { createBulkSlots, createBulkSlotsConfirmed, createSlot, createSlotConfirmed, deleteSlot, deleteSlotConfirmed, getSlotsBySchool, updateSlotStatus, updateSlotStatusConfirmed } from '../../services/slotService'
import { db } from '../../services/storage'
import type { LessonType } from '../../types'
const CalendarPlus2 = createHugeIcon(CalendarAdd01Icon)
const Search = createHugeIcon(Search01Icon)

type SlotStatusFilter = 'all' | 'available' | 'booked' | 'cancelled'
type PeriodFilter = 'all' | 'today' | 'tomorrow' | 'week' | 'future'
type CreateMode = 'single' | 'bulk'

const lessonTypeOptions: Array<{ value: LessonType; label: string }> = [
  { value: 'driving', label: 'Вождение' },
  { value: 'main', label: 'Основное' },
  { value: 'extra', label: 'Дополнительное' },
  { value: 'practice_ground', label: 'Площадка' },
  { value: 'city', label: 'Город' },
  { value: 'exam_route', label: 'Экзамен. маршрут' },
  { value: 'internal_exam', label: 'Внутренний экзамен' },
  { value: 'retake', label: 'Пересдача' },
  { value: 'mistakes', label: 'Отработка' },
]

function selectClassName() {
  return compactFieldClassName()
}

export function AdminSlots() {
  const school = db.schools.all()[0] ?? null
  const { showToast } = useToast()
  const [mode, setMode] = useState<CreateMode>('bulk')
  const [search, setSearch] = useState('')
  const [date, setDate] = useState('')
  const [branchId, setBranchId] = useState('all')
  const [instructorId, setInstructorId] = useState('all')
  const [status, setStatus] = useState<SlotStatusFilter>('all')
  const [period, setPeriod] = useState<PeriodFilter>('future')
  const [deleteSlotId, setDeleteSlotId] = useState<string | null>(null)
  const [toggleSlotId, setToggleSlotId] = useState<string | null>(null)

  const branches = school ? db.branches.bySchool(school.id).filter((item) => item.isActive) : []
  const instructors = school ? db.instructors.bySchool(school.id).filter((item) => item.isActive) : []
  const defaultDuration = String(school?.defaultLessonDuration ?? 90)

  const [singleForm, setSingleForm] = useState({
    branchId: branches[0]?.id ?? '',
    instructorId: instructors[0]?.id ?? '',
    date: '',
    startTime: '10:00',
    duration: defaultDuration,
    lessonType: 'driving' as LessonType,
  })

  const [bulkForm, setBulkForm] = useState({
    branchId: branches[0]?.id ?? '',
    instructorId: instructors[0]?.id ?? '',
    dateFrom: '',
    dateTo: '',
    weekdays: [1, 2, 3, 4, 5],
    windowStart: '09:00',
    windowEnd: '18:00',
    duration: defaultDuration,
    lessonType: 'driving' as LessonType,
    breakMinutes: '15',
  })

  const slots = school ? getSlotsBySchool(school.id) : []

  const filteredSlots = useMemo(() => {
    const now = new Date()
    const query = search.trim().toLowerCase()

    return slots.filter((entry) => {
      const startsAt = new Date(`${entry.slot.date}T${entry.slot.time}:00`)
      const matchesSearch = !query
        ? true
        : entry.instructor?.name.toLowerCase().includes(query) ||
          entry.branch?.name.toLowerCase().includes(query) ||
          entry.student?.name.toLowerCase().includes(query) ||
          entry.slot.time.includes(query)
      const matchesDate = date ? entry.slot.date === date : true
      const matchesBranch = branchId === 'all' ? true : entry.slot.branchId === branchId
      const matchesInstructor = instructorId === 'all' ? true : entry.slot.instructorId === instructorId
      const matchesStatus = status === 'all' ? true : entry.slot.status === status
      const matchesPeriod = (() => {
        if (period === 'all') return true
        if (period === 'today') return isSameDay(startsAt, now)
        if (period === 'tomorrow') return isSameDay(startsAt, addDays(now, 1))
        if (period === 'week') {
          const weekStart = startOfWeek(now, { weekStartsOn: 1 })
          const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
          return !isBefore(startsAt, weekStart) && !isAfter(startsAt, weekEnd)
        }
        return !isBefore(startsAt, startOfDay(now))
      })()
      return matchesSearch && matchesDate && matchesBranch && matchesInstructor && matchesStatus && matchesPeriod
    })
  }, [branchId, date, instructorId, period, search, slots, status])

  function validateBase(branch: string, instructor: string): boolean {
    if (!school) return false
    if (!branch) {
      showToast('Выберите филиал.', 'error')
      return false
    }
    if (!instructor) {
      showToast('Выберите инструктора.', 'error')
      return false
    }
    return true
  }

  async function handleCreateSingle(): Promise<void> {
    if (!school || !validateBase(singleForm.branchId, singleForm.instructorId)) return
    let result: ReturnType<typeof createSlot>
    try {
      result = await createSlotConfirmed({
        schoolId: school.id,
        branchId: singleForm.branchId,
        instructorId: singleForm.instructorId,
        date: singleForm.date,
        startTime: singleForm.startTime,
        duration: Number(singleForm.duration),
        lessonType: singleForm.lessonType,
      })
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось создать занятие.', 'error')
      return
    }

    if (!result.ok) {
      showToast(result.error ?? 'Не удалось создать занятие.', 'error')
      return
    }
    showToast('Занятие добавлено в расписание.', 'success')
  }

  async function handleCreateBulk(): Promise<void> {
    if (!school || !validateBase(bulkForm.branchId, bulkForm.instructorId)) return
    let result: ReturnType<typeof createBulkSlots>
    try {
      result = await createBulkSlotsConfirmed({
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
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось создать расписание.', 'error')
      return
    }

    if (!result.ok || !result.result) {
      showToast(result.error ?? 'Не удалось создать расписание.', 'error')
      return
    }

    const { createdCount, skippedDuplicates, skippedPast } = result.result
    if (createdCount === 0) {
      showToast('Новых занятий не создано: все времена уже были заняты или в прошлом.', 'error')
      return
    }
    showToast(`Создано занятий: ${createdCount}. Пропущено дублей: ${skippedDuplicates}. В прошлом: ${skippedPast}.`, 'success')
  }

  async function handleDeleteSlot(): Promise<void> {
    if (!deleteSlotId) return
    let result: ReturnType<typeof deleteSlot>
    try {
      result = await deleteSlotConfirmed(deleteSlotId)
    } catch (error) {
      setDeleteSlotId(null)
      showToast(error instanceof Error ? error.message : 'Не удалось удалить занятие.', 'error')
      return
    }
    setDeleteSlotId(null)
    if (!result.ok) {
      showToast(result.error ?? 'Не удалось удалить занятие.', 'error')
      return
    }
    showToast('Занятие удалено.', 'success')
  }

  async function handleToggleSlot(): Promise<void> {
    if (!toggleSlotId) return
    const entry = slots.find((item) => item.slot.id === toggleSlotId)
    if (!entry) return
    const nextStatus = entry.slot.status === 'cancelled' ? 'available' : 'cancelled'
    let result: ReturnType<typeof updateSlotStatus>
    try {
      result = await updateSlotStatusConfirmed(toggleSlotId, nextStatus)
    } catch (error) {
      setToggleSlotId(null)
      showToast(error instanceof Error ? error.message : 'Не удалось изменить статус занятия.', 'error')
      return
    }
    setToggleSlotId(null)
    if (!result.ok) {
      showToast(result.error ?? 'Не удалось изменить статус занятия.', 'error')
      return
    }
    showToast(nextStatus === 'cancelled' ? 'Занятие скрыто из записи.' : 'Занятие снова доступно.', 'success')
  }

  if (!school) {
    return (
      <div className="max-w-7xl bg-[#E9EEF7] p-2.5 md:p-5">
        <StateView kind="error" title="Школа не найдена" description="Проверьте данные школы." />
      </div>
    )
  }

  return (
    <div className="max-w-7xl bg-[#E9EEF7] p-2.5 md:p-5">
      <PageHeader
        eyebrow={school.name}
        title="Расписание"
        description="Добавить время и быстро проверить занятия."
      />

      <div className="mt-3 space-y-3">
        <Section title="Добавить занятия" description="Филиал, инструктор, даты и время.">
          <div className="mb-3 grid grid-cols-2 gap-1.5 rounded-[14px] border border-[#D8E0EC] bg-white p-1">
            <Button size="sm" variant={mode === 'bulk' ? 'primary' : 'ghost'} onClick={() => setMode('bulk')}>
              Серия занятий
            </Button>
            <Button size="sm" variant={mode === 'single' ? 'primary' : 'ghost'} onClick={() => setMode('single')}>
              Одно занятие
            </Button>
          </div>

          {mode === 'bulk' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                <FormField label="Филиал">
                  <select value={bulkForm.branchId} onChange={(event) => setBulkForm((current) => ({ ...current, branchId: event.target.value }))} className={selectClassName()}>
                    <option value="">Выберите филиал</option>
                    {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                  </select>
                </FormField>
                <FormField label="Инструктор">
                  <select value={bulkForm.instructorId} onChange={(event) => setBulkForm((current) => ({ ...current, instructorId: event.target.value }))} className={selectClassName()}>
                    <option value="">Выберите инструктора</option>
                    {instructors.map((instructor) => <option key={instructor.id} value={instructor.id}>{instructor.name}</option>)}
                  </select>
                </FormField>
                <Input label="Дата от" type="date" value={bulkForm.dateFrom} onChange={(event) => setBulkForm((current) => ({ ...current, dateFrom: event.target.value }))} />
                <Input label="Дата до" type="date" value={bulkForm.dateTo} onChange={(event) => setBulkForm((current) => ({ ...current, dateTo: event.target.value }))} />
                <Input label="Начало дня" type="time" value={bulkForm.windowStart} onChange={(event) => setBulkForm((current) => ({ ...current, windowStart: event.target.value }))} />
                <Input label="Конец дня" type="time" value={bulkForm.windowEnd} onChange={(event) => setBulkForm((current) => ({ ...current, windowEnd: event.target.value }))} />
                <FormField label="Тип занятия">
                  <select value={bulkForm.lessonType} onChange={(event) => setBulkForm((current) => ({ ...current, lessonType: event.target.value as LessonType }))} className={selectClassName()}>
                    {lessonTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </FormField>
                <Input label="Длительность" type="number" step={15} helperText={formatDuration(Number(bulkForm.duration || defaultDuration))} value={bulkForm.duration} onChange={(event) => setBulkForm((current) => ({ ...current, duration: event.target.value }))} />
                <Input label="Перерыв, минут" type="number" value={bulkForm.breakMinutes} onChange={(event) => setBulkForm((current) => ({ ...current, breakMinutes: event.target.value }))} />
              </div>

              <FormField label="Дни недели">
                <div className="grid grid-cols-7 gap-1">
                  {[
                    { label: 'Пн', value: 1 },
                    { label: 'Вт', value: 2 },
                    { label: 'Ср', value: 3 },
                    { label: 'Чт', value: 4 },
                    { label: 'Пт', value: 5 },
                    { label: 'Сб', value: 6 },
                    { label: 'Вс', value: 0 },
                  ].map((day) => {
                    const active = bulkForm.weekdays.includes(day.value)
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() =>
                          setBulkForm((current) => ({
                            ...current,
                            weekdays: active ? current.weekdays.filter((value) => value !== day.value) : [...current.weekdays, day.value],
                          }))
                        }
                        className={`rounded-[10px] border px-1.5 py-2 text-[13px] font-bold transition ${
                          active ? 'border-[#2436D9] bg-[#EEF2FF] text-[#2436D9]' : 'border-[#D8E0EC] bg-white text-[#4B5A70]'
                        }`}
                      >
                        {day.label}
                      </button>
                    )
                  })}
                </div>
              </FormField>

              <WarningRow>
                Проверьте: {branches.find((branch) => branch.id === bulkForm.branchId)?.name ?? 'филиал не выбран'}, {instructors.find((instructor) => instructor.id === bulkForm.instructorId)?.name ?? 'инструктор не выбран'}, {bulkForm.dateFrom || 'дата от'} — {bulkForm.dateTo || 'дата до'}, {bulkForm.windowStart}-{bulkForm.windowEnd}. Дубли и прошлые занятия пропустим.
              </WarningRow>

              <StickyBottomAction>
                <Button size="lg" className="w-full md:w-auto" onClick={() => void handleCreateBulk()}>
                  <CalendarPlus2 size={18} />
                  Создать серию занятий
                </Button>
              </StickyBottomAction>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 xl:grid-cols-5">
              <FormField label="Филиал">
                <select value={singleForm.branchId} onChange={(event) => setSingleForm((current) => ({ ...current, branchId: event.target.value }))} className={selectClassName()}>
                  <option value="">Выберите филиал</option>
                  {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                </select>
              </FormField>
              <FormField label="Инструктор">
                <select value={singleForm.instructorId} onChange={(event) => setSingleForm((current) => ({ ...current, instructorId: event.target.value }))} className={selectClassName()}>
                  <option value="">Выберите инструктора</option>
                  {instructors.map((instructor) => <option key={instructor.id} value={instructor.id}>{instructor.name}</option>)}
                </select>
              </FormField>
              <Input label="Дата" type="date" value={singleForm.date} onChange={(event) => setSingleForm((current) => ({ ...current, date: event.target.value }))} />
              <Input label="Время" type="time" value={singleForm.startTime} onChange={(event) => setSingleForm((current) => ({ ...current, startTime: event.target.value }))} />
              <FormField label="Тип занятия">
                <select value={singleForm.lessonType} onChange={(event) => setSingleForm((current) => ({ ...current, lessonType: event.target.value as LessonType }))} className={selectClassName()}>
                  {lessonTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </FormField>
              <Input label="Длительность" type="number" step={15} helperText={formatDuration(Number(singleForm.duration || defaultDuration))} value={singleForm.duration} onChange={(event) => setSingleForm((current) => ({ ...current, duration: event.target.value }))} />
              <div className="md:col-span-2 xl:col-span-5">
                <StickyBottomAction>
                  <Button size="lg" className="w-full md:w-auto" onClick={() => void handleCreateSingle()}>
                    <CalendarPlus2 size={18} />
                    Добавить занятие
                  </Button>
                </StickyBottomAction>
              </div>
            </div>
          )}
        </Section>

        <Section title="Список занятий" description={`Найдено ${filteredSlots.length} занятий.`}>
          <FilterBar>
          <div className="relative col-span-2 md:col-span-2">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск" className={compactFieldClassName('pl-9')} />
          </div>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={compactFieldClassName('px-2 text-[13px]')} />
          <select value={status} onChange={(event) => setStatus(event.target.value as SlotStatusFilter)} className={compactFieldClassName('px-2 text-[13px]')}>
            <option value="all">Статус</option>
            <option value="available">Свободные</option>
            <option value="booked">Занятые</option>
            <option value="cancelled">Скрытые</option>
          </select>
          <div className="col-span-4 grid gap-2 border-t border-[#E5EAF1] pt-2 md:col-span-6 md:grid-cols-3 xl:grid-cols-4">
            <select value={branchId} onChange={(event) => setBranchId(event.target.value)} className={selectClassName()}>
              <option value="all">Все филиалы</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
            <select value={instructorId} onChange={(event) => setInstructorId(event.target.value)} className={selectClassName()}>
              <option value="all">Все инструкторы</option>
              {instructors.map((instructor) => <option key={instructor.id} value={instructor.id}>{instructor.name}</option>)}
            </select>
            <select value={period} onChange={(event) => setPeriod(event.target.value as PeriodFilter)} className={selectClassName()}>
              <option value="all">Все периоды</option>
              <option value="today">Сегодня</option>
              <option value="tomorrow">Завтра</option>
              <option value="week">Неделя</option>
              <option value="future">Будущие</option>
            </select>
          </div>
          </FilterBar>


          <div className="mt-3">
            {filteredSlots.length === 0 ? (
              <SmallEmptyState title="Занятия не найдены" description="Измените фильтры или создайте занятия выше." />
            ) : (
              <div className="overflow-hidden rounded-[14px] border border-[#D8E0EC]">
                {filteredSlots.map((entry) => (
                  <CompactRow key={entry.slot.id}>
                    <div className="grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-2">
                      <div>
                        <p className="text-[12px] font-black text-[#111827]">{formatTimeRange(entry.slot)}</p>
                        <p className="text-[11px] font-bold text-[#667085]">{formatHumanDate(entry.slot.date, false)}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-black text-[#111827]">{entry.instructor ? formatInstructorName(entry.instructor.name) : 'Инструктор не найден'}</p>
                        <p className="truncate text-[12px] font-semibold text-[#667085]">{entry.branch?.name ?? 'Филиал не найден'} · {entry.student?.name ?? 'Нет записи'}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <StatusBadge status={entry.slot.status} kind="slot" />
                        <button className="text-[12px] font-black text-[#2436D9]" disabled={entry.slot.status === 'booked'} onClick={() => setToggleSlotId(entry.slot.id)}>
                          {entry.slot.status === 'cancelled' ? 'Вернуть' : 'Скрыть'}
                        </button>
                      </div>
                    </div>
                  </CompactRow>
                ))}
              </div>
            )}
          </div>
        </Section>
      </div>

      <ConfirmDialog
        open={Boolean(deleteSlotId)}
        title="Удалить занятие"
        description="Удалить можно только свободное занятие. Если занятие занято учеником, сначала обработайте запись."
        confirmLabel="Удалить"
        onClose={() => setDeleteSlotId(null)}
        onConfirm={() => void handleDeleteSlot()}
        danger
      />

      <ConfirmDialog
        open={Boolean(toggleSlotId)}
        title="Изменить доступность"
        description="Свободное занятие можно скрыть из записи, а скрытое - вернуть в расписание."
        confirmLabel="Подтвердить"
        onClose={() => setToggleSlotId(null)}
        onConfirm={() => void handleToggleSlot()}
      />
    </div>
  )
}
