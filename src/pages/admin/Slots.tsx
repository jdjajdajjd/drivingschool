import { addDays, endOfWeek, isAfter, isBefore, isSameDay, startOfDay, startOfWeek } from 'date-fns'
import { CalendarPlus2, ExternalLink, RotateCcw, Search, Trash2 } from 'lucide-react'
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
import { createBulkSlots, createSlot, deleteSlot, getSlotsBySchool, updateSlotStatus } from '../../services/slotService'
import { db } from '../../services/storage'

type SlotStatusFilter = 'all' | 'available' | 'booked' | 'cancelled'
type PeriodFilter = 'all' | 'today' | 'tomorrow' | 'week' | 'future'
type CreateMode = 'single' | 'bulk'

function selectClassName() {
  return 'h-11 w-full rounded-2xl border border-stone-200 bg-white px-3.5 text-[15px] text-stone-900 outline-none transition focus:border-forest-300 focus:ring-4 focus:ring-forest-100'
}

export function AdminSlots() {
  const school = db.schools.bySlug('virazh')
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [mode, setMode] = useState<CreateMode>('single')
  const [search, setSearch] = useState('')
  const [date, setDate] = useState('')
  const [branchId, setBranchId] = useState('all')
  const [instructorId, setInstructorId] = useState('all')
  const [status, setStatus] = useState<SlotStatusFilter>('all')
  const [period, setPeriod] = useState<PeriodFilter>('all')
  const [deleteSlotId, setDeleteSlotId] = useState<string | null>(null)
  const [toggleSlotId, setToggleSlotId] = useState<string | null>(null)

  const branches = school ? db.branches.bySchool(school.id) : []
  const instructors = school ? db.instructors.bySchool(school.id) : []

  const [singleForm, setSingleForm] = useState({
    branchId: branches[0]?.id ?? '',
    instructorId: instructors[0]?.id ?? '',
    date: '',
    startTime: '10:00',
    duration: '90',
  })

  const [bulkForm, setBulkForm] = useState({
    branchId: branches[0]?.id ?? '',
    instructorId: instructors[0]?.id ?? '',
    dateFrom: '',
    dateTo: '',
    weekdays: [1, 2, 3, 4, 5],
    windowStart: '09:00',
    windowEnd: '18:00',
    duration: '90',
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
        if (period === 'future') return !isBefore(startsAt, startOfDay(now))
        return true
      })()

      return matchesSearch && matchesDate && matchesBranch && matchesInstructor && matchesStatus && matchesPeriod
    })
  }, [slots, search, date, branchId, instructorId, status, period])

  function handleCreateSingle(): void {
    if (!school) return
    const result = createSlot({
      schoolId: school.id,
      branchId: singleForm.branchId,
      instructorId: singleForm.instructorId,
      date: singleForm.date,
      startTime: singleForm.startTime,
      duration: Number(singleForm.duration),
    })

    if (!result.ok) {
      showToast(result.error ?? 'Не удалось создать слот.', 'error')
      return
    }

    showToast('Слот создан.', 'success')
  }

  function handleCreateBulk(): void {
    if (!school) return
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
      showToast(result.error ?? 'Не удалось создать серию слотов.', 'error')
      return
    }

    const { createdCount, skippedDuplicates, skippedPast } = result.result
    if (createdCount === 0) {
      showToast('Ничего не создано: все слоты были дубликатами или в прошлом.', 'error')
      return
    }

    showToast(
      `Создано ${createdCount}. Дубликатов пропущено: ${skippedDuplicates}. В прошлом пропущено: ${skippedPast}.`,
      'success',
    )
  }

  function handleDeleteSlot(): void {
    if (!deleteSlotId) return
    const result = deleteSlot(deleteSlotId)
    setDeleteSlotId(null)
    if (!result.ok) {
      showToast(result.error ?? 'Не удалось удалить слот.', 'error')
      return
    }
    showToast('Слот удалён.', 'success')
  }

  function handleToggleSlot(): void {
    if (!toggleSlotId) return
    const entry = slots.find((item) => item.slot.id === toggleSlotId)
    if (!entry) return

    const nextStatus = entry.slot.status === 'cancelled' ? 'available' : 'cancelled'
    const result = updateSlotStatus(toggleSlotId, nextStatus)
    setToggleSlotId(null)
    if (!result.ok) {
      showToast(result.error ?? 'Не удалось изменить статус слота.', 'error')
      return
    }
    showToast(nextStatus === 'cancelled' ? 'Слот отменён.' : 'Слот восстановлен.', 'success')
  }

  if (!school) {
    return (
      <div className="max-w-7xl p-6 md:p-8">
        <EmptyState title="Школа не найдена" description="Демо-данные не загружены." />
      </div>
    )
  }

  return (
    <div className="max-w-7xl p-6 md:p-8">
      <PageHeader
        eyebrow={school.name}
        title="Слоты"
        description="Создание одиночных и массовых слотов, контроль статусов и быстрый переход к связанным записям."
      />

      <div className="mt-8 space-y-6">
        <Section title="Создание слотов" description="Можно создать один слот или сразу серию слотов по расписанию.">
          <div className="mb-5 flex gap-2">
            <Button variant={mode === 'single' ? 'primary' : 'secondary'} onClick={() => setMode('single')}>
              Одиночный слот
            </Button>
            <Button variant={mode === 'bulk' ? 'primary' : 'secondary'} onClick={() => setMode('bulk')}>
              Массовое создание
            </Button>
          </div>

          {mode === 'single' ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <FormField label="Филиал">
                <select
                  value={singleForm.branchId}
                  onChange={(event) => setSingleForm((current) => ({ ...current, branchId: event.target.value }))}
                  className={selectClassName()}
                >
                  <option value="">Выберите филиал</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Инструктор">
                <select
                  value={singleForm.instructorId}
                  onChange={(event) => setSingleForm((current) => ({ ...current, instructorId: event.target.value }))}
                  className={selectClassName()}
                >
                  <option value="">Выберите инструктора</option>
                  {instructors.map((instructor) => (
                    <option key={instructor.id} value={instructor.id}>
                      {instructor.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <Input label="Дата" type="date" value={singleForm.date} onChange={(event) => setSingleForm((current) => ({ ...current, date: event.target.value }))} />
              <Input label="Время начала" type="time" value={singleForm.startTime} onChange={(event) => setSingleForm((current) => ({ ...current, startTime: event.target.value }))} />
              <Input label="Длительность, мин" type="number" helperText="Проверяем дубликаты по instructor + startsAt" value={singleForm.duration} onChange={(event) => setSingleForm((current) => ({ ...current, duration: event.target.value }))} />
              <div className="md:col-span-2 xl:col-span-5">
                <Button onClick={handleCreateSingle}>
                  <CalendarPlus2 size={16} />
                  Создать слот
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <FormField label="Филиал">
                  <select
                    value={bulkForm.branchId}
                    onChange={(event) => setBulkForm((current) => ({ ...current, branchId: event.target.value }))}
                    className={selectClassName()}
                  >
                    <option value="">Выберите филиал</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Инструктор">
                  <select
                    value={bulkForm.instructorId}
                    onChange={(event) => setBulkForm((current) => ({ ...current, instructorId: event.target.value }))}
                    className={selectClassName()}
                  >
                    <option value="">Выберите инструктора</option>
                    {instructors.map((instructor) => (
                      <option key={instructor.id} value={instructor.id}>
                        {instructor.name}
                      </option>
                    ))}
                  </select>
                </FormField>
                <Input label="Дата от" type="date" value={bulkForm.dateFrom} onChange={(event) => setBulkForm((current) => ({ ...current, dateFrom: event.target.value }))} />
                <Input label="Дата до" type="date" value={bulkForm.dateTo} onChange={(event) => setBulkForm((current) => ({ ...current, dateTo: event.target.value }))} />
                <Input label="Окно с" type="time" value={bulkForm.windowStart} onChange={(event) => setBulkForm((current) => ({ ...current, windowStart: event.target.value }))} />
                <Input label="Окно до" type="time" value={bulkForm.windowEnd} onChange={(event) => setBulkForm((current) => ({ ...current, windowEnd: event.target.value }))} />
                <Input label="Длительность, мин" type="number" value={bulkForm.duration} onChange={(event) => setBulkForm((current) => ({ ...current, duration: event.target.value }))} />
                <Input label="Перерыв, мин" type="number" helperText="Дубликаты будут пропущены автоматически" value={bulkForm.breakMinutes} onChange={(event) => setBulkForm((current) => ({ ...current, breakMinutes: event.target.value }))} />
              </div>

              <FormField label="Дни недели" helperText="Выберите, в какие дни создавать серию слотов.">
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
                            weekdays: active
                              ? current.weekdays.filter((value) => value !== day.value)
                              : [...current.weekdays, day.value],
                          }))
                        }
                        className={`rounded-full border px-3 py-2 text-sm transition ${
                          active
                            ? 'border-forest-700 bg-forest-50 text-forest-700'
                            : 'border-stone-200 bg-white text-stone-600'
                        }`}
                      >
                        {day.label}
                      </button>
                    )
                  })}
                </div>
              </FormField>

              <div className="rounded-2xl bg-stone-50 px-4 py-4 text-sm text-stone-600">
                Создадим серию слотов в выбранном окне, а дубликаты и время в прошлом пропустим автоматически.
              </div>

              <Button onClick={handleCreateBulk}>
                <CalendarPlus2 size={16} />
                Создать серию слотов
              </Button>
            </div>
          )}
        </Section>

        <Section title="Список слотов" description="Фильтруйте по дате, филиалу, инструктору и статусу.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <FormField label="Поиск">
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Инструктор, филиал, ученик"
                  className="h-11 w-full rounded-2xl border border-stone-200 bg-white pl-10 pr-3.5 text-[15px] text-stone-900 outline-none transition focus:border-forest-300 focus:ring-4 focus:ring-forest-100"
                />
              </div>
            </FormField>
            <Input label="Дата" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            <FormField label="Филиал">
              <select value={branchId} onChange={(event) => setBranchId(event.target.value)} className={selectClassName()}>
                <option value="all">Все филиалы</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Инструктор">
              <select value={instructorId} onChange={(event) => setInstructorId(event.target.value)} className={selectClassName()}>
                <option value="all">Все инструкторы</option>
                {instructors.map((instructor) => (
                  <option key={instructor.id} value={instructor.id}>
                    {instructor.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Статус">
              <select value={status} onChange={(event) => setStatus(event.target.value as SlotStatusFilter)} className={selectClassName()}>
                <option value="all">Все</option>
                <option value="available">Свободные</option>
                <option value="booked">Занятые</option>
                <option value="cancelled">Отменённые</option>
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
              <EmptyState title="Слоты не найдены" description="Измените фильтры или создайте новые слоты выше." />
            ) : (
              <div className="grid gap-4">
                {filteredSlots.map((entry) => {
                  const slotInPast = isBefore(new Date(`${entry.slot.date}T${entry.slot.time}:00`), new Date())
                  return (
                    <div key={entry.slot.id} className="rounded-2xl border border-stone-200 bg-white p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                          <div>
                            <p className="text-xs font-medium text-stone-500">Дата</p>
                            <p className="mt-1 text-sm font-semibold text-stone-900">{entry.slot.date}</p>
                            <p className="text-sm text-stone-500">
                              {entry.slot.time} → {new Date(`2000-01-01T${entry.slot.time}:00`).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-stone-500">Филиал</p>
                            <p className="mt-1 text-sm font-semibold text-stone-900">{entry.branch?.name ?? 'Не найдено'}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-stone-500">Инструктор</p>
                            <p className="mt-1 text-sm font-semibold text-stone-900">{entry.instructor?.name ?? 'Не найдено'}</p>
                            <p className="text-sm text-stone-500">{entry.instructor?.car ?? 'Без машины'}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-stone-500">Статус</p>
                            <div className="mt-1">
                              <StatusBadge status={entry.slot.status} kind="slot" />
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-stone-500">Связь с записью</p>
                            <p className="mt-1 text-sm font-semibold text-stone-900">
                              {entry.student?.name ?? 'Нет активной связи'}
                            </p>
                          </div>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[360px]">
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={!entry.booking}
                            onClick={() => entry.booking && navigate(`/booking/${entry.booking.id}`)}
                          >
                            <ExternalLink size={14} />
                            Открыть запись
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={entry.slot.status !== 'cancelled' || slotInPast}
                            onClick={() => setToggleSlotId(entry.slot.id)}
                          >
                            <RotateCcw size={14} />
                            Восстановить
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={entry.slot.status !== 'available'}
                            onClick={() => setToggleSlotId(entry.slot.id)}
                          >
                            Отменить слот
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            disabled={entry.slot.status !== 'available'}
                            onClick={() => setDeleteSlotId(entry.slot.id)}
                          >
                            <Trash2 size={14} />
                            Удалить
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </Section>
      </div>

      <ConfirmDialog
        open={Boolean(deleteSlotId)}
        title="Удалить слот"
        description="Удалить можно только свободный слот. Если слот связан с записью, сначала обработайте запись."
        confirmLabel="Удалить слот"
        onClose={() => setDeleteSlotId(null)}
        onConfirm={handleDeleteSlot}
        danger
      />

      <ConfirmDialog
        open={Boolean(toggleSlotId)}
        title="Изменить статус слота"
        description="Свободный слот можно отменить, а отменённый — восстановить, если он не в прошлом."
        confirmLabel="Подтвердить"
        onClose={() => setToggleSlotId(null)}
        onConfirm={handleToggleSlot}
      />
    </div>
  )
}
