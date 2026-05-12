import { useMemo, useState } from 'react'
import { db } from '../../services/storage'
import { Modal } from '../../components/ui/Modal'
import type { Branch } from '../../types'

export function AdminBranches() {
  const school = db.schools.all()[0]
  const [showAdd, setShowAdd] = useState(false)
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)

  const branches = useMemo(() => {
    if (!school) return []
    return db.branches.bySchool(school.id).map((branch) => {
      const instructors = db.instructors.byBranch(branch.id)
      const slots = db.slots.byBranch(branch.id)
      const todaySlots = slots.filter((s) => s.date === new Date().toISOString().split('T')[0])
      return { branch, instructors: instructors.filter((i) => i.isActive).length, slotsToday: todaySlots.length }
    })
  }, [school?.id])

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 bg-white px-4 py-4 md:px-6">
        <div className="flex items-center gap-3">
          <h1 className="text-[24px] font-black text-gray-900">Филиалы</h1>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[12px] font-bold text-gray-500">{branches.length}</span>
        </div>
        <button onClick={() => setShowAdd(true)} className="v-admin-button">
          + Добавить филиал
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        {branches.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-[15px] font-semibold text-gray-400">Филиалов пока нет</p>
              <button onClick={() => setShowAdd(true)} className="v-admin-button mt-3">
                + Добавить филиал
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {branches.map(({ branch, instructors, slotsToday }) => (
              <div key={branch.id} className="rounded-2xl border border-gray-100 bg-white p-5 transition hover:border-gray-200">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-[18px] font-bold text-gray-900">{branch.name}</h2>
                      <span className={`rounded-lg px-2.5 py-1 text-[12px] font-bold ${branch.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                        {branch.isActive ? 'Активен' : 'Неактивен'}
                      </span>
                    </div>
                    <p className="mt-1 text-[13px] font-semibold text-gray-400">{branch.address}</p>
                    {branch.phone && <p className="mt-0.5 text-[13px] font-semibold text-gray-400">{branch.phone}</p>}
                  </div>
                  <button onClick={() => setEditingBranch(branch)} className="rounded-xl border border-gray-200 px-4 py-2 text-[13px] font-bold text-gray-600 transition hover:bg-gray-50">
                    Редактировать
                  </button>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    { label: 'Инструкторов', value: instructors },
                    { label: 'Окон сегодня', value: slotsToday },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-xl bg-gray-50 p-3 text-center">
                      <p className="text-[20px] font-black text-gray-900">{stat.value}</p>
                      <p className="text-[11px] font-semibold text-gray-400">{stat.label}</p>
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

  const handleSubmit = () => {
    if (!name || !address) return
    const nextBranch: Branch = {
      id: branch?.id ?? `branch_${Date.now()}`,
      schoolId,
      name,
      address,
      phone,
      isActive: branch?.isActive ?? true,
    }
    db.branches.upsert(nextBranch)
    onClose()
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
      <div className="flex gap-2 pt-2">
        <button onClick={onClose} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-[13px] font-bold text-gray-600 transition hover:bg-gray-50">Отмена</button>
        <button onClick={handleSubmit} className="v-admin-button flex-1">Сохранить</button>
      </div>
    </div>
  )
}
