import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Clock,
  Trash2,
  X,
  ChevronDown,
  AlertTriangle,
  Check,
  CalendarDays,
  Repeat2,
} from 'lucide-react'
import { db } from '../../services/storage'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Avatar'
import { formatDate, isoDate } from '../../utils/date'
import { generateId } from '../../lib/utils'
import { addDays, parseISO, eachDayOfInterval } from 'date-fns'
import type { Instructor, Slot } from '../../types'

// ─── Constants ────────────────────────────────────────────────────────────────

const TIME_OPTIONS: string[] = []
for (let h = 7; h <= 20; h++) {
  TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:00`)
  if (h < 20) TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:30`)
}

const DURATION_OPTIONS = [50, 60, 90, 120]
const DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
// date-fns: getDay returns 0=Sun,1=Mon...6=Sat; normalize to Mon=0...Sun=6
function dayIndex(dateStr: string): number {
  const d = parseISO(dateStr).getDay()
  return d === 0 ? 6 : d - 1
}

function todayIso(): string {
  return isoDate(new Date())
}

function getNext7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => isoDate(addDays(new Date(), i + 1)))
}

// ─── Create modal form state ──────────────────────────────────────────────────

interface CreateForm {
  mode: 'single' | 'range'
  instructorId: string
  singleDate: string
  rangeFrom: string
  rangeTo: string
  weekdays: boolean[] // [Mon,Tue,Wed,Thu,Fri,Sat,Sun]
  times: Set<string>
  customTime: string
  duration: number
}

function defaultForm(instructorId = ''): CreateForm {
  const tomorrow = isoDate(addDays(new Date(), 1))
  return {
    mode: 'single',
    instructorId,
    singleDate: tomorrow,
    rangeFrom: tomorrow,
    rangeTo: isoDate(addDays(new Date(), 7)),
    weekdays: [true, true, true, true, true, false, false],
    times: new Set<string>(),
    customTime: '',
    duration: 60,
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface SelectProps {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  className?: string
}

function Select({ value, onChange, options, placeholder, className = '' }: SelectProps) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none bg-white border border-stone-200 rounded-xl px-4 py-2.5 pr-10 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-forest-500 transition-colors"
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
      />
    </div>
  )
}

interface DeleteConfirmProps {
  slot: Slot
  onConfirm: () => void
  onCancel: () => void
}

function DeleteConfirmPopover({ slot, onConfirm, onCancel }: DeleteConfirmProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -4 }}
      transition={{ duration: 0.15 }}
      className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white rounded-xl border border-stone-200 shadow-lg p-3 w-48 text-center"
    >
      <p className="text-xs text-stone-600 mb-2.5">Удалить слот {slot.time}?</p>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 text-xs py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
        >
          Отмена
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 text-xs py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
        >
          Удалить
        </button>
      </div>
      {/* Arrow */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-white" />
      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[5px] border-4 border-transparent border-t-stone-200" />
    </motion.div>
  )
}

// ─── Create modal ─────────────────────────────────────────────────────────────

interface CreateModalProps {
  instructors: Instructor[]
  existingSlots: Slot[]
  onClose: () => void
  onCreated: (count: number) => void
}

function CreateModal({ instructors, existingSlots, onClose, onCreated }: CreateModalProps) {
  const [form, setForm] = useState<CreateForm>(() =>
    defaultForm(instructors[0]?.id ?? ''),
  )
  const [error, setError] = useState('')

  function update(patch: Partial<CreateForm>) {
    setForm((prev) => ({ ...prev, ...patch }))
    setError('')
  }

  function toggleTime(t: string) {
    const next = new Set(form.times)
    if (next.has(t)) next.delete(t)
    else next.add(t)
    update({ times: next })
  }

  function addCustomTime() {
    const t = form.customTime.trim()
    if (!/^\d{2}:\d{2}$/.test(t)) {
      setError('Введите время в формате ЧЧ:ММ')
      return
    }
    const next = new Set(form.times)
    next.add(t)
    update({ times: next, customTime: '' })
  }

  // Compute which dates will be used
  const targetDates: string[] = useMemo(() => {
    if (form.mode === 'single') {
      return form.singleDate >= todayIso() ? [form.singleDate] : []
    }
    if (!form.rangeFrom || !form.rangeTo || form.rangeFrom > form.rangeTo) return []
    try {
      const days = eachDayOfInterval({
        start: parseISO(form.rangeFrom),
        end: parseISO(form.rangeTo),
      })
      return days
        .map((d) => isoDate(d))
        .filter((d) => d >= todayIso() && form.weekdays[dayIndex(d)])
    } catch {
      return []
    }
  }, [form.mode, form.singleDate, form.rangeFrom, form.rangeTo, form.weekdays])

  // Compute slots to create (after dedup check)
  const preview = useMemo(() => {
    if (!form.instructorId || form.times.size === 0) return { total: 0, skipped: 0 }
    const existing = new Set(
      existingSlots
        .filter((s) => s.instructorId === form.instructorId)
        .map((s) => `${s.date}|${s.time}`),
    )
    let total = 0
    let skipped = 0
    for (const date of targetDates) {
      for (const time of form.times) {
        if (existing.has(`${date}|${time}`)) skipped++
        else total++
      }
    }
    return { total, skipped }
  }, [form.instructorId, form.times, targetDates, existingSlots])

  function handleSubmit() {
    if (!form.instructorId) { setError('Выберите инструктора'); return }
    if (targetDates.length === 0) { setError('Выберите дату или диапазон'); return }
    if (form.times.size === 0) { setError('Выберите хотя бы одно время'); return }
    if (preview.total === 0) { setError('Все выбранные слоты уже существуют'); return }

    const instructor = instructors.find((i) => i.id === form.instructorId)
    if (!instructor) return

    const existing = new Set(
      existingSlots
        .filter((s) => s.instructorId === form.instructorId)
        .map((s) => `${s.date}|${s.time}`),
    )

    let created = 0
    for (const date of targetDates) {
      for (const time of form.times) {
        if (existing.has(`${date}|${time}`)) continue
        const slot: Slot = {
          id: generateId('slot'),
          instructorId: form.instructorId,
          branchId: instructor.branchId,
          date,
          time,
          duration: form.duration,
          status: 'available',
        }
        db.slots.upsert(slot)
        created++
      }
    }
    onCreated(created)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100 sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-stone-900">Добавить слоты</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Instructor */}
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
              Инструктор
            </label>
            <Select
              value={form.instructorId}
              onChange={(v) => update({ instructorId: v })}
              options={instructors.map((i) => ({ value: i.id, label: i.name }))}
              placeholder="Выберите инструктора"
            />
          </div>

          {/* Mode tabs */}
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
              Дата
            </label>
            <div className="flex gap-2 mb-3">
              {(['single', 'range'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => update({ mode: m })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ${
                    form.mode === m
                      ? 'bg-forest-800 border-forest-800 text-white'
                      : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  {m === 'single' ? (
                    <><CalendarDays size={12} /> Один день</>
                  ) : (
                    <><Repeat2 size={12} /> Диапазон</>
                  )}
                </button>
              ))}
            </div>

            {form.mode === 'single' ? (
              <input
                type="date"
                min={todayIso()}
                value={form.singleDate}
                onChange={(e) => update({ singleDate: e.target.value })}
                className="w-full bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-forest-500 transition-colors"
              />
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-stone-400 mb-1.5">С</p>
                    <input
                      type="date"
                      min={todayIso()}
                      value={form.rangeFrom}
                      onChange={(e) => update({ rangeFrom: e.target.value })}
                      className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-forest-500 transition-colors"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-stone-400 mb-1.5">По</p>
                    <input
                      type="date"
                      min={form.rangeFrom || todayIso()}
                      value={form.rangeTo}
                      onChange={(e) => update({ rangeTo: e.target.value })}
                      className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-forest-500 transition-colors"
                    />
                  </div>
                </div>
                {/* Day of week filter */}
                <div>
                  <p className="text-xs text-stone-400 mb-2">Дни недели</p>
                  <div className="flex gap-1.5">
                    {DAY_LABELS.map((label, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          const next = [...form.weekdays]
                          next[idx] = !next[idx]
                          update({ weekdays: next })
                        }}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all duration-150 ${
                          form.weekdays[idx]
                            ? 'bg-forest-800 border-forest-800 text-white'
                            : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-50'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Preview dates info */}
            {targetDates.length > 0 && (
              <p className="mt-2 text-xs text-stone-400">
                {targetDates.length === 1
                  ? `${formatDate(targetDates[0])}`
                  : `${targetDates.length} ${targetDates.length >= 5 ? 'дней' : 'дня'}: ${formatDate(targetDates[0])} — ${formatDate(targetDates[targetDates.length - 1])}`}
              </p>
            )}
          </div>

          {/* Time grid */}
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
              Время <span className="normal-case font-normal text-stone-400">(выберите одно или несколько)</span>
            </label>
            <div className="grid grid-cols-6 gap-1.5">
              {TIME_OPTIONS.map((t) => {
                const selected = form.times.has(t)
                return (
                  <button
                    key={t}
                    onClick={() => toggleTime(t)}
                    className={`py-2 rounded-lg text-xs font-medium border transition-all duration-150 ${
                      selected
                        ? 'bg-forest-800 border-forest-800 text-white'
                        : 'bg-white border-stone-200 text-stone-600 hover:border-forest-300 hover:bg-forest-50'
                    }`}
                  >
                    {t}
                  </button>
                )
              })}
            </div>

            {/* Custom time */}
            <div className="flex gap-2 mt-3">
              <input
                type="text"
                placeholder="Своё время (чч:мм)"
                value={form.customTime}
                onChange={(e) => update({ customTime: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && addCustomTime()}
                className="flex-1 bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-800 placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-forest-500 transition-colors"
              />
              <Button variant="secondary" size="sm" onClick={addCustomTime}>
                <Plus size={14} />
                Добавить
              </Button>
            </div>

            {form.times.size > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[...form.times].sort().map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 bg-forest-50 border border-forest-200 text-forest-800 rounded-lg px-2 py-1 text-xs font-medium"
                  >
                    <Clock size={10} />
                    {t}
                    <button
                      onClick={() => toggleTime(t)}
                      className="text-forest-500 hover:text-forest-800 ml-0.5"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Duration */}
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
              Длительность
            </label>
            <div className="flex gap-2">
              {DURATION_OPTIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => update({ duration: d })}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all duration-150 ${
                    form.duration === d
                      ? 'bg-forest-800 border-forest-800 text-white'
                      : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  {d} мин
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-xl px-4 py-3 text-sm">
              <AlertTriangle size={14} className="shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2">
          {/* Preview summary */}
          {preview.total > 0 || preview.skipped > 0 ? (
            <div className="flex items-center gap-2 bg-stone-50 rounded-xl px-4 py-3 mb-4">
              <Check size={14} className="text-forest-600 shrink-0" />
              <p className="text-xs text-stone-600">
                Будет создано{' '}
                <span className="font-semibold text-stone-900">
                  {preview.total} {preview.total === 1 ? 'слот' : preview.total < 5 ? 'слота' : 'слотов'}
                </span>
                {preview.skipped > 0 && (
                  <span className="text-stone-400">
                    {' '}· {preview.skipped} пропущено (дубли)
                  </span>
                )}
              </p>
            </div>
          ) : (
            form.times.size > 0 && targetDates.length > 0 && (
              <div className="flex items-center gap-2 bg-amber-50 rounded-xl px-4 py-3 mb-4">
                <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                <p className="text-xs text-amber-700">Все выбранные слоты уже существуют</p>
              </div>
            )
          )}

          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              Отмена
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={preview.total === 0}
            >
              <Plus size={15} />
              Создать{preview.total > 0 ? ` (${preview.total})` : ''}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2"
    >
      <Check size={14} className="text-forest-400" />
      {message}
    </motion.div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function AdminSlots() {
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [slots, setSlots] = useState<Slot[]>([])
  const [selectedDate, setSelectedDate] = useState<string>(getNext7Days()[0])
  const [selectedInstructor, setSelectedInstructor] = useState<string>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const dates = getNext7Days()

  useEffect(() => {
    load()
  }, [])

  function load() {
    const school = db.schools.bySlug('virazh')
    if (!school) return
    setInstructors(db.instructors.bySchool(school.id))
    setSlots(db.slots.all())
  }

  function handleCreated(count: number) {
    setCreateOpen(false)
    load()
    setToast(`Создано ${count} ${count === 1 ? 'слот' : count < 5 ? 'слота' : 'слотов'}`)
  }

  function handleDelete(slotId: string) {
    db.slots.remove(slotId)
    setSlots((prev) => prev.filter((s) => s.id !== slotId))
    setDeleteTarget(null)
    setToast('Слот удалён')
  }

  const filtered = slots.filter(
    (s) =>
      s.date === selectedDate &&
      (selectedInstructor === 'all' || s.instructorId === selectedInstructor),
  )

  const grouped = filtered.reduce<Record<string, Slot[]>>((acc, slot) => {
    if (!acc[slot.instructorId]) acc[slot.instructorId] = []
    acc[slot.instructorId].push(slot)
    return acc
  }, {})

  return (
    <div className="p-8 max-w-7xl">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-start justify-between mb-8"
      >
        <div>
          <p className="text-xs text-stone-400 uppercase tracking-wide font-medium mb-1">
            Управление
          </p>
          <h1 className="font-sans text-3xl font-medium text-stone-900">Слоты</h1>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={16} />
          Добавить слоты
        </Button>
      </motion.div>

      {/* Date selector */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {dates.map((date) => {
          const freeCount = slots.filter((s) => s.date === date && s.status === 'available').length
          const isSelected = selectedDate === date
          return (
            <button
              key={date}
              onClick={() => setSelectedDate(date)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl border text-sm font-medium transition-all duration-150 ${
                isSelected
                  ? 'bg-forest-800 border-forest-800 text-white'
                  : 'bg-white border-stone-200 text-stone-700 hover:border-forest-300 hover:bg-forest-50'
              }`}
            >
              <span className="capitalize">{formatDate(date)}</span>
              <span className={`ml-2 text-xs ${isSelected ? 'text-forest-300' : 'text-stone-400'}`}>
                {freeCount} св.
              </span>
            </button>
          )
        })}
      </div>

      {/* Instructor filter */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedInstructor('all')}
          className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ${
            selectedInstructor === 'all'
              ? 'bg-stone-900 border-stone-900 text-white'
              : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
          }`}
        >
          Все инструкторы
        </button>
        {instructors.map((i) => (
          <button
            key={i.id}
            onClick={() => setSelectedInstructor(i.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ${
              selectedInstructor === i.id
                ? 'bg-stone-900 border-stone-900 text-white'
                : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            {i.name.split(' ').slice(0, 2).join(' ')}
          </button>
        ))}
      </div>

      {/* Slots grid by instructor */}
      <div className="space-y-4">
        {Object.entries(grouped).map(([instructorId, instrSlots]) => {
          const instructor = instructors.find((i) => i.id === instructorId)
          if (!instructor) return null
          const sorted = [...instrSlots].sort((a, b) => a.time.localeCompare(b.time))
          return (
            <motion.div
              key={instructorId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-stone-100 shadow-card p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <Avatar
                  initials={instructor.avatarInitials}
                  color={instructor.avatarColor}
                  size="sm"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-stone-900">{instructor.name}</p>
                  <p className="text-xs text-stone-400">
                    {sorted.filter((s) => s.status === 'available').length} свободных ·{' '}
                    {sorted.filter((s) => s.status === 'booked').length} занятых
                  </p>
                </div>
                <p className="text-xs text-stone-400">
                  Нажмите <Trash2 size={10} className="inline" /> чтобы удалить свободный слот
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {sorted.map((slot) => (
                  <div key={slot.id} className="relative group">
                    <div
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                        slot.status === 'booked'
                          ? 'bg-stone-50 border-stone-200 text-stone-400'
                          : 'bg-forest-50 border-forest-200 text-forest-800'
                      }`}
                    >
                      <Clock
                        size={12}
                        className={slot.status === 'booked' ? 'text-stone-300' : 'text-forest-500'}
                      />
                      {slot.time}
                      {slot.status === 'booked' ? (
                        <Badge variant="warning" size="sm">
                          занят
                        </Badge>
                      ) : (
                        <button
                          onClick={() =>
                            setDeleteTarget(deleteTarget === slot.id ? null : slot.id)
                          }
                          className="ml-0.5 opacity-0 group-hover:opacity-100 text-stone-300 hover:text-red-500 transition-all duration-150"
                          title="Удалить слот"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>

                    {/* Delete confirm popover */}
                    <AnimatePresence>
                      {deleteTarget === slot.id && (
                        <DeleteConfirmPopover
                          slot={slot}
                          onConfirm={() => handleDelete(slot.id)}
                          onCancel={() => setDeleteTarget(null)}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </motion.div>
          )
        })}

        {Object.keys(grouped).length === 0 && (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-card py-16 text-center">
            <Clock size={32} className="text-stone-200 mx-auto mb-3" />
            <p className="text-stone-400 text-sm mb-4">Слоты не найдены</p>
            <Button variant="secondary" size="sm" onClick={() => setCreateOpen(true)}>
              <Plus size={14} />
              Добавить слоты на этот день
            </Button>
          </div>
        )}
      </div>

      {/* Create modal */}
      <AnimatePresence>
        {createOpen && (
          <CreateModal
            instructors={instructors}
            existingSlots={slots}
            onClose={() => setCreateOpen(false)}
            onCreated={handleCreated}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  )
}
