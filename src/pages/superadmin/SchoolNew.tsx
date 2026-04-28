import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Input, Textarea } from '../../components/ui/Input'
import { PageHeader } from '../../components/ui/PageHeader'
import { Section } from '../../components/ui/Section'
import { useToast } from '../../components/ui/Toast'
import { createSchool } from '../../services/schoolService'
import { SUPERADMIN_BASE_PATH } from '../../services/accessControl'

export function SuperAdminSchoolNew() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    primaryColor: '#1f5b43',
    logoUrl: '',
  })

  function handleCreate(): void {
    const result = createSchool({
      name: form.name,
      slug: form.slug,
      description: form.description,
      primaryColor: form.primaryColor,
      logoUrl: form.logoUrl,
      phone: '',
      email: '',
      address: '',
      bookingLimitEnabled: true,
      maxActiveBookingsPerStudent: 2,
      isActive: true,
    })

    if (!result.ok || !result.school) {
      showToast(result.error ?? 'Не удалось создать автошколу.', 'error')
      return
    }

    showToast('Автошкола создана.', 'success')
    navigate(`${SUPERADMIN_BASE_PATH}/schools/${result.school.id}`)
  }

  return (
    <div className="max-w-6xl p-4 md:p-6">
      <PageHeader
        eyebrow="Superadmin"
        title="Создать автошколу"
        description="Создайте новую автошколу для демо, расчёта стоимости и проверки продуктового сценария."
      />

      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Section title="Данные школы" description="Минимум полей, чтобы школа уже появилась в системе.">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Название" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            <Input label="Slug" value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value.trim().toLowerCase() }))} />
            <Input label="Основной цвет" value={form.primaryColor} onChange={(event) => setForm((current) => ({ ...current, primaryColor: event.target.value }))} />
            <Input label="Logo URL" value={form.logoUrl} onChange={(event) => setForm((current) => ({ ...current, logoUrl: event.target.value }))} />
          </div>
          <div className="mt-4">
            <Textarea label="Описание" rows={4} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Button onClick={handleCreate}>Создать автошколу</Button>
            <Button variant="secondary" onClick={() => navigate(`${SUPERADMIN_BASE_PATH}/schools`)}>Назад</Button>
          </div>
        </Section>
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-card">
          <p className="ui-kicker">White-label preview</p>
          <div className="mt-5 flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-black text-white" style={{ backgroundColor: form.primaryColor || '#2563EB' }}>
              {form.logoUrl ? <img src={form.logoUrl} alt={form.name} className="h-full w-full rounded-2xl object-cover" /> : (form.name.slice(0, 2).toUpperCase() || 'DS')}
            </div>
            <div>
              <p className="text-lg font-black text-ink-900">{form.name || 'Новая автошкола'}</p>
              <p className="text-sm text-slate-500">/{form.slug || 'school-slug'}</p>
            </div>
          </div>
          <p className="mt-5 text-sm leading-relaxed text-slate-600">{form.description || 'Описание будет видно на публичной странице школы и в потоке записи.'}</p>
          <div className="mt-5 rounded-2xl px-4 py-3 text-center text-sm font-black text-white" style={{ backgroundColor: form.primaryColor || '#2563EB' }}>
            Записаться на занятие
          </div>
        </div>
      </div>
    </div>
  )
}
