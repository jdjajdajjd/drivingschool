import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { StateView } from '../../components/ui/StateView'
import { DataRow } from '../../components/ui/DataList'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/ui/PageHeader'
import { Section } from '../../components/ui/Section'
import { useToast } from '../../components/ui/Toast'
import { createBranch, deleteBranchSafe, getBranchesBySchool, updateBranch } from '../../services/branchService'
import { db } from '../../services/storage'

const initialForm = {
  name: '',
  address: '',
  phone: '',
  isActive: true,
}

export function AdminBranches() {
  const school = db.schools.bySlug('virazh')
  const { showToast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState(initialForm)

  const branches = school ? getBranchesBySchool(school.id) : []
  const rows = useMemo(
    () =>
      branches.map((branch) => ({
        branch,
        instructorCount: db.instructors.byBranch(branch.id).length,
        futureBookings: db.bookings
          .all()
          .filter((booking) => booking.branchId === branch.id && booking.status === 'active').length,
        freeSlots7d: db.slots
          .byBranch(branch.id)
          .filter((slot) => slot.status === 'available' && new Date(`${slot.date}T${slot.time}:00`).getTime() <= Date.now() + 7 * 24 * 60 * 60 * 1000)
          .length,
      })),
    [branches],
  )

  function openCreate(): void {
    setEditingId(null)
    setForm(initialForm)
    setModalOpen(true)
  }

  function openEdit(branchId: string): void {
    const branch = branches.find((item) => item.id === branchId)
    if (!branch) return
    setEditingId(branch.id)
    setForm({
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      isActive: branch.isActive,
    })
    setModalOpen(true)
  }

  function handleSubmit(): void {
    if (!school) return

    const result = editingId
      ? updateBranch(editingId, form)
      : createBranch({
          schoolId: school.id,
          ...form,
        })

    if (!result.ok) {
      showToast(result.error ?? 'Не удалось сохранить филиал.', 'error')
      return
    }

    setModalOpen(false)
    showToast(editingId ? 'Филиал обновлён.' : 'Филиал создан.', 'success')
  }

  function handleDelete(): void {
    if (!deleteId) return
    const result = deleteBranchSafe(deleteId)
    setDeleteId(null)
    if (!result.ok) {
      showToast(result.error ?? 'Не удалось удалить филиал.', 'error')
      return
    }
    showToast('Филиал удалён.', 'success')
  }

  if (!school) {
    return (
      <div className="max-w-7xl p-4 md:p-6">
        <StateView kind="error" title="Школа не найдена" description="Демо-данные не загружены." />
      </div>
    )
  }

  return (
    <div className="max-w-7xl p-4 md:p-6">
      <PageHeader
        eyebrow={school.name}
        title="Филиалы"
        description="Простое управление адресами, активностью филиалов и связанными данными."
        actions={
          <Button onClick={openCreate}>
            <Plus size={16} />
            Создать филиал
          </Button>
        }
      />

      <div className="mt-8">
        <Section title="Все филиалы" description={`В школе ${rows.length} филиалов.`}>
          {rows.length === 0 ? (
            <StateView title="Филиалов пока нет" description="Создайте первый филиал, чтобы привязать к нему инструкторов и слоты." action={<Button onClick={openCreate}>Создать филиал</Button>} />
          ) : (
            <div className="grid gap-3">
              {rows.map(({ branch, instructorCount, futureBookings, freeSlots7d }) => (
                <DataRow key={branch.id} className="p-4">
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px_220px] xl:items-center">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                        <MapPin size={18} />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-black text-ink-900">{branch.name}</p>
                          <Badge variant={branch.isActive ? 'success' : 'default'}>
                            {branch.isActive ? 'Активен' : 'Выключен'}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{branch.address || 'Адрес не указан'}</p>
                        {branch.phone ? <p className="mt-1 text-sm font-semibold text-slate-500">{branch.phone}</p> : null}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-2xl bg-slate-50 px-3 py-3">
                        <p className="text-xs font-bold text-slate-500">Инструкторы</p>
                        <p className="mt-1 text-lg font-black text-ink-900">{instructorCount}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-3 py-3">
                        <p className="text-xs font-bold text-slate-500">Записи</p>
                        <p className="mt-1 text-lg font-black text-ink-900">{futureBookings}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-3 py-3">
                        <p className="text-xs font-bold text-slate-500">Слоты 7д</p>
                        <p className="mt-1 text-lg font-black text-blue-700">{freeSlots7d}</p>
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                      <Button variant="secondary" size="sm" onClick={() => openEdit(branch.id)}>
                        <Pencil size={14} />
                        Редактировать
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => setDeleteId(branch.id)}>
                        <Trash2 size={14} />
                        Удалить
                      </Button>
                    </div>
                  </div>
                </DataRow>
              ))}
            </div>
          )}
        </Section>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Редактировать филиал' : 'Новый филиал'}>
        <div className="space-y-4 px-6 pb-6">
          <Input label="Название" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          <Input label="Адрес" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} />
          <Input label="Телефон" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
          <label className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
            <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} />
            Филиал активен
          </label>
          <div className="flex gap-3">
            <Button className="flex-1" onClick={handleSubmit}>
              {editingId ? 'Сохранить изменения' : 'Создать филиал'}
            </Button>
            <Button variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>
              Закрыть
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Удалить филиал"
        description="Если у филиала есть связанные инструкторы, слоты или записи, удаление будет запрещено."
        confirmLabel="Удалить филиал"
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        danger
      />
    </div>
  )
}
