import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format, eachDayOfInterval, startOfWeek, addDays } from 'date-fns'
import { ru } from 'date-fns/locale'
import { db } from '../../services/storage'
import { adminCars, createCurrentStaffAuditEntry } from '../../services/adminStorage'
import { getAdminBasePathForLocation } from '../../services/accessControl'
import { Modal } from '../../components/ui/Modal'
import type { Instructor, Transmission } from '../../types'
import { assertAdminPermission, canUseAdminPermission } from '../../services/adminAccess'
import { filterBookings, filterBranches, filterInstructors, filterSlots } from '../../services/staffScope'
import { normalizePersonName } from '../../lib/nameFormat'
import { formatRussianPhoneInput } from '../../lib/phoneFormat'
import { updateInstructorConfirmed } from '../../services/instructorService'

export function AdminInstructorDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const school = db.schools.currentAdmin()
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [showEdit, setShowEdit] = useState(false)

  const data = useMemo(() => {
    if (!school || !id) return null
    const instructor = db.instructors.byId(id)
    if (!instructor) return null
    if (instructor.schoolId !== school.id) return null
    if (filterInstructors([instructor]).length === 0) return null
    const car = instructor.car ? adminCars.all(school.id).find((c) => c.id === instructor.car) : null
    const branch = db.branches.byId(instructor.branchId)
    const slots = filterSlots(db.slots.byInstructor(instructor.id))
    const bookings = filterBookings(db.bookings.byInstructor(instructor.id))
    const students = [...new Set(bookings.map((b) => b.studentId))]
    const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) })
    const weekSlots = weekDays.map((day) => {
      const dayStr = format(day, 'yyyy-MM-dd')
      return slots.filter((s) => s.date === dayStr)
    })

    const weekBooked = weekSlots.reduce((sum, day) => sum + day.filter((s) => s.status === 'booked').length, 0)
    const weekAvailable = weekSlots.reduce((sum, day) => sum + day.filter((s) => s.status === 'available').length, 0)
    const totalCompleted = bookings.filter((b) => b.status === 'completed').length
    const totalNoShow = bookings.filter((b) => b.status === 'no_show').length

    return { instructor, car, branch, slots, bookings, students, weekSlots, weekDays, weekBooked, weekAvailable, totalCompleted, totalNoShow }
  }, [school?.id, id, weekStart])

  if (!data) {
    return <div className="flex h-full items-center justify-center"><p className="text-gray-400">Инструктор не найден</p></div>
  }

  const { instructor, car, branch, students, weekSlots, weekDays, weekBooked, weekAvailable, totalCompleted, totalNoShow } = data
  const canManageInstructors = canUseAdminPermission('branches.manage')
  const copyPhone = () => {
    void navigator.clipboard?.writeText(instructor.phone)
  }

  return (
    <div className="overflow-y-auto">
      {/* Header */}
      <div className="border-b border-gray-100 bg-white px-4 py-4 md:px-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`${getAdminBasePathForLocation()}/instructors`)} className="rounded-lg p-2 hover:bg-gray-100">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="#6F747A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-[18px] font-black text-white" style={{ background: instructor.avatarColor }}>
            {instructor.avatarInitials}
          </div>
          <div className="flex-1">
            <h1 className="text-[22px] font-black text-gray-900">{instructor.name}</h1>
            <p className="text-[13px] font-semibold text-gray-400">{instructor.phone}</p>
          </div>
          <button onClick={copyPhone} className="rounded-xl border border-gray-200 px-4 py-2 text-[13px] font-bold text-gray-600 transition hover:bg-gray-50">
            Копировать телефон
          </button>
          <a href={`tel:${instructor.phone}`} className="rounded-xl border border-gray-200 px-4 py-2 text-[13px] font-bold text-gray-600 transition hover:bg-gray-50">
            Звонок
          </a>
          {canManageInstructors ? (
            <button onClick={() => setShowEdit(true)} className="rounded-xl border border-gray-200 px-4 py-2 text-[13px] font-bold text-gray-600 transition hover:bg-gray-50">
              Редактировать
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 p-4 md:grid-cols-[1fr_340px] md:p-6 lg:p-8">
        {/* Schedule */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-bold text-gray-900">Расписание на неделю</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setWeekStart((d) => addDays(d, -7))} className="rounded-lg p-2 hover:bg-gray-100">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#6F747A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <span className="text-[13px] font-semibold text-gray-500">
                {format(weekDays[0], 'd MMM', { locale: ru })} — {format(weekDays[6], 'd MMM yyyy', { locale: ru })}
              </span>
              <button onClick={() => setWeekStart((d) => addDays(d, 7))} className="rounded-lg p-2 hover:bg-gray-100">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="#6F747A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto pb-1">
          <div className="grid min-w-[720px] grid-cols-7 gap-2">
            {weekDays.map((day, idx) => {
              const daySlots = weekSlots[idx]
              const booked = daySlots.filter((s) => s.status === 'booked').length
              const available = daySlots.filter((s) => s.status === 'available').length
              const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
              return (
                <div key={idx} className={`rounded-xl border p-3 ${isToday ? 'border-blue-200 bg-blue-50/30' : 'border-gray-100 bg-white'}`}>
                  <p className={`mb-2 text-center text-[12px] font-bold ${isToday ? 'text-blue-600' : 'text-gray-400'}`}>
                    {format(day, 'EEE', { locale: ru })} {format(day, 'd')}
                  </p>
                  <div className="space-y-1">
                    <div className="text-center">
                      <p className="text-[18px] font-black text-blue-600">{booked}</p>
                      <p className="text-[10px] font-semibold text-blue-400">занято</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[18px] font-black text-green-600">{available}</p>
                      <p className="text-[10px] font-semibold text-green-400">свободно</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          </div>

          {/* Weekly summary */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Занято на неделе', value: weekBooked, color: 'text-blue-600' },
              { label: 'Свободно на неделе', value: weekAvailable, color: 'text-green-600' },
              { label: 'Проведено', value: totalCompleted, color: 'text-gray-600' },
              { label: 'Неявок', value: totalNoShow, color: 'text-red-500' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-gray-100 bg-white p-3 text-center">
                <p className={`text-[22px] font-black ${item.color}`}>{item.value}</p>
                <p className="text-[11px] font-semibold text-gray-400">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <h3 className="mb-4 text-[16px] font-bold text-gray-900">Информация</h3>
            <div className="space-y-3">
              {[
                { label: 'Телефон', value: instructor.phone },
                { label: 'Email', value: instructor.email || '—' },
                { label: 'Статус', value: instructor.isActive ? 'Активен' : 'Неактивен' },
                { label: 'Стаж', value: `${instructor.experience} лет` },
                { label: 'Филиал', value: branch?.name ?? '—' },
                { label: 'Машина', value: car ? `${car.brand} ${car.model} ${car.licensePlate}` : 'Не назначена' },
                { label: 'Учеников', value: students.length.toString() },
                { label: 'Коробка', value: instructor.transmission === 'auto' ? 'АКПП' : 'МКПП' },
              ].map((row) => (
                <div key={row.label} className="flex items-start justify-between gap-2">
                  <span className="text-[13px] font-semibold text-gray-400">{row.label}</span>
                  <span className="text-right text-[13px] font-semibold text-gray-900">{row.value}</span>
                </div>
              ))}
            </div>
            {instructor.categories.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {instructor.categories.map((cat) => (
                  <span key={cat} className="rounded-lg bg-blue-50 px-2.5 py-1 text-[12px] font-bold text-blue-600">
                    Категория {cat}
                  </span>
                ))}
              </div>
            )}
          </div>

          {instructor.bio && (
            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <h3 className="mb-2 text-[14px] font-bold text-gray-900">О себе</h3>
              <p className="text-[13px] font-semibold leading-relaxed text-gray-600">{instructor.bio}</p>
            </div>
          )}
        </div>
      </div>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Редактировать инструктора" size="md">
        <InstructorEditForm schoolId={school.id} instructor={instructor} onClose={() => setShowEdit(false)} />
      </Modal>
    </div>
  )
}

function InstructorEditForm({ schoolId, instructor, onClose }: { schoolId: string; instructor: Instructor; onClose: () => void }) {
  const branches = filterBranches(db.branches.bySchool(schoolId))
  const [name, setName] = useState(instructor.name)
  const [phone, setPhone] = useState(instructor.phone)
  const [email, setEmail] = useState(instructor.email)
  const [branchId, setBranchId] = useState(instructor.branchId)
  const [category, setCategory] = useState(instructor.categories[0] ?? 'B')
  const [transmission, setTransmission] = useState<Transmission>(instructor.transmission ?? 'auto')
  const [experience, setExperience] = useState(String(instructor.experience))
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const handleSubmit = async () => {
    const access = assertAdminPermission('branches.manage')
    if (!access.ok) return
    if (pending) return

    const normalizedName = normalizePersonName(name)
    if (!normalizedName) { setError('Укажите ФИО инструктора.'); return }
    if (!phone.trim()) { setError('Укажите телефон инструктора.'); return }
    if (!branchId) { setError('Выберите филиал.'); return }
    const initials = normalizedName
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || instructor.avatarInitials
    setPending(true)
    setError('')
    const result = await updateInstructorConfirmed(instructor.id, {
      branchId,
      name: normalizedName,
      phone,
      email,
      categories: [category.trim() || 'B'],
      transmission,
      isActive: instructor.isActive,
      bio: instructor.bio,
      car: instructor.car,
    })
    setPending(false)
    if (!result.ok || !result.instructor) {
      setError(result.error ?? 'Не удалось сохранить инструктора.')
      return
    }

    const nextInstructor = {
      ...result.instructor,
      name: normalizedName,
      phone: result.instructor.phone,
      email: email.trim(),
      branchId,
      categories: [category.trim() || 'B'],
      transmission,
      experience: Number(experience) || 0,
      avatarInitials: initials,
    }
    db.instructors.upsert(nextInstructor)
    createCurrentStaffAuditEntry(schoolId, 'instructor_updated', 'instructor', instructor.id, `Обновлен инструктор ${nextInstructor.name}`)
    onClose()
  }

  return (
    <div className="space-y-4 p-5">
      <input value={name} onChange={(event) => setName(event.target.value)} className="v-admin-input w-full" placeholder="ФИО" />
      <div className="grid gap-3 sm:grid-cols-2">
        <input value={phone} onChange={(event) => setPhone(event.target.value)} onBlur={() => setPhone((value) => formatRussianPhoneInput(value))} className="v-admin-input w-full" placeholder="Телефон" />
        <input value={email} onChange={(event) => setEmail(event.target.value)} className="v-admin-input w-full" placeholder="Email" />
      </div>
      <select value={branchId} onChange={(event) => setBranchId(event.target.value)} className="v-admin-input w-full">
        {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
      </select>
      <div className="grid gap-3 sm:grid-cols-3">
        <input value={category} onChange={(event) => setCategory(event.target.value)} className="v-admin-input w-full" placeholder="Категория" />
        <select value={transmission} onChange={(event) => setTransmission(event.target.value as Transmission)} className="v-admin-input w-full">
          <option value="auto">Автомат</option>
          <option value="manual">Механика</option>
        </select>
        <input type="number" min="0" value={experience} onChange={(event) => setExperience(event.target.value)} className="v-admin-input w-full" placeholder="Стаж" />
      </div>
      {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-[13px] font-bold text-red-600">{error}</p> : null}
      <div className="v-modal-actions">
        <button onClick={onClose} disabled={pending} className="v-admin-button-secondary flex-1 disabled:opacity-50">Отмена</button>
        <button onClick={() => void handleSubmit()} disabled={pending} className="v-admin-button flex-1 disabled:opacity-50">{pending ? 'Сохраняем...' : 'Сохранить'}</button>
      </div>
    </div>
  )
}
