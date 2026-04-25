import { Copy, ExternalLink, RefreshCw, Settings2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input, Textarea } from '../../components/ui/Input'
import { PageHeader } from '../../components/ui/PageHeader'
import { Section } from '../../components/ui/Section'
import { useToast } from '../../components/ui/Toast'
import { formatDuration, hexToRgba } from '../../lib/utils'
import { BASE_FEATURES, BASE_MONTHLY_PRICE } from '../../services/modules'
import { performDemoReset, updateSchool, validatePrimaryColor, validateSchoolSlug } from '../../services/schoolService'
import { db } from '../../services/storage'

export function AdminSettings() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const school = db.schools.bySlug('virazh')
  const [resetOpen, setResetOpen] = useState(false)
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    primaryColor: '#1f5b43',
    logoUrl: '',
    bookingLimitEnabled: true,
    maxActiveBookingsPerStudent: 2,
    branchSelectionMode: 'student_choice' as 'student_choice' | 'fixed_first',
    maxSlotsPerBooking: 1,
    defaultLessonDuration: 90,
  })

  useEffect(() => {
    if (!school) {
      return
    }

    setForm({
      name: school.name,
      slug: school.slug,
      description: school.description,
      primaryColor: school.primaryColor ?? '#1f5b43',
      logoUrl: school.logoUrl ?? '',
      bookingLimitEnabled: school.bookingLimitEnabled ?? true,
      maxActiveBookingsPerStudent: school.maxActiveBookingsPerStudent ?? 2,
      branchSelectionMode: school.branchSelectionMode ?? 'student_choice',
      maxSlotsPerBooking: school.maxSlotsPerBooking ?? 1,
      defaultLessonDuration: school.defaultLessonDuration ?? 90,
    })
  }, [school])

  const publicUrl = useMemo(() => `${window.location.origin}/school/${form.slug}`, [form.slug])

  async function copyPublicLink(): Promise<void> {
    await navigator.clipboard.writeText(publicUrl)
    showToast('Ссылка скопирована.', 'success')
  }

  function handleSave(): void {
    if (!school) {
      return
    }

    if (!form.name.trim()) {
      showToast('Укажите название автошколы.', 'error')
      return
    }

    if (!validateSchoolSlug(form.slug.trim())) {
      showToast('Slug должен содержать только латиницу, цифры и дефис.', 'error')
      return
    }

    if (form.primaryColor && !validatePrimaryColor(form.primaryColor)) {
      showToast('Цвет должен быть в формате #RRGGBB.', 'error')
      return
    }

    if (form.maxActiveBookingsPerStudent < 1 || form.maxActiveBookingsPerStudent > 10) {
      showToast('Лимит записей должен быть от 1 до 10.', 'error')
      return
    }

    if (form.maxSlotsPerBooking < 1 || form.maxSlotsPerBooking > 6) {
      showToast('Лимит занятий за одну запись должен быть от 1 до 6.', 'error')
      return
    }

    if (form.defaultLessonDuration < 30 || form.defaultLessonDuration > 240) {
      showToast('Длительность занятия должна быть от 30 минут до 4 часов.', 'error')
      return
    }

    const result = updateSchool(school.id, {
      name: form.name,
      slug: form.slug,
      description: form.description,
      primaryColor: form.primaryColor,
      logoUrl: form.logoUrl,
      bookingLimitEnabled: form.bookingLimitEnabled,
      maxActiveBookingsPerStudent: form.maxActiveBookingsPerStudent,
      branchSelectionMode: form.branchSelectionMode,
      maxSlotsPerBooking: form.maxSlotsPerBooking,
      defaultLessonDuration: form.defaultLessonDuration,
    })

    if (!result.ok) {
      showToast(result.error ?? 'Не удалось сохранить настройки школы.', 'error')
      return
    }

    showToast('Настройки автошколы сохранены.', 'success')
    if (result.school?.slug !== school.slug) {
      navigate('/admin/settings', { replace: true })
    }
  }

  function handleReset(): void {
    performDemoReset()
    setResetOpen(false)
    showToast('Демо-данные сброшены и заново созданы.', 'success')
    window.location.href = '/admin/settings'
  }

  if (!school) {
    return (
      <div className="max-w-7xl p-6 md:p-8">
        <EmptyState title="Школа не найдена" description="Демо-данные не загружены." />
      </div>
    )
  }

  return (
    <div className="max-w-7xl p-6 md:p-8">
      <PageHeader
        eyebrow={school.name}
        title="Настройки"
        description="Основные данные школы, публичная страница, лимиты записи и демо-режим хранения данных в браузере."
        actions={
          <Button onClick={handleSave}>
            <Settings2 size={16} />
            Сохранить изменения
          </Button>
        }
      />

      <div className="mt-8 space-y-6">
        <Section title="Основное" description="Название, slug, описание и фирменные акценты школы.">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Название автошколы" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            <Input label="Slug" helperText="Только латиница, цифры и дефис" value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value.trim().toLowerCase() }))} />
            <Input label="Основной цвет" placeholder="#1f5b43" value={form.primaryColor} onChange={(event) => setForm((current) => ({ ...current, primaryColor: event.target.value }))} />
            <Input label="Logo URL" placeholder="https://..." value={form.logoUrl} onChange={(event) => setForm((current) => ({ ...current, logoUrl: event.target.value }))} />
          </div>
          <div className="mt-4">
            <Textarea label="Описание" rows={4} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          </div>
        </Section>

        <Section title="Публичная страница" description="Ссылка, preview и быстрые действия по странице записи.">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <div className="rounded-3xl border border-stone-100 bg-stone-50 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-stone-400">Ссылка</p>
                <p className="mt-2 break-all text-sm font-medium text-stone-900">{publicUrl}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" onClick={() => void copyPublicLink()}>
                  <Copy size={15} />
                  Скопировать ссылку
                </Button>
                <Button variant="secondary" onClick={() => window.open(publicUrl, '_blank')}>
                  <ExternalLink size={15} />
                  Открыть страницу
                </Button>
              </div>
            </div>

            <div
              className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-soft"
              style={{
                boxShadow: `0 18px 48px ${hexToRgba(form.primaryColor || '#1f5b43', 0.08)}`,
              }}
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-semibold text-white"
                style={{ backgroundColor: form.primaryColor || '#1f5b43' }}
              >
                {form.logoUrl ? (
                  <img src={form.logoUrl} alt={form.name} className="h-full w-full rounded-2xl object-cover" />
                ) : (
                  form.name.slice(0, 2).toUpperCase()
                )}
              </div>
              <p className="mt-4 text-lg font-semibold text-stone-900">{form.name || 'Автошкола'}</p>
              <p className="mt-2 text-sm leading-relaxed text-stone-500">
                {form.description || 'Описание школы будет показано на публичной странице записи.'}
              </p>
            </div>
          </div>
        </Section>

        <Section title="Ограничения записи" description="Действуют только на публичную запись. Администратор может управлять записями вручную.">
          <div className="grid gap-4 md:grid-cols-[260px_220px]">
            <label className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={form.bookingLimitEnabled}
                onChange={(event) => setForm((current) => ({ ...current, bookingLimitEnabled: event.target.checked }))}
              />
              Ограничивать число будущих записей
            </label>
            <Input
              label="Максимум активных записей"
              type="number"
              min={1}
              max={10}
              disabled={!form.bookingLimitEnabled}
              value={String(form.maxActiveBookingsPerStudent)}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  maxActiveBookingsPerStudent: Number(event.target.value || 1),
                }))
              }
            />
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
            <div>
              <p className="text-sm font-medium text-stone-700">Выбор филиала учеником</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {[
                  { value: 'student_choice' as const, title: 'Ученик выбирает филиал', text: 'Подходит, если школа работает в разных районах.' },
                  { value: 'fixed_first' as const, title: 'Прикрепить к одному филиалу', text: 'Публичная запись сразу покажет инструкторов первого филиала.' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, branchSelectionMode: option.value }))}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      form.branchSelectionMode === option.value
                        ? 'border-forest-600 bg-forest-50 text-stone-900'
                        : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                    }`}
                  >
                    <span className="block text-sm font-semibold">{option.title}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-stone-500">{option.text}</span>
                  </button>
                ))}
              </div>
            </div>
            <Input
              label="Занятий за одну запись"
              helperText="Например: 2 — можно выбрать два слота в один или разные дни"
              type="number"
              min={1}
              max={6}
              value={String(form.maxSlotsPerBooking)}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  maxSlotsPerBooking: Number(event.target.value || 1),
                }))
              }
            />
            <Input
              label="Длительность занятия"
              helperText={formatDuration(form.defaultLessonDuration)}
              type="number"
              min={30}
              max={240}
              step={15}
              value={String(form.defaultLessonDuration)}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  defaultLessonDuration: Number(event.target.value || 90),
                }))
              }
            />
          </div>
        </Section>

        <Section title="Базовый тариф" description="Без Start/Plus/Pro. Одна честная база и подключаемые модули.">
          <div className="rounded-3xl border border-stone-100 bg-stone-50 px-5 py-5">
            <p className="text-sm text-stone-500">База</p>
            <p className="mt-2 text-3xl font-semibold text-stone-900">
              {BASE_MONTHLY_PRICE.toLocaleString('ru-RU')} ₽<span className="ml-1 text-sm text-stone-400">/мес</span>
            </p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {BASE_FEATURES.map((feature) => (
              <div key={feature} className="rounded-2xl border border-stone-100 bg-white px-4 py-3 text-sm text-stone-600">
                {feature}
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Button variant="secondary" onClick={() => navigate('/admin/modules')}>
              Перейти в каталог модулей
            </Button>
          </div>
        </Section>

        <Section title="Демо-режим" description="Сейчас приложение работает в демо-режиме. Данные хранятся прямо в браузере.">
          <div className="rounded-3xl border border-amber-100 bg-amber-50 px-5 py-5 text-sm text-amber-900">
            Изменения сохраняются только локально в браузере. Сброс демо-данных очистит текущие данные проекта и заново создаст seed.
          </div>
          <div className="mt-4">
            <Button variant="danger" onClick={() => setResetOpen(true)}>
              <RefreshCw size={15} />
              Сбросить демо-данные
            </Button>
          </div>
        </Section>
      </div>

      <ConfirmDialog
        open={resetOpen}
        title="Сбросить демо-данные"
        description="Все текущие localStorage-данные проекта будут очищены, после чего демо-данные создадутся заново."
        confirmLabel="Сбросить данные"
        onClose={() => setResetOpen(false)}
        onConfirm={handleReset}
        danger
      />
    </div>
  )
}
