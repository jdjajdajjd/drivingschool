import { useMemo, useState } from 'react'
import { db } from '../../services/storage'
import { Modal } from '../../components/ui/Modal'
import type { Branch } from '../../types'
import { createBranchConfirmed, updateBranchConfirmed } from '../../services/branchService'
import { filterBranches } from '../../services/staffScope'

export function AdminBranches() {
  const school = db.schools.currentAdmin()
  const [showAdd, setShowAdd] = useState(false)
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)

  const branches = useMemo(() => {
    if (!school) return []
    return filterBranches(db.branches.bySchool(school.id)).map((branch) => {
      const instructors = db.instructors.byBranch(branch.id)
      const slots = db.slots.byBranch(branch.id)
      const todaySlots = slots.filter((s) => s.date === new Date().toISOString().split('T')[0])
      return { branch, instructors: instructors.filter((i) => i.isActive).length, slotsToday: todaySlots.length }
    })
  }, [school?.id])

  return (
    <div className="flex h-full flex-col">
      <div className="v-admin-toolbar">
        <div>
          <h1 className="v-admin-heading">Филиалы</h1>
          <p className="v-admin-note mt-1">Адреса, телефоны, инструкторы и окна по отделениям</p>
        </div>
        <span className="v-admin-pill v-tone-muted">{branches.length}</span>
        <button onClick={() => setShowAdd(true)} className="v-admin-button">
          + Добавить филиал
        </button>
      </div>

      <div className="flex-1 overflow-auto p-3 md:p-5">
        {branches.length === 0 ? (
          <div className="v-admin-empty">
            <div>
              <strong>Филиалов пока нет</strong>
              <span>Добавьте первый филиал, чтобы инструкторы и окна были привязаны к адресу.</span>
              <button onClick={() => setShowAdd(true)} className="v-admin-button mt-3">
                + Добавить филиал
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {branches.map(({ branch, instructors, slotsToday }) => (
              <div key={branch.id} className="v-human-card p-4 transition hover:-translate-y-0.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-[18px] font-semibold text-[#111827]">{branch.name}</h2>
                      <span className={`v-admin-pill shrink-0 ${branch.isActive ? 'v-tone-ok' : 'v-tone-muted'}`}>
                        {branch.isActive ? 'Активен' : 'Неактивен'}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[13px] font-medium text-[#667085]">{branch.address}</p>
                    {branch.phone && <p className="mt-0.5 text-[13px] font-medium text-[#667085]">{branch.phone}</p>}
                  </div>
                  <button onClick={() => setEditingBranch(branch)} className="v-admin-button-secondary shrink-0">
                    Редактировать
                  </button>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {[
                    { label: 'Инструкторов', value: instructors },
                    { label: 'Окон сегодня', value: slotsToday },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-[16px] bg-[#F8FAFC] p-3 text-center">
                      <p className="text-[22px] font-semibold text-[#111827]">{stat.value}</p>
                      <p className="text-[11px] font-medium text-[#667085]">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={showAdd || Boolean(editingBranch)}
        onClose={() => { setShowAdd(false); setEditingBranch(null) }}
        title={editingBranch ? 'Редактировать филиал' : 'Добавить филиал'}
        size="md"
      >
        <BranchForm
          schoolId={school?.id ?? ''}
          branch={editingBranch}
          onClose={() => { setShowAdd(false); setEditingBranch(null) }}
        />
      </Modal>
    </div>
  )
}

function BranchForm({ schoolId, branch, onClose }: { schoolId: string; branch: Branch | null; onClose: () => void }) {
  const [name, setName] = useState(branch?.name ?? '')
  const [address, setAddress] = useState(branch?.address ?? '')
  const [phone, setPhone] = useState(branch?.phone ?? '')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const handleSubmit = async () => {
    if (pending) return
    setError('')
    if (!name.trim()) { setError('Укажите название филиала.'); return }
    if (!address.trim()) { setError('Укажите адрес филиала.'); return }
    setPending(true)
    const result = branch
      ? await updateBranchConfirmed(branch.id, { name, address, phone, isActive: branch.isActive })
      : await createBranchConfirmed({ schoolId, name, address, phone, isActive: true })
    setPending(false)
    if (result.ok) { onClose(); return }
    setError(result.error ?? 'Не удалось сохранить филиал.')
  }

  return (
    <div className="space-y-4 p-5">
      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-gray-600">Название</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Центральный" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-[14px] font-semibold text-gray-900 placeholder-gray-300 transition focus:border-gray-900 focus:bg-white focus:outline-none" />
      </div>
      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-gray-600">Адрес</label>
        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="ул. Пушкина, 10" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-[14px] font-semibold text-gray-900 placeholder-gray-300 transition focus:border-gray-900 focus:bg-white focus:outline-none" />
      </div>
      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-gray-600">Телефон</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 (999) 123-45-67" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-[14px] font-semibold text-gray-900 placeholder-gray-300 transition focus:border-gray-900 focus:bg-white focus:outline-none" />
      </div>
      {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-[13px] font-bold text-red-600">{error}</p> : null}
      <div className="v-modal-actions">
        <button onClick={onClose} disabled={pending} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-[13px] font-bold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50">Отмена</button>
        <button onClick={handleSubmit} disabled={pending} className="v-admin-button flex-1 disabled:opacity-50">{pending ? 'Сохраняем...' : 'Сохранить'}</button>
      </div>
    </div>
  )
}
