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
    <div className="max-w-5xl p-6 md:p-8">
      <PageHeader
        eyebrow="Superadmin"
        title="Создать автошколу"
        description="Создайте новую автошколу для демо, расчёта стоимости и проверки продуктового сценария."
      />

      <div className="mt-8">
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
          <div className="mt-4 flex gap-3">
            <Button onClick={handleCreate}>Создать автошколу</Button>
            <Button variant="secondary" onClick={() => navigate(`${SUPERADMIN_BASE_PATH}/schools`)}>Назад</Button>
          </div>
        </Section>
      </div>
    </div>
  )
}
