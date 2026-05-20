import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Input, Textarea } from '../../components/ui/Input'
import { PageHeader } from '../../components/ui/PageHeader'
import { Section } from '../../components/ui/Section'
import { useToast } from '../../components/ui/Toast'
import { createSchool } from '../../services/schoolService'
import { db } from '../../services/storage'
import { SUPERADMIN_BASE_PATH } from '../../services/accessControl'
import { createSupabaseSchool } from '../../services/supabaseAdminService'
import { closeSupabaseStaffSession, openSupabaseStaffSession, upsertSupabaseSchoolStaffCredential } from '../../services/staffSessionService'

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Загрузите изображение.'))
      return
    }
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Не удалось прочитать файл.'))
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.readAsDataURL(file)
  })
}

function generateStaffPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const bytes = new Uint8Array(18)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')
}

export function SuperAdminSchoolNew() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    primaryColor: '#6658F5',
    logoUrl: '',
  })
  const [pending, setPending] = useState(false)

  async function handleCreate(): Promise<void> {
    if (pending) return
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
    }, { persist: false })

    if (!result.ok || !result.school) {
      showToast(result.error ?? 'Не удалось создать автошколу.', 'error')
      return
    }

    try {
      setPending(true)
      await createSupabaseSchool(result.school)
      const adminLogin = `${result.school.slug}-admin`
      const adminPassword = generateStaffPassword()
      const savedLogin = await upsertSupabaseSchoolStaffCredential({
        schoolId: result.school.id,
        login: adminLogin,
        password: adminPassword,
        staffName: result.school.name,
        isActive: true,
      })
      const session = await openSupabaseStaffSession('admin', savedLogin, adminPassword)
      if (session.staffContext?.schoolId !== result.school.id) {
        throw new Error('Доступ создался не для этой школы.')
      }
      await closeSupabaseStaffSession(session.staffContext.role, session.sessionToken)
      db.schools.upsert(result.school)
      sessionStorage.setItem(
        `dd:superadmin:created_access:${result.school.id}`,
        JSON.stringify({ login: savedLogin, password: adminPassword }),
      )
      showToast('Автошкола создана.', 'success')
      navigate(`${SUPERADMIN_BASE_PATH}/schools/${result.school.id}`, {
        state: { createdAccess: { login: savedLogin, password: adminPassword } },
      })
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось создать автошколу в Supabase.', 'error')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="max-w-6xl p-4 md:p-6">
      <PageHeader
        eyebrow="Платформа"
        title="Создать автошколу"
        description="Минимальная карточка tenant: название, slug, описание и брендовый акцент для white-label интерфейса."
      />

      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Section title="Данные школы" description="Эти поля можно уточнить позже в настройках школы. Сейчас важно создать понятный и управляемый tenant.">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Название" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            <Input label="Slug" value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value.trim().toLowerCase() }))} />
            <Input label="Основной цвет" value={form.primaryColor} onChange={(event) => setForm((current) => ({ ...current, primaryColor: event.target.value }))} />
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#38424D]">Логотип</span>
              <input
                type="file"
                accept="image/*"
                className="block w-full rounded-2xl border border-[#D7E2EC] bg-white px-4 py-3 text-sm font-semibold text-[#38424D] file:mr-3 file:rounded-xl file:border-0 file:bg-[#111827] file:px-3 file:py-2 file:text-sm file:font-bold file:text-white"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ''
                  if (!file) return
                  void fileToDataUrl(file)
                    .then((logoUrl) => setForm((current) => ({ ...current, logoUrl })))
                    .catch((error) => showToast(error instanceof Error ? error.message : 'Не удалось загрузить логотип.', 'error'))
                }}
              />
            </label>
          </div>
          <div className="mt-4">
            <Textarea label="Описание" rows={4} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Button onClick={handleCreate} disabled={pending}>{pending ? 'Создаём...' : 'Создать автошколу'}</Button>
            <Button variant="secondary" onClick={() => navigate(`${SUPERADMIN_BASE_PATH}/schools`)}>Назад</Button>
          </div>
        </Section>
        <div className="rounded-2xl border border-black/10 bg-white p-5">
          <p className="caption">White-label preview</p>
          <div className="mt-5 flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-bold text-white" style={{ backgroundColor: form.primaryColor || '#6658F5' }}>
              {form.logoUrl ? <img src={form.logoUrl} alt={form.name} className="h-full w-full rounded-2xl object-cover" /> : (form.name.slice(0, 2).toUpperCase() || 'DS')}
            </div>
            <div>
              <p className="text-lg font-bold text-[#111418]">{form.name || 'Новая автошкола'}</p>
              <p className="text-sm text-[#9EA3A8]">/{form.slug || 'school-slug'}</p>
            </div>
          </div>
          <p className="mt-5 text-sm leading-relaxed text-[#6F747A]">{form.description || 'Описание будет видно на публичной странице школы.'}</p>
          <div className="mt-5 rounded-2xl px-4 py-3 text-center text-sm font-bold text-white" style={{ backgroundColor: form.primaryColor || '#6658F5' }}>
            Личный кабинет
          </div>
        </div>
      </div>
    </div>
  )
}
