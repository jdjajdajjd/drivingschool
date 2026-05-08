import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../components/ui/Toast'
import { formatDuration } from '../../lib/utils'
import { DRIVING_CATEGORIES } from '../../services/drivingCategories'
import { resetProductData, updateSchoolConfirmed, validatePrimaryColor } from '../../services/schoolService'
import { db } from '../../services/storage'
import { ADMIN_BASE_PATH } from '../../services/accessControl'

export function AdminSettings() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const school = db.schools.all()[0] ?? null
  const [resetOpen, setResetOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    primaryColor: '#1f5b43',
    logoUrl: '',
    bookingLimitEnabled: true,
    maxActiveBookingsPerStudent: 2,
    branchSelectionMode: 'student_choice' as 'student_choice' | 'fixed_first',
    maxSlotsPerBooking: 1,
    defaultLessonDuration: 90,
    enabledCategoryCodes: [] as string[],
  })

  useEffect(() => {
    if (!school) return
    const codes = Array.from(new Set(db.instructors.bySchool(school.id).flatMap((i) => i.categories ?? [])))
    setForm({
      name: school.name,
      description: school.description,
      primaryColor: school.primaryColor ?? '#1f5b43',
      logoUrl: school.logoUrl ?? '',
      bookingLimitEnabled: school.bookingLimitEnabled ?? true,
      maxActiveBookingsPerStudent: school.maxActiveBookingsPerStudent ?? 2,
      branchSelectionMode: school.branchSelectionMode ?? 'student_choice',
      maxSlotsPerBooking: school.maxSlotsPerBooking ?? 1,
      defaultLessonDuration: school.defaultLessonDuration ?? 90,
      enabledCategoryCodes: school.enabledCategoryCodes?.length ? school.enabledCategoryCodes : codes,
    })
  }, [school?.id])

  const publicUrl = `${window.location.origin}/school/${school?.slug ?? form.name.toLowerCase().replace(/\s+/g, '-')}`

  async function copyLink() { await navigator.clipboard.writeText(publicUrl); showToast('Скопировано', 'success') }

  function toggleCategory(code: string) {
    setForm((f) => ({
      ...f,
      enabledCategoryCodes: f.enabledCategoryCodes.includes(code)
        ? f.enabledCategoryCodes.filter((c) => c !== code)
        : [...f.enabledCategoryCodes, code],
    }))
  }

  async function handleSave() {
    if (!school || saving) return
    if (!form.name.trim()) { showToast('Введите название', 'error'); return }
    if (!validatePrimaryColor(form.primaryColor)) { showToast('Неверный цвет', 'error'); return }
    if (form.enabledCategoryCodes.length === 0) { showToast('Выберите категорию', 'error'); return }
    setSaving(true)
    try {
      const r = await updateSchoolConfirmed(school.id, {
        name: form.name.trim(),
        description: form.description.trim(),
        primaryColor: form.primaryColor.trim(),
        logoUrl: form.logoUrl.trim(),
        bookingLimitEnabled: form.bookingLimitEnabled,
        maxActiveBookingsPerStudent: form.maxActiveBookingsPerStudent,
        branchSelectionMode: form.branchSelectionMode,
        maxSlotsPerBooking: form.maxSlotsPerBooking,
        defaultLessonDuration: form.defaultLessonDuration,
        enabledCategoryCodes: form.enabledCategoryCodes,
      })
      if (!r.ok) { showToast(r.error ?? 'Ошибка', 'error'); return }
      showToast('Сохранено', 'success')
      if (r.school?.slug !== school.slug) navigate(`${ADMIN_BASE_PATH}/settings`, { replace: true })
    } catch (e) { showToast(e instanceof Error ? e.message : 'Ошибка', 'error') }
    finally { setSaving(false) }
  }

  function handleReset() {
    resetProductData()
    setResetOpen(false)
    showToast('Данные обновлены', 'success')
    window.location.href = `${ADMIN_BASE_PATH}/settings`
  }

  if (!school) return <div className="px-3 py-4"><p className="text-sm text-[#6F747A]">Данные школы не загружены</p></div>

  return (
    <div className="px-3 pb-24 pt-3 md:px-5 md:pt-4">
      <div className="mb-4">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#9EA3A8]">{school.name}</p>
        <h1 className="mt-1 text-[22px] font-black tracking-[-0.03em] text-[#111418] md:text-[26px]">Настройки</h1>
      </div>

      <div className="space-y-3">
        {/* School info */}
        <div className="rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white px-3 py-3">
          <h2 className="text-[15px] font-black text-[#111418]">Основное</h2>
          <div className="mt-3 space-y-2">
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Название автошколы" className="h-10 w-full rounded-[12px] border border-[rgba(0,0,0,0.06)] bg-white px-3 text-[14px] font-medium outline-none focus:border-[#111418]" />
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Описание" rows={2} className="w-full resize-none rounded-[12px] border border-[rgba(0,0,0,0.06)] bg-white px-3 py-2 text-[14px] font-medium outline-none focus:border-[#111418]" />
          </div>
        </div>

        {/* Public page */}
        <div className="rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white px-3 py-3">
          <h2 className="text-[15px] font-black text-[#111418]">Публичная страница</h2>
          <div className="mt-3 space-y-3">
            <div className="rounded-[10px] bg-[#F8FAFC] px-3 py-2">
              <p className="text-[10px] font-bold text-[#9EA3A8]">Ссылка для учеников</p>
              <p className="mt-0.5 break-all text-[13px] font-black text-[#111418]">{publicUrl}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => void copyLink()} className="flex items-center gap-2 rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-white px-3 py-2 text-[12px] font-black text-[#111418]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                Копировать
              </button>
              <button onClick={() => window.open(publicUrl, '_blank')} className="flex items-center gap-2 rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-white px-3 py-2 text-[12px] font-black text-[#111418]">
                Открыть
              </button>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white px-3 py-3">
          <h2 className="text-[15px] font-black text-[#111418]">Категории</h2>
          <p className="mt-0.5 text-[12px] font-semibold text-[#9EA3A8]">Что видят ученики при записи</p>
          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {DRIVING_CATEGORIES.map((cat) => {
              const enabled = form.enabledCategoryCodes.includes(cat.code)
              return (
                <button key={cat.code} type="button" onClick={() => toggleCategory(cat.code)}
                  className={`rounded-[10px] border px-2 py-2 text-left transition ${enabled ? 'border-[#111418] bg-[#111418] text-white' : 'border-[rgba(0,0,0,0.06)] bg-white text-[#6F747A]'}`}>
                  <span className="text-[13px] font-black">{cat.code}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Rules */}
        <div className="rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white px-3 py-3">
          <h2 className="text-[15px] font-black text-[#111418]">Правила записи</h2>
          <div className="mt-3 space-y-3">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.bookingLimitEnabled} onChange={(e) => setForm((f) => ({ ...f, bookingLimitEnabled: e.target.checked }))} />
              <span className="text-[13px] font-semibold text-[#6F747A]">Ограничивать будущие записи</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[12px] font-semibold text-[#9EA3A8]">Макс. активных</p>
                <input type="number" min={1} max={10} value={form.maxActiveBookingsPerStudent} onChange={(e) => setForm((f) => ({ ...f, maxActiveBookingsPerStudent: Number(e.target.value) }))}
                  className="mt-1 h-9 w-full rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-white px-3 text-[14px] font-medium outline-none" />
              </div>
              <div>
                <p className="text-[12px] font-semibold text-[#9EA3A8]">Длительность ({formatDuration(form.defaultLessonDuration)})</p>
                <input type="number" min={30} max={240} step={15} value={form.defaultLessonDuration} onChange={(e) => setForm((f) => ({ ...f, defaultLessonDuration: Number(e.target.value) }))}
                  className="mt-1 h-9 w-full rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-white px-3 text-[14px] font-medium outline-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Danger zone */}
        <div className="rounded-[14px] border border-[rgba(229,83,75,0.15)] bg-white px-3 py-3">
          <h2 className="text-[15px] font-black text-[#E5534B]">Служебное</h2>
          <p className="mt-1 text-[12px] font-semibold text-[#9EA3A8]">Только для перезагрузки данных</p>
          <button onClick={() => setResetOpen(true)} className="mt-2 inline-flex items-center gap-2 rounded-[10px] border border-[rgba(229,83,75,0.20)] bg-white px-4 py-2 text-[12px] font-black text-[#E5534B] transition hover:bg-[#FEF2F2]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Сбросить демо-данные
          </button>
        </div>

        {/* Save */}
        <div className="pb-4">
          <Button onClick={() => void handleSave()} disabled={saving} className="w-full">{saving ? 'Сохраняем...' : 'Сохранить изменения'}</Button>
        </div>
      </div>

      <ConfirmDialog open={resetOpen} title="Сбросить демо-данные" description="Все демо-данные (ученики, записи, расписание) будут удалены и загружены заново." confirmLabel="Сбросить" onClose={() => setResetOpen(false)} onConfirm={handleReset} danger />
    </div>
  )
}