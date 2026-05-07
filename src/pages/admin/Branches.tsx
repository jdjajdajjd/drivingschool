import { Add01Icon, Delete02Icon, Location01Icon, PencilEdit02Icon } from '@hugeicons/core-free-icons'
import { useMemo, useState } from 'react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { createHugeIcon } from '../../components/ui/HugeIcon'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { StateView } from '../../components/ui/StateView'
import { CompactDataRow, SmallEmptyState } from '../../components/ui/CompactAdmin'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/ui/PageHeader'
import { Section } from '../../components/ui/Section'
import { useToast } from '../../components/ui/Toast'

const Location = createHugeIcon(Location01Icon)
const Pencil = createHugeIcon(PencilEdit02Icon)
const Plus = createHugeIcon(Add01Icon)
const Trash2 = createHugeIcon(Delete02Icon)
import { archiveBranchConfirmed, createBranchConfirmed, getBranchesBySchool, updateBranchConfirmed } from '../../services/branchService'
import { db } from '../../services/storage'

const initialForm = {
  name: '',
  address: '',
  phone: '',
  isActive: true,
}

export function AdminBranches() {
  const school = db.schools.all()[0] ?? null
  const { showToast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const [archiving, setArchiving] = useState(false)

  const branches = school ? getBranchesBySchool(school.id) : []
  const rows = useMemo(
    () => {
      const now = Date.now()
      const sevenDaysFromNow = now + 7 * 24 * 60 * 60 * 1000
      return branches.map((branch) => ({
        branch,
        instructorCount: db.instructors.byBranch(branch.id).length,
        futureBookings: db.bookings
          .all()
          .filter((booking) => booking.branchId === branch.id && booking.status === 'active').length,
        freeSlots7d: db.slots
          .byBranch(branch.id)
          .filter((slot) => {
            const startsAt = new Date(`${slot.date}T${slot.time}:00`).getTime()
            return slot.status === 'available' && startsAt >= now && startsAt <= sevenDaysFromNow
          })
          .length,
      }))
    },
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

  async function handleSubmit(): Promise<void> {
    if (!school || saving) return

    setSaving(true)
    const result = editingId
      ? await updateBranchConfirmed(editingId, form)
      : await createBranchConfirmed({
          schoolId: school.id,
          ...form,
        })
    setSaving(false)

    if (!result.ok) {
      showToast(result.error ?? 'Не удалось сохранить филиал.', 'error')
      return
    }

    setModalOpen(false)
    showToast(editingId ? 'Филиал обновлён.' : 'Филиал создан.', 'success')
  }

  async function handleArchive(): Promise<void> {
    if (!deleteId || archiving) return
    setArchiving(true)
    const result = await archiveBranchConfirmed(deleteId)
    setArchiving(false)
    setDeleteId(null)
    if (!result.ok) {
      showToast(result.error ?? 'Не удалось выключить филиал.', 'error')
      return
    }
    showToast('Филиал выключен, будущее свободное время скрыты. Записи не изменены.', 'success')
  }

  if (!school) {
    return (
      <div className="max-w-7xl bg-[#E9EEF7] p-2.5 md:p-5">
        <StateView kind="error" title="Школа не найдена" description="Данные школы не загружены." />
      </div>
    )
  }

  return (
    <div className="max-w-7xl bg-[#E9EEF7] p-2.5 md:p-5">
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

      <div className="mt-3">
        <Section title="Филиалы" description={`${rows.length} филиалов`}>
          {rows.length === 0 ? (
            <SmallEmptyState
              title="Филиалов пока нет"
              description="Создайте первый филиал."
              action={<Button size="sm" onClick={openCreate}><Plus size={15} />Создать филиал</Button>}
            />
          ) : (
            <div className="grid gap-2">
              {rows.map(({ branch, instructorCount, futureBookings, freeSlots7d }) => (
                <CompactDataRow key={branch.id}>
                  <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_280px_auto] md:items-center">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Location size={16} className="shrink-0 text-[#2436D9]" />
                        <p className="truncate text-[15px] font-black text-[#111827]">{branch.name}</p>
                        <Badge variant={branch.isActive ? 'success' : 'default'}>{branch.isActive ? 'Активен' : 'Выключен'}</Badge>
                      </div>
                      <p className="mt-0.5 truncate text-[13px] font-medium text-[#4B5A70]">{branch.address || 'Адрес не указан'}</p>
                      {branch.phone ? <p className="text-[12px] font-semibold text-[#667085]">{branch.phone}</p> : null}
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-center">
                      <div className="rounded-[10px] bg-[#F8FAFC] px-2 py-1.5">
                        <p className="text-[11px] font-bold text-[#667085]">Инстр.</p>
                        <p className="text-[15px] font-black text-[#111827]">{instructorCount}</p>
                      </div>
                      <div className="rounded-[10px] bg-[#F8FAFC] px-2 py-1.5">
                        <p className="text-[11px] font-bold text-[#667085]">Записи</p>
                        <p className="text-[15px] font-black text-[#111827]">{futureBookings}</p>
                      </div>
                      <div className="rounded-[10px] bg-[#F8FAFC] px-2 py-1.5">
                        <p className="text-[11px] font-bold text-[#667085]">Окна</p>
                        <p className="text-[15px] font-black text-[#2436D9]">{freeSlots7d}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 md:w-[190px]">
                      <Button variant="secondary" size="sm" onClick={() => openEdit(branch.id)}>
                        <Pencil size={14} />
                        Редактировать
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => setDeleteId(branch.id)}>
                        <Trash2 size={14} />
                        Выкл.
                      </Button>
                    </div>
                  </div>
                </CompactDataRow>
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
          <label className="flex items-center gap-3 rounded-[16px] border border-[#D8E0EC] bg-[#F8FAFE] px-4 py-3 text-sm text-[#4B5A70]">
            <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} />
            Филиал активен
          </label>
          <div className="flex gap-3">
            <Button className="flex-1" onClick={() => void handleSubmit()} disabled={saving}>
              {saving ? 'Сохраняем...' : editingId ? 'Сохранить изменения' : 'Создать филиал'}
            </Button>
            <Button variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>
              Закрыть
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Выключить филиал"
        description="Филиал останется в истории и админке, существующие записи не изменятся. Будущее свободное время филиала будут отменены и скрыты из публичной записи."
        confirmLabel={archiving ? 'Выключаем...' : 'Выключить филиал'}
        onClose={() => setDeleteId(null)}
        onConfirm={() => void handleArchive()}
        danger
      />
    </div>
  )
}
