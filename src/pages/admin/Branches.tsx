import { useMemo, useState } from 'react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../components/ui/Toast'
import { archiveBranchConfirmed, createBranchConfirmed, getBranchesBySchool, updateBranchConfirmed } from '../../services/branchService'
import { db } from '../../services/storage'

const INIT = { name: '', address: '', phone: '', isActive: true }
function fieldCls() {
  return 'h-10 w-full rounded-[12px] border border-[rgba(0,0,0,0.06)] bg-white px-3 text-[14px] font-medium text-[#111418] outline-none focus:border-[#111418]'
}

export function AdminBranches() {
  const school = db.schools.all()[0] ?? null
  const { showToast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState(INIT)
  const [saving, setSaving] = useState(false)
  const [archiving, setArchiving] = useState(false)

  const branches = school ? getBranchesBySchool(school.id) : []

  const rows = useMemo(() => {
    const now = Date.now()
    const weekEnd = now + 7 * 24 * 60 * 60 * 1000
    return branches.map((b) => ({
      b,
      instructorCount: db.instructors.byBranch(b.id).length,
      futureBookings: db.bookings.all().filter((bk) => bk.branchId === b.id && bk.status === 'active').length,
      freeSlots7d: db.slots.byBranch(b.id).filter((s) => {
        const t = new Date(`${s.date}T${s.time}:00`).getTime()
        return s.status === 'available' && t > now && t <= weekEnd
      }).length,
    }))
  }, [branches])

  function openCreate() { setEditingId(null); setForm(INIT); setModalOpen(true) }
  function openEdit(b: typeof branches[0]) { setEditingId(b.id); setForm({ name: b.name, address: b.address, phone: b.phone, isActive: b.isActive }); setModalOpen(true) }

  async function handleSubmit() {
    if (!school || saving) return
    setSaving(true)
    const r = editingId
      ? await updateBranchConfirmed(editingId, form)
      : await createBranchConfirmed({ schoolId: school.id, ...form })
    setSaving(false)
    if (!r.ok) { showToast(r.error ?? 'Ошибка', 'error'); return }
    showToast(editingId ? 'Обновлён' : 'Создан', 'success')
    setModalOpen(false)
  }

  async function handleArchive() {
    if (!deleteId || archiving) return
    setArchiving(true)
    const r = await archiveBranchConfirmed(deleteId)
    setArchiving(false)
    setDeleteId(null)
    if (!r.ok) { showToast(r.error ?? 'Ошибка', 'error'); return }
    showToast('Филиал выключен', 'success')
  }

  if (!school) return <div className="px-3 py-4"><p className="text-sm text-[#6F747A]">Данные школы не загружены</p></div>

  return (
    <div className="px-3 pb-24 pt-3 md:px-5 md:pt-4">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#9EA3A8]">{school.name}</p>
          <h1 className="mt-1 text-[22px] font-black tracking-[-0.03em] text-[#111418] md:text-[26px]">Филиалы</h1>
        </div>
        <Button onClick={openCreate}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Добавить
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-[#CBD5E1] bg-white px-4 py-5 text-center">
          <p className="font-black text-[#111418]">Филиалов пока нет</p>
          <p className="mt-1 text-sm text-[#9EA3A8]">Создайте первый филиал</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map(({ b, instructorCount, futureBookings, freeSlots7d }) => (
            <div key={b.id} className="rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white px-3 py-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-black text-[#111418]">{b.name}</p>
                  <p className="truncate text-[12px] font-semibold text-[#6F747A]">{b.address || 'Адрес не указан'}</p>
                  {b.phone && <p className="mt-0.5 text-[12px] font-semibold text-[#9EA3A8]">{b.phone}</p>}
                </div>
                <Badge variant={b.isActive ? 'success' : 'muted'}>{b.isActive ? 'Активен' : 'Выключен'}</Badge>
              </div>
              <div className="mt-2 flex gap-4 border-t border-[rgba(0,0,0,0.05)] pt-2">
                <div><p className="text-[10px] font-bold text-[#9EA3A8]">Инстр.</p><p className="text-[13px] font-black text-[#111418]">{instructorCount}</p></div>
                <div><p className="text-[10px] font-bold text-[#9EA3A8]">Записей</p><p className="text-[13px] font-black text-[#111418]">{futureBookings}</p></div>
                <div><p className="text-[10px] font-bold text-[#9EA3A8]">Окон 7д</p><p className="text-[13px] font-black text-[#3156D4]">{freeSlots7d}</p></div>
              </div>
              <div className="mt-2 flex gap-2 border-t border-[rgba(0,0,0,0.05)] pt-2">
                <button onClick={() => openEdit(b)} className="flex-1 rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-white px-2 py-1.5 text-[12px] font-black text-[#111418] transition hover:bg-[#F1F2F5]">Редактировать</button>
                <button onClick={() => setDeleteId(b.id)} className="flex-1 rounded-[10px] border border-[rgba(229,83,75,0.15)] bg-white px-2 py-1.5 text-[12px] font-black text-[#E5534B] transition hover:bg-[#FEF2F2]">Выключить</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Редактировать филиал' : 'Новый филиал'}>
        <div className="space-y-4 px-5 pb-5">
          <input className={fieldCls()} placeholder="Название *" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <input className={fieldCls()} placeholder="Адрес" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
          <input className={fieldCls()} placeholder="Телефон" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
            <span className="text-[13px] font-semibold text-[#6F747A]">Активен</span>
          </label>
          <div className="flex gap-2">
            <Button onClick={() => void handleSubmit()} disabled={saving} className="flex-1">{saving ? '...' : editingId ? 'Сохранить' : 'Создать'}</Button>
            <Button variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">Закрыть</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={Boolean(deleteId)} title="Выключить филиал" description="Будущее свободное время филиала будет скрыто. Существующие записи не изменятся." confirmLabel="Выключить" onClose={() => setDeleteId(null)} onConfirm={() => void handleArchive()} danger />
    </div>
  )
}
