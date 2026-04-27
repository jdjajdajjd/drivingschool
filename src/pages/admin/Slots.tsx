import { addDays, endOfWeek, isAfter, isBefore, isSameDay, startOfDay, startOfWeek } from 'date-fns'
import { CalendarPlus2, ExternalLink, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { StatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { FormField } from '../../components/ui/FormField'
import { Input } from '../../components/ui/Input'
import { PageHeader } from '../../components/ui/PageHeader'
import { Section } from '../../components/ui/Section'
import { useToast } from '../../components/ui/Toast'
import { formatDuration } from '../../lib/utils'
import { createBulkSlots, createSlot, deleteSlot, getSlotsBySchool, updateSlotStatus } from '../../services/slotService'
import { db } from '../../services/storage'

type SlotStatusFilter = 'all' | 'available' | 'booked' | 'cancelled'
type PeriodFilter = 'all' | 'today' | 'tomorrow' | 'week' | 'future'
type CreateMode = 'single' | 'bulk'

function selectClassName() {
  return 'h-11 w-full rounded-2xl border border-stone-200 bg-white px-3.5 text-[15px] text-stone-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100'
}

export function AdminSlots() {
  const school = db.schools.bySlug('virazh')
  const { showToast } = useToast()
  const navigate = useNavigate()
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

  function handleCreateSingle(): void {
    if (!school || !validateBase(singleForm.branchId, singleForm.instructorId)) return
    const result = createSlot({
      schoolId: school.id,
      branchId: singleForm.branchId,
      instructorId: singleForm.instructorId,
      date: singleForm.date,
      startTime: singleForm.startTime,
      duration: Number(singleForm.duration),
    })

    if (!result.ok) {
      showToast(result.error ?? 'Не удалось создать занятие.', 'error')
      return
    }
    showToast('Занятие добавлено в расписание.', 'success')
  }

  function handleCreateBulk(): void {
    if (!school || !validateBase(bulkForm.branchId, bulkForm.instructorId)) return
    const result = createBulkSlots({
      schoolId: school.id,
      branchId: bulkForm.branchId,
      instructorId: bulkForm.instructorId,
      dateFrom: bulkForm.dateFrom,
      dateTo: bulkForm.dateTo,
      weekdays: bulkForm.weekdays,
      windowStart: bulkForm.windowStart,
      windowEnd: bulkForm.windowEnd,
      duration: Number(bulkForm.duration),
      breakMinutes: Number(bulkForm.breakMinutes),
    })

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

  function handleDeleteSlot(): void {
    if (!deleteSlotId) return
    const result = deleteSlot(deleteSlotId)
    setDeleteSlotId(null)
    if (!result.ok) {
      showToast(result.error ?? 'Не удалось удалить занятие.', 'error')
      return
    }
    showToast('Занятие удалено.', 'success')
  }

  function handleToggleSlot(): void {
    if (!toggleSlotId) return
    const entry = slots.find((item) => item.slot.id === toggleSlotId)
    if (!entry) return
    const nextStatus = entry.slot.status === 'cancelled' ? 'available' : 'cancelled'
    const result = updateSlotStatus(toggleSlotId, nextStatus)
    setToggleSlotId(null)
    if (!result.ok) {
      showToast(result.error ?? 'Не удалось изменить статус занятия.', 'error')
      return
    }
    showToast(nextStatus === 'cancelled' ? 'Занятие скрыто из записи.' : 'Занятие снова доступно.', 'success')
  }

  if (!school) {
    return (
      <div className="max-w-7xl p-6 md:p-8">
        <EmptyState title="Школа не найдена" description="Проверьте данные школы." />
      </div>
    )
  }

  return (
    <div className="max-w-7xl p-6 md:p-8">
      <PageHeader
        eyebrow={school.name}
        title="Расписание"
        description="Создавайте свободные занятия для учеников. Это расписание видно на странице автошколы."
      />

      <div className="mt-8 space-y-6">
        <Section title="Добавить занятия" description="Для запуска обычно удобнее создать серию занятий на неделю или две вперед.">
          <div className="mb-5 grid gap-2 sm:grid-cols-2">
            <Button variant={mode === 'bulk' ? 'primary' : 'secondary'} onClick={() => setMode('bulk')}>
              Серия занятий
            </Button>
            <Button variant={mode === 'single' ? 'primary' : 'secondary'} onClick={() => setMode('single')}>
              Одно занятие
            </Button>
          </div>

          {mode === 'bulk' ? (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
                <Input label="Длительность" type="number" step={15} helperText={formatDuration(Number(bulkForm.duration || defaultDuration))} value={bulkForm.duration} onChange={(event) => setBulkForm((current) => ({ ...current, duration: event.target.value }))} />
                <Input label="Перерыв, минут" type="number" value={bulkForm.breakMinutes} onChange={(event) => setBulkForm((current) => ({ ...current, breakMinutes: event.target.value }))} />
              </div>

              <FormField label="Дни недели" helperText="Отметьте дни, когда инструктор принимает занятия.">
                <div className="flex flex-wrap gap-2">
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
                        className={`rounded-full border px-4 py-2 text-base transition ${
                          active ? 'border-blue-700 bg-blue-50 text-blue-700' : 'border-stone-200 bg-white text-stone-600'
                        }`}
                      >
                        {day.label}
                      </button>
                    )
                  })}
                </div>
              </FormField>

              <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4 text-base text-blue-950">
                Проверка перед созданием: система пропустит дубли и занятия в прошлом. Занятые времена не будут перезаписаны.
              </div>

              <Button size="lg" className="min-h-12 text-base" onClick={handleCreateBulk}>
                <CalendarPlus2 size={18} />
                Создать серию занятий
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
              <Input label="Длительность" type="number" step={15} helperText={formatDuration(Number(singleForm.duration || defaultDuration))} value={singleForm.duration} onChange={(event) => setSingleForm((current) => ({ ...current, duration: event.target.value }))} />
              <div className="md:col-span-2 xl:col-span-5">
                <Button size="lg" className="min-h-12 text-base" onClick={handleCreateSingle}>
                  <CalendarPlus2 size={18} />
                  Добавить занятие
                </Button>
              </div>
            </div>
          )}
        </Section>

        <Section title="Список занятий" description="Фильтры помогают быстро найти время, инструктора или запись ученика.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <FormField label="Поиск">
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Инструктор, филиал, ученик"
                  className="h-11 w-full rounded-2xl border border-stone-200 bg-white pl-10 pr-3.5 text-[15px] text-stone-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                />
              </div>
            </FormField>
            <Input label="Дата" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            <FormField label="Филиал">
              <select value={branchId} onChange={(event) => setBranchId(event.target.value)} className={selectClassName()}>
                <option value="all">Все филиалы</option>
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </FormField>
            <FormField label="Инструктор">
              <select value={instructorId} onChange={(event) => setInstructorId(event.target.value)} className={selectClassName()}>
                <option value="all">Все инструкторы</option>
                {instructors.map((instructor) => <option key={instructor.id} value={instructor.id}>{instructor.name}</option>)}
              </select>
            </FormField>
            <FormField label="Статус">
              <select value={status} onChange={(event) => setStatus(event.target.value as SlotStatusFilter)} className={selectClassName()}>
                <option value="all">Все</option>
                <option value="available">Свободные</option>
                <option value="booked">Занятые</option>
                <option value="cancelled">Скрытые</option>
              </select>
            </FormField>
            <FormField label="Период">
              <select value={period} onChange={(event) => setPeriod(event.target.value as PeriodFilter)} className={selectClassName()}>
                <option value="all">Все</option>
                <option value="today">Сегодня</option>
                <option value="tomorrow">Завтра</option>
                <option value="week">Неделя</option>
                <option value="future">Будущие</option>
              </select>
            </FormField>
          </div>

          <div className="mt-5">
            {filteredSlots.length === 0 ? (
              <EmptyState title="Занятия не найдены" description="Измените фильтры или создайте занятия выше." />
            ) : (
              <div className="grid gap-4">
                {filteredSlots.map((entry) => (
                  <div key={entry.slot.id} className="rounded-2xl border border-stone-200 bg-white p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                        <div>
                          <p className="text-xs font-medium text-stone-500">Дата и время</p>
                          <p className="mt-1 text-sm font-semibold text-stone-900">{entry.slot.date}</p>
                          <p className="text-sm text-stone-500">{entry.slot.time} · {formatDuration(entry.slot.duration)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-stone-500">Филиал</p>
                          <p className="mt-1 text-sm font-semibold text-stone-900">{entry.branch?.name ?? 'Не найден'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-stone-500">Инструктор</p>
                          <p className="mt-1 text-sm font-semibold text-stone-900">{entry.instructor?.name ?? 'Не найден'}</p>
                          <p className="text-sm text-stone-500">{entry.instructor?.car ?? 'Без машины'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-stone-500">Статус</p>
                          <div className="mt-1"><StatusBadge status={entry.slot.status} kind="slot" /></div>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-stone-500">Ученик</p>
                          <p className="mt-1 text-sm font-semibold text-stone-900">{entry.student?.name ?? 'Нет записи'}</p>
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[330px]">
                        <Button variant="secondary" size="sm" disabled={!entry.booking} onClick={() => entry.booking && navigate(`/booking/${entry.booking.id}`)}>
                          <ExternalLink size={14} />
                          Открыть запись
                        </Button>
                        <Button variant="secondary" size="sm" disabled={entry.slot.status === 'booked'} onClick={() => setToggleSlotId(entry.slot.id)}>
                          {entry.slot.status === 'cancelled' ? 'Вернуть' : 'Скрыть'}
                        </Button>
                        <Button variant="danger" size="sm" disabled={entry.slot.status !== 'available'} onClick={() => setDeleteSlotId(entry.slot.id)}>
                          <Trash2 size={14} />
                          Удалить
                        </Button>
                      </div>
                    </div>
                  </div>
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
        onConfirm={handleDeleteSlot}
        danger
      />

      <ConfirmDialog
        open={Boolean(toggleSlotId)}
        title="Изменить доступность"
        description="Свободное занятие можно скрыть из записи, а скрытое - вернуть в расписание."
        confirmLabel="Подтвердить"
        onClose={() => setToggleSlotId(null)}
        onConfirm={handleToggleSlot}
      />
    </div>
  )
}
