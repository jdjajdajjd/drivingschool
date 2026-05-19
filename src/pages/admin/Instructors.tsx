import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../../services/storage'
import { adminCars } from '../../services/adminStorage'
import { getAdminBasePathForLocation } from '../../services/accessControl'
import { Modal } from '../../components/ui/Modal'
import type { Transmission } from '../../types'
import { createInstructorConfirmed } from '../../services/instructorService'
import { filterBranches, filterInstructors } from '../../services/staffScope'
import { formatRussianPhoneInput } from '../../lib/phoneFormat'

export function AdminInstructors() {
  const school = db.schools.currentAdmin()
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const navigate = useNavigate()

  const data = useMemo(() => {
    if (!school) return []
    return filterInstructors(db.instructors.bySchool(school.id)).map((instructor) => {
      const slots = db.slots.byInstructor(instructor.id)
      const bookings = db.bookings.byInstructor(instructor.id)
      const todaySlots = slots.filter((s) => s.date === new Date().toISOString().split('T')[0])
      const todayBooked = todaySlots.filter((s) => s.status === 'booked').length
      const totalBookings = bookings.filter((b) => b.status === 'active').length
      const students = new Set(bookings.map((b) => b.studentId)).size
      const car = instructor.car ? adminCars.all(school.id).find((c) => c.id === instructor.car) : null
      return { instructor, todayBooked, totalBookings, students, car, slots, bookings }
    })
  }, [school?.id])

  const filtered = data.filter(({ instructor }) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return instructor.name.toLowerCase().includes(q) || instructor.phone.includes(q)
  })

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex flex-shrink-0 flex-wrap items-center gap-3 border-b border-gray-100 bg-white px-4 py-4 md:px-6">
        <h1 className="text-[24px] font-black text-gray-900">Инструкторы</h1>
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[12px] font-bold text-gray-500">
          {filtered.filter((d) => d.instructor.isActive).length} активных
        </span>
        <div className="ml-auto flex items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск..."
            className="h-10 w-[200px] rounded-xl border border-gray-200 bg-gray-50 px-4 text-[14px] font-semibold text-gray-900 placeholder-gray-300 transition focus:border-gray-900 focus:bg-white focus:outline-none"
          />
          <button type="button" onClick={() => setShowAdd(true)} className="v-admin-button">
            + Добавить
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        {filtered.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-gray-400">Инструкторы не найдены</p>
          </div>
        ) : (
          <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map(({ instructor, todayBooked, totalBookings, students, car }) => (
              <motion.div
                key={instructor.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`min-w-0 cursor-pointer overflow-hidden rounded-2xl border p-5 transition hover:border-gray-200 hover:shadow-sm ${
                  instructor.isActive ? 'bg-white' : 'bg-gray-50 opacity-60'
                }`}
                onClick={() => navigate(`${getAdminBasePathForLocation()}/instructors/${instructor.id}`)}
              >
                <div className="mb-4 flex min-w-0 items-center gap-3">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl text-[16px] font-black text-white"
                    style={{ background: instructor.avatarColor }}
                  >
                    {instructor.avatarInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-gray-900">{instructor.name}</p>
                    <p className="text-[12px] font-semibold text-gray-400">{instructor.phone}</p>
                  </div>
                  <span className={`shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold ${
                    instructor.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {instructor.isActive ? 'Активен' : 'Неактивен'}
                  </span>
                </div>

                <div className="mb-4 grid grid-cols-3 gap-2">
                  {[
                    { label: 'Сегодня', value: todayBooked },
                    { label: 'Учеников', value: students },
                    { label: 'Записей', value: totalBookings },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-xl bg-gray-50 p-2 text-center">
                      <p className="text-[18px] font-black text-gray-900">{stat.value}</p>
                      <p className="text-[11px] font-semibold text-gray-400">{stat.label}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  {instructor.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {instructor.categories.map((cat) => (
                        <span key={cat} className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-600">
                          Кат. {cat}
                        </span>
                      ))}
                    </div>
                  )}
                  {car && (
                    <p className="text-[12px] font-semibold text-gray-400">
                      {car.brand} {car.licensePlate}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Добавить инструктора" size="md">
        <InstructorForm
          schoolId={school?.id ?? ''}
          onClose={() => setShowAdd(false)}
          onCreated={(instructorId) => {
            setShowAdd(false)
            navigate(`${getAdminBasePathForLocation()}/instructors/${instructorId}`)
          }}
        />
      </Modal>
    </div>
  )
}

import { motion } from 'framer-motion'

function InstructorForm({
  schoolId,
  onClose,
  onCreated,
}: {
  schoolId: string
  onClose: () => void
  onCreated: (instructorId: string) => void
}) {
  const branches = schoolId ? filterBranches(db.branches.bySchool(schoolId)) : []
  const defaultBranchId = branches[0]?.id ?? ''
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [branchId, setBranchId] = useState(defaultBranchId)
  const [category, setCategory] = useState('B')
  const [transmission, setTransmission] = useState<Transmission>('auto')
  const [car, setCar] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const handleSubmit = async () => {
    if (pending) return
    setError('')
    if (!schoolId) { setError('Школа не найдена.'); return }
    if (!branchId) { setError('Сначала добавьте филиал.'); return }
    if (!name.trim()) { setError('Укажите имя инструктора.'); return }
    if (!phone.trim()) { setError('Укажите телефон инструктора.'); return }
    setPending(true)
    const result = await createInstructorConfirmed({
      schoolId,
      branchId,
      name,
      phone,
      email,
      isActive: true,
      categories: [category.trim() || 'B'],
      car,
      transmission,
    })
    setPending(false)
    if (result.ok && result.instructor) { onCreated(result.instructor.id); return }
    setError(result.error ?? 'Не удалось сохранить инструктора.')
  }

  return (
    <div className="space-y-4 p-5">
      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-gray-600">Имя</label>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Иванов Иван" className="v-admin-input w-full" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-gray-600">Телефон</label>
          <input value={phone} onChange={(event) => setPhone(event.target.value)} onBlur={() => setPhone((value) => formatRussianPhoneInput(value))} placeholder="+7 999 123-45-67" className="v-admin-input w-full" />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-gray-600">Email</label>
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="instructor@school.ru" className="v-admin-input w-full" />
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-gray-600">Филиал</label>
        <select value={branchId} onChange={(event) => setBranchId(event.target.value)} className="v-admin-input w-full">
          {branches.length === 0 ? <option value="">Сначала добавьте филиал</option> : null}
          {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
        </select>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-gray-600">Категория</label>
          <input value={category} onChange={(event) => setCategory(event.target.value)} className="v-admin-input w-full" />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-gray-600">КПП</label>
          <select value={transmission} onChange={(event) => setTransmission(event.target.value as Transmission)} className="v-admin-input w-full">
            <option value="auto">Автомат</option>
            <option value="manual">Механика</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-gray-600">Машина</label>
          <input value={car} onChange={(event) => setCar(event.target.value)} placeholder="Solaris" className="v-admin-input w-full" />
        </div>
      </div>
      {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-[13px] font-bold text-red-600">{error}</p> : null}
      <div className="v-modal-actions">
        <button onClick={onClose} disabled={pending} className="v-admin-button-secondary flex-1 disabled:opacity-50">Отмена</button>
        <button onClick={handleSubmit} disabled={pending} className="v-admin-button flex-1 disabled:opacity-50">{pending ? 'Сохраняем...' : 'Сохранить'}</button>
      </div>
    </div>
  )
}
