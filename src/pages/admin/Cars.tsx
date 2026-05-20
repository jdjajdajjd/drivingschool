import { useMemo, useState } from 'react'
import { db } from '../../services/storage'
import { adminCars, createCurrentStaffAuditEntry } from '../../services/adminStorage'
import { Modal } from '../../components/ui/Modal'
import type { Car, CarStatus } from '../../types'
import { filterBranches } from '../../services/staffScope'
import { assertAdminPermission } from '../../services/adminAccess'

const STATUS_COLORS: Record<CarStatus, { bg: string; text: string; label: string }> = {
  working: { bg: 'bg-green-50', text: 'text-green-600', label: 'Работает' },
  maintenance: { bg: 'bg-[#EAF3FF]', text: 'text-[#315A7C]', label: 'На обслуживании' },
  repair: { bg: 'bg-red-50', text: 'text-red-500', label: 'В ремонте' },
  reserved: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'Резерв' },
  written_off: { bg: 'bg-gray-100', text: 'text-gray-400', label: 'Списана' },
}

function carStatusTone(status: CarStatus) {
  if (status === 'working') return 'v-tone-ok'
  if (status === 'repair' || status === 'written_off') return 'v-tone-danger'
  if (status === 'maintenance') return 'v-tone-warning'
  return 'v-tone-info'
}

export function AdminCars() {
  const school = db.schools.currentAdmin()
  const [filter, setFilter] = useState<CarStatus | 'all'>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [version, setVersion] = useState(0)

  const data = useMemo(() => {
    if (!school) return []
    return adminCars.all(school.id).map((car) => {
      const instructor = db.instructors.byId(car.instructorId ?? '')
      const branch = db.branches.byId(car.branchId)
      return { car, instructor, branch }
    })
  }, [school?.id, version])

  const filtered = filter === 'all' ? data : data.filter((d) => d.car.status === filter)
  const unavailableCount = data.filter((item) => item.car.status === 'repair' || item.car.status === 'maintenance').length

  return (
    <div className="flex h-full flex-col">
      <div className="v-admin-toolbar">
        <div>
          <h1 className="v-admin-heading">Машины</h1>
          <p className="v-admin-note mt-1">Автопарк, статусы, страховки и привязка к филиалам</p>
        </div>
        <div className="ml-auto grid w-full grid-cols-3 gap-2 sm:w-auto">
          <div className="rounded-[14px] bg-[#ECF8F1] px-3 py-2"><p className="text-[11px] font-semibold uppercase text-[#1F8F3F]">Работают</p><p className="text-[20px] font-semibold text-[#111827]">{data.filter((d) => d.car.status === 'working').length}</p></div>
          <div className="rounded-[14px] bg-[#FEF2F2] px-3 py-2"><p className="text-[11px] font-semibold uppercase text-[#C92820]">Недоступны</p><p className="text-[20px] font-semibold text-[#111827]">{unavailableCount}</p></div>
          <div className="rounded-[14px] bg-[#F2F6FA] px-3 py-2"><p className="text-[11px] font-semibold uppercase text-[#667085]">Всего</p><p className="text-[20px] font-semibold text-[#111827]">{data.length}</p></div>
          <div className="col-span-3 flex flex-wrap justify-end gap-2">
            <div className="v-tab-row v-tab-row-wrap flex-1 border-0 bg-transparent p-0">
              {(['all', 'working', 'maintenance', 'repair', 'reserved'] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={`v-tab ${filter === f ? 'v-tab-active' : ''}`}>{f === 'all' ? 'Все' : STATUS_COLORS[f].label}</button>
              ))}
            </div>
          <button onClick={() => setShowAdd(true)} className="v-admin-button">
            + Добавить
          </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 md:p-5">
        {filtered.length === 0 ? (
          <div className="v-admin-empty">
            <strong>Машины не найдены</strong>
            <span>Смените фильтр или добавьте машину.</span>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map(({ car, instructor, branch }) => {
              const st = STATUS_COLORS[car.status]
              const insuranceExpired = car.insuranceExpiry ? new Date(car.insuranceExpiry) < new Date() : false
              const serviceSoon = car.nextServiceDate ? new Date(car.nextServiceDate) <= new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : false
              const missingDates = !car.insuranceExpiry || !car.nextServiceDate
              return (
                <div key={car.id} className="v-human-card p-4 transition hover:-translate-y-0.5">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-[#F2F6FA] text-[14px] font-semibold text-[#667085]">
                      ТС
                    </div>
                    <span className={`v-admin-pill ${carStatusTone(car.status)}`}>
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
                    {car.nextServiceDate && (
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-semibold text-gray-400">Сервис</span>
                        <span className={`text-[13px] font-semibold ${serviceSoon ? 'text-[#8A6100]' : 'text-gray-700'}`}>
                          до {car.nextServiceDate}
                        </span>
                      </div>
                    )}
                  </div>
                  {(insuranceExpired || serviceSoon || missingDates) ? (
                    <div className={`mt-3 rounded-[16px] px-3 py-2 text-[12px] font-black ${insuranceExpired ? 'bg-red-50 text-red-600' : serviceSoon ? 'bg-[#FFF7D6] text-[#8A6100]' : 'bg-[#F8FAFC] text-[#667085]'}`}>
                      {insuranceExpired ? 'Проверьте ОСАГО: срок вышел' : serviceSoon ? 'Скоро обслуживание' : 'Заполните сроки ОСАГО и сервиса'}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Добавить машину" size="md">
        <CarForm schoolId={school?.id ?? ''} onSaved={() => setVersion((value) => value + 1)} onClose={() => setShowAdd(false)} />
      </Modal>
    </div>
  )
}

function CarForm({ schoolId, onSaved, onClose }: { schoolId: string; onSaved: () => void; onClose: () => void }) {
  const [form, setForm] = useState({
    brand: '', model: '', licensePlate: '', category: 'B',
    transmission: 'auto' as 'manual' | 'auto', color: '', year: '', insuranceExpiry: '', nextServiceDate: '',
    insuranceNumber: '', notes: '',
  })
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const branches = filterBranches(db.branches.bySchool(schoolId))

  const handleSubmit = async () => {
    const access = assertAdminPermission('vehicles.manage')
    if (!access.ok) { setError(access.error ?? 'Недостаточно прав.'); return }
    if (pending) return

    setError('')
    if (!schoolId) { setError('Школа не найдена.'); return }
    if (!branches[0]?.id) { setError('Сначала добавьте филиал.'); return }
    if (!form.brand.trim()) { setError('Укажите марку.'); return }
    if (!form.licensePlate.trim()) { setError('Укажите госномер.'); return }
    const car: Car = {
      id: `car_${Date.now()}`,
      schoolId,
      branchId: branches[0].id,
      brand: form.brand.trim(),
      model: form.model.trim(),
      licensePlate: form.licensePlate.trim().toUpperCase(),
      category: form.category,
      transmission: form.transmission,
      status: 'working',
      color: form.color.trim(),
      year: form.year ? parseInt(form.year) : undefined,
      insuranceNumber: form.insuranceNumber.trim(),
      insuranceExpiry: form.insuranceExpiry || undefined,
      nextServiceDate: form.nextServiceDate || undefined,
      notes: form.notes.trim(),
      createdAt: new Date().toISOString(),
    }
    try {
      setPending(true)
      await adminCars.upsertConfirmed(car)
      createCurrentStaffAuditEntry(schoolId, 'car_created', 'car', car.id, `Добавлена машина ${car.brand} ${car.licensePlate}`)
      onSaved()
      onClose()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Не удалось сохранить машину.')
    } finally {
      setPending(false)
    }
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

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-gray-600">ОСАГО до</label>
          <input type="date" value={form.insuranceExpiry} onChange={(e) => setForm((f) => ({ ...f, insuranceExpiry: e.target.value }))} className="v-admin-input w-full" />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-gray-600">Сервис до</label>
          <input type="date" value={form.nextServiceDate} onChange={(e) => setForm((f) => ({ ...f, nextServiceDate: e.target.value }))} className="v-admin-input w-full" />
        </div>
      </div>

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

      {error ? <p className="rounded-[10px] bg-[#EAF3FF] px-3 py-2 text-[13px] font-bold text-[#315A7C]">{error}</p> : null}
      <div className="v-modal-actions">
        <button onClick={onClose} disabled={pending} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-[13px] font-bold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50">Отмена</button>
        <button onClick={handleSubmit} disabled={pending} className="v-admin-button flex-1 disabled:opacity-50">{pending ? 'Сохраняем...' : 'Сохранить'}</button>
      </div>
    </div>
  )
}
