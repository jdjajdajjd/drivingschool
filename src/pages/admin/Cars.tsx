import { useMemo, useState } from 'react'
import { db } from '../../services/storage'
import { adminCars, createAuditEntry } from '../../services/adminStorage'
import { Modal } from '../../components/ui/Modal'
import type { Car, CarStatus } from '../../types'

const STATUS_COLORS: Record<CarStatus, { bg: string; text: string; label: string }> = {
  working: { bg: 'bg-green-50', text: 'text-green-600', label: 'Работает' },
  maintenance: { bg: 'bg-amber-50', text: 'text-amber-600', label: 'На обслуживании' },
  repair: { bg: 'bg-red-50', text: 'text-red-500', label: 'В ремонте' },
  reserved: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'Резерв' },
  written_off: { bg: 'bg-gray-100', text: 'text-gray-400', label: 'Списана' },
}

export function AdminCars() {
  const school = db.schools.all()[0]
  const [filter, setFilter] = useState<CarStatus | 'all'>('all')
  const [showAdd, setShowAdd] = useState(false)

  const data = useMemo(() => {
    if (!school) return []
    return adminCars.all(school.id).map((car) => {
      const instructor = db.instructors.byId(car.instructorId ?? '')
      const branch = db.branches.byId(car.branchId)
      return { car, instructor, branch }
    })
  }, [school?.id])

  const filtered = filter === 'all' ? data : data.filter((d) => d.car.status === filter)

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-shrink-0 flex-wrap items-center gap-3 border-b border-gray-100 bg-white px-4 py-4 md:px-6">
        <h1 className="text-[24px] font-black text-gray-900">Машины</h1>
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[12px] font-bold text-gray-500">
          {data.filter((d) => d.car.status === 'working').length}/{data.length}
        </span>
        <div className="ml-auto flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
          <div className="no-scrollbar flex max-w-full gap-1 overflow-x-auto rounded-xl border border-gray-200 p-0.5">
            {(['all', 'working', 'maintenance', 'repair', 'reserved'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition ${
                  filter === f ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {f === 'all' ? 'Все' : STATUS_COLORS[f].label}
              </button>
            ))}
          </div>
          <button onClick={() => setShowAdd(true)} className="h-10 rounded-xl bg-gray-900 px-4 text-[13px] font-bold text-white">
            + Добавить
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        {filtered.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-gray-400">Машины не найдены</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map(({ car, instructor, branch }) => {
              const st = STATUS_COLORS[car.status]
              return (
                <div key={car.id} className="rounded-2xl border border-gray-100 bg-white p-5 transition hover:border-gray-200">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-[14px] font-black text-gray-600">
                      ТС
                    </div>
                    <span className={`rounded-lg px-2.5 py-1 text-[12px] font-bold ${st.bg} ${st.text}`}>
                      {st.label}
                    </span>
                  </div>
                  <p className="font-bold text-gray-900">{car.brand} {car.model}</p>
                  <p className="text-[13px] font-semibold text-gray-400">{car.licensePlate}</p>

                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-semibold text-gray-400">Категория</span>
                      <span className="text-[13px] font-bold text-gray-700">B — {car.transmission === 'auto' ? 'АКПП' : 'МКПП'}</span>
                    </div>
                    {branch && (
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-semibold text-gray-400">Филиал</span>
                        <span className="text-[13px] font-semibold text-gray-700">{branch.name}</span>
                      </div>
                    )}
                    {instructor && (
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-semibold text-gray-400">Инструктор</span>
                        <span className="text-[13px] font-semibold text-gray-700">{instructor.name}</span>
                      </div>
                    )}
                    {car.insuranceExpiry && (
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-semibold text-gray-400">Страховка</span>
                        <span className={`text-[13px] font-semibold ${new Date(car.insuranceExpiry) < new Date() ? 'text-red-500' : 'text-gray-700'}`}>
                          до {car.insuranceExpiry}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Добавить машину" size="md">
        <CarForm schoolId={school?.id ?? ''} onClose={() => setShowAdd(false)} />
      </Modal>
    </div>
  )
}

function CarForm({ schoolId, onClose }: { schoolId: string; onClose: () => void }) {
  const [form, setForm] = useState({
    brand: '', model: '', licensePlate: '', category: 'B',
    transmission: 'auto' as 'manual' | 'auto', color: '', year: '',
    insuranceNumber: '', notes: '',
  })
  const branches = db.branches.bySchool(schoolId)

  const handleSubmit = () => {
    if (!form.brand || !form.licensePlate) return
    const car: Car = {
      id: `car_${Date.now()}`,
      schoolId,
      branchId: branches[0]?.id ?? '',
      brand: form.brand,
      model: form.model,
      licensePlate: form.licensePlate.toUpperCase(),
      category: form.category,
      transmission: form.transmission,
      status: 'working',
      color: form.color,
      year: form.year ? parseInt(form.year) : undefined,
      insuranceNumber: form.insuranceNumber,
      notes: form.notes,
      createdAt: new Date().toISOString(),
    }
    adminCars.upsert(car)
    createAuditEntry(schoolId, 'admin', 'Администратор', 'car_created', 'car', car.id, `Добавлена машина ${car.brand} ${car.licensePlate}`)
    onClose()
  }

  return (
    <div className="space-y-4 p-5">
      {[
        { key: 'brand', label: 'Марка', placeholder: 'Toyota' },
        { key: 'model', label: 'Модель', placeholder: 'Camry' },
        { key: 'licensePlate', label: 'Госномер', placeholder: 'А123АА' },
        { key: 'color', label: 'Цвет', placeholder: 'Белый' },
        { key: 'year', label: 'Год выпуска', placeholder: '2022' },
        { key: 'insuranceNumber', label: 'Номер страховки', placeholder: '...' },
      ].map((field) => (
        <div key={field.key}>
          <label className="mb-1.5 block text-[13px] font-semibold text-gray-600">{field.label}</label>
          <input
            value={(form as Record<string, string>)[field.key]}
            onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
            placeholder={field.placeholder}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-[14px] font-semibold text-gray-900 placeholder-gray-300 transition focus:border-gray-900 focus:bg-white focus:outline-none"
          />
        </div>
      ))}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-gray-600">Категория</label>
          <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-[14px] font-semibold text-gray-900 transition focus:border-gray-900 focus:bg-white focus:outline-none">
            <option value="B">B</option><option value="A">A</option><option value="C">C</option><option value="D">D</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-gray-600">Коробка</label>
          <select value={form.transmission} onChange={(e) => setForm((f) => ({ ...f, transmission: e.target.value as 'manual' | 'auto' }))} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-[14px] font-semibold text-gray-900 transition focus:border-gray-900 focus:bg-white focus:outline-none">
            <option value="auto">АКПП</option><option value="manual">МКПП</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-gray-600">Заметки</label>
        <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-[14px] font-semibold text-gray-900 placeholder-gray-300 transition focus:border-gray-900 focus:bg-white focus:outline-none" placeholder="..." />
      </div>

      <div className="flex gap-2 pt-2">
        <button onClick={onClose} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-[13px] font-bold text-gray-600 transition hover:bg-gray-50">Отмена</button>
        <button onClick={handleSubmit} className="flex-1 rounded-xl bg-gray-900 py-2.5 text-[13px] font-bold text-white transition hover:bg-gray-800">Сохранить</button>
      </div>
    </div>
  )
}
