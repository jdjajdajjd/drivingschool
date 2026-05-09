import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../components/ui/Toast'
import { formatDuration } from '../../lib/utils'
import { DRIVING_CATEGORIES } from '../../services/drivingCategories'
import { resetProductData, updateSchoolConfirmed, validatePrimaryColor, validateSchoolSlug } from '../../services/schoolService'
import { ADMIN_BASE_PATH } from '../../services/accessControl'
import { db } from '../../services/storage'

export function AdminSettings() {
  const { showToast } = useToast()
  const school = db.schools.all()[0] ?? null
  const [resetOpen, setResetOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [slugError, setSlugError] = useState('')
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    phone: '',
    email: '',
    address: '',
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
      slug: school.slug,
      description: school.description ?? '',
      phone: school.phone ?? '',
      email: school.email ?? '',
      address: school.address ?? '',
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

  function handleSlugChange(value: string) {
    const slug = value.toLowerCase().replace(/[^a-z0-9-]/g, '')
    setForm((f) => ({ ...f, slug }))
    if (slug && !validateSchoolSlug(slug)) {
      setSlugError('Только латиница, цифры и дефис')
    } else {
      setSlugError('')
    }
  }

  const publicUrl = school
    ? `${window.location.origin}/school/${school.slug}`
    : `${window.location.origin}/school/${form.slug || 'ваша-школа'}`

  async function copyLink() {
    await navigator.clipboard.writeText(publicUrl)
    showToast('Ссылка скопирована', 'success')
  }

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
    if (!form.slug.trim()) { showToast('Введите URL-имя', 'error'); return }
    if (!validateSchoolSlug(form.slug)) { showToast('URL-имя: только латиница, цифры и дефис', 'error'); return }
    if (form.primaryColor && !validatePrimaryColor(form.primaryColor)) { showToast('Цвет в формате #RRGGBB', 'error'); return }
    if (form.enabledCategoryCodes.length === 0) { showToast('Выберите хотя бы одну категорию', 'error'); return }
    if (form.phone && !/^\+?[\d\s\-()]{7,}$/.test(form.phone)) { showToast('Телефон выглядит некорректно', 'error'); return }
    setSaving(true)
    try {
      const updatePatch: Parameters<typeof updateSchoolConfirmed>[1] = {
        name: form.name.trim(),
        description: form.description.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        primaryColor: form.primaryColor.trim(),
        logoUrl: form.logoUrl.trim(),
        bookingLimitEnabled: form.bookingLimitEnabled,
        maxActiveBookingsPerStudent: form.maxActiveBookingsPerStudent,
        branchSelectionMode: form.branchSelectionMode,
        maxSlotsPerBooking: form.maxSlotsPerBooking,
        defaultLessonDuration: form.defaultLessonDuration,
        enabledCategoryCodes: form.enabledCategoryCodes,
      }
      updatePatch.slug = form.slug.trim()
      const r = await updateSchoolConfirmed(school.id, updatePatch)
      if (!r.ok) { showToast(r.error ?? 'Ошибка', 'error'); return }
      showToast('Настройки сохранены', 'success')
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
        <h1 className="mt-1 text-[22px] font-black tracking-[-0.03em] text-[#050609] md:text-[26px]">Настройки</h1>
      </div>

      <div className="space-y-3">
        {/* School info */}
        <div className="rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white px-3 py-3">
          <h2 className="text-[15px] font-black text-[#050609]">Название и контакты</h2>
          <div className="mt-3 space-y-2">
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#6F747A]">Название автошколы</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Например: Автошкола Вираж" className="h-10 w-full rounded-[12px] border border-[rgba(0,0,0,0.06)] bg-white px-3 text-[14px] font-medium outline-none focus:border-[#050609]" />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#6F747A]">URL-имя (латиницей)</label>
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-[13px] font-semibold text-[#9EA3A8]">/school/</span>
                <input value={form.slug} onChange={(e) => handleSlugChange(e.target.value)} placeholder="moika-avto" className="h-10 flex-1 rounded-[12px] border border-[rgba(0,0,0,0.06)] bg-white px-3 text-[14px] font-medium outline-none focus:border-[#050609]" />
              </div>
              {slugError && <p className="mt-1 text-[11px] font-semibold text-[#E5534B]">{slugError}</p>}
              <p className="mt-1 text-[11px] font-semibold text-[#9EA3A8]">
                По этой ссылке ученики найдут вашу школу. Можно поменять, например: virazh, start-drive, avto-lider.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#6F747A]">Описание</label>
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Расскажите кратко о школе" rows={2} className="w-full resize-none rounded-[12px] border border-[rgba(0,0,0,0.06)] bg-white px-3 py-2 text-[14px] font-medium outline-none focus:border-[#050609]" />
            </div>
          </div>
        </div>

        {/* Contact info */}
        <div className="rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white px-3 py-3">
          <h2 className="text-[15px] font-black text-[#050609]">Контактная информация</h2>
          <div className="mt-3 space-y-2">
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#6F747A]">Телефон</label>
              <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+7 (495) 123-45-67" className="h-10 w-full rounded-[12px] border border-[rgba(0,0,0,0.06)] bg-white px-3 text-[14px] font-medium outline-none focus:border-[#050609]" />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#6F747A]">Email</label>
              <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="info@school.ru" type="email" className="h-10 w-full rounded-[12px] border border-[rgba(0,0,0,0.06)] bg-white px-3 text-[14px] font-medium outline-none focus:border-[#050609]" />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#6F747A]">Адрес</label>
              <input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="г. Москва, ул. Примерная, 1" className="h-10 w-full rounded-[12px] border border-[rgba(0,0,0,0.06)] bg-white px-3 text-[14px] font-medium outline-none focus:border-[#050609]" />
            </div>
          </div>
        </div>

        {/* Public page */}
        <div className="rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white px-3 py-3">
          <h2 className="text-[15px] font-black text-[#050609]">Публичная страница</h2>
          <div className="mt-3 space-y-3">
            <div className="rounded-[10px] bg-[#F8FAFC] px-3 py-2">
              <p className="text-[10px] font-bold text-[#9EA3A8]">Ссылка для учеников</p>
              <p className="mt-0.5 break-all text-[13px] font-black text-[#050609]">{publicUrl}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => void copyLink()} className="flex items-center gap-2 rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-white px-3 py-2 text-[12px] font-black text-[#050609]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                Копировать
              </button>
              <button onClick={() => window.open(publicUrl, '_blank')} className="flex items-center gap-2 rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-white px-3 py-2 text-[12px] font-black text-[#050609]">
                Открыть
              </button>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white px-3 py-3">
          <h2 className="text-[15px] font-black text-[#050609]">Категории обучения</h2>
          <p className="mt-0.5 text-[12px] font-semibold text-[#9EA3A8]">Выберите категории — ученики увидят только их</p>
          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {DRIVING_CATEGORIES.map((cat) => {
              const enabled = form.enabledCategoryCodes.includes(cat.code)
              return (
                <button key={cat.code} type="button" onClick={() => toggleCategory(cat.code)}
                  className={`rounded-[10px] border px-2 py-2 text-left transition ${enabled ? 'border-[#050609] bg-[#050609] text-white' : 'border-[rgba(0,0,0,0.06)] bg-white text-[#6F747A]'}`}>
                  <span className="text-[13px] font-black">{cat.code}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Rules */}
        <div className="rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white px-3 py-3">
          <h2 className="text-[15px] font-black text-[#050609]">Правила записи</h2>
          <div className="mt-3 space-y-3">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.bookingLimitEnabled} onChange={(e) => setForm((f) => ({ ...f, bookingLimitEnabled: e.target.checked }))} />
              <span className="text-[13px] font-semibold text-[#6F747A]">Ограничивать будущие записи</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[12px] font-semibold text-[#9EA3A8]">Макс. активных записей</p>
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
