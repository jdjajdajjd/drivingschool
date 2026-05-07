import { Copy01Icon, LinkSquare02Icon, Refresh03Icon, Settings02Icon } from '@hugeicons/core-free-icons'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { createHugeIcon } from '../../components/ui/HugeIcon'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { StateView } from '../../components/ui/StateView'
import { Input, Textarea } from '../../components/ui/Input'
import { PageHeader } from '../../components/ui/PageHeader'
import { CompactSettingsSection, StickyBottomAction, WarningRow } from '../../components/ui/CompactAdmin'
import { useToast } from '../../components/ui/Toast'
import { formatDuration } from '../../lib/utils'
import { DRIVING_CATEGORIES } from '../../services/drivingCategories'

const Copy = createHugeIcon(Copy01Icon)
const ExternalLink = createHugeIcon(LinkSquare02Icon)
const RefreshCw = createHugeIcon(Refresh03Icon)
const Settings2 = createHugeIcon(Settings02Icon)
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
    slug: '',
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
    if (!school) {
      return
    }

    const instructorCategoryCodes = Array.from(new Set(db.instructors.bySchool(school.id).flatMap((instructor) => instructor.categories ?? [])))

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
      enabledCategoryCodes: school.enabledCategoryCodes?.length ? school.enabledCategoryCodes : instructorCategoryCodes,
    })
  }, [school?.id])

  const publicUrl = useMemo(() => `${window.location.origin}/school/${school?.slug ?? form.slug}`, [form.slug, school?.slug])
  const selectedCategories = DRIVING_CATEGORIES.filter((category) => form.enabledCategoryCodes.includes(category.code))
  const previewColor = validatePrimaryColor(form.primaryColor) ? form.primaryColor : '#1f5b43'

  async function copyPublicLink(): Promise<void> {
    await navigator.clipboard.writeText(publicUrl)
    showToast('Ссылка скопирована.', 'success')
  }

  function toggleCategory(code: string): void {
    setForm((current) => {
      const enabled = current.enabledCategoryCodes.includes(code)
      return {
        ...current,
        enabledCategoryCodes: enabled
          ? current.enabledCategoryCodes.filter((item) => item !== code)
          : [...current.enabledCategoryCodes, code],
      }
    })
  }

  async function handleSave(): Promise<void> {
    if (!school || saving) {
      return
    }

    if (!form.name.trim()) {
      showToast('Укажите название автошколы.', 'error')
      return
    }

    if (form.primaryColor && !validatePrimaryColor(form.primaryColor)) {
      showToast('Цвет должен быть в формате #RRGGBB.', 'error')
      return
    }

    if (form.maxActiveBookingsPerStudent < 1 || form.maxActiveBookingsPerStudent > 10) {
      showToast('Лимит записей должен быть целым числом от 1 до 10.', 'error')
      return
    }

    if (form.maxSlotsPerBooking < 1 || form.maxSlotsPerBooking > 6) {
      showToast('Лимит занятий за одну запись должен быть целым числом от 1 до 6.', 'error')
      return
    }

    if (!Number.isInteger(form.maxActiveBookingsPerStudent) || !Number.isInteger(form.maxSlotsPerBooking)) {
      showToast('Числовые лимиты должны быть целыми числами.', 'error')
      return
    }

    if (
      !Number.isInteger(form.defaultLessonDuration) ||
      form.defaultLessonDuration < 30 ||
      form.defaultLessonDuration > 240 ||
      form.defaultLessonDuration % 15 !== 0
    ) {
      showToast('Длительность занятия должна быть целым числом от 30 до 240 минут с шагом 15 минут.', 'error')
      return
    }

    if (form.enabledCategoryCodes.length === 0) {
      showToast('Выберите хотя бы одну категорию обучения.', 'error')
      return
    }

    try {
      setSaving(true)
      const result = await updateSchoolConfirmed(school.id, {
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

      if (!result.ok) {
        showToast(result.error ?? 'Не удалось сохранить настройки школы.', 'error')
        return
      }

      showToast('Настройки автошколы сохранены.', 'success')
      if (result.school?.slug !== school.slug) {
        navigate(`${ADMIN_BASE_PATH}/settings`, { replace: true })
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось сохранить настройки школы.', 'error')
    } finally {
      setSaving(false)
    }
  }

  function handleReset(): void {
    resetProductData()
    setResetOpen(false)
    showToast('Данные обновлены.', 'success')
    window.location.href = `${ADMIN_BASE_PATH}/settings`
  }

  if (!school) {
    return (
      <div className="max-w-7xl bg-[#E9EEF7] p-2.5 md:p-5">
        <StateView kind="error" title="Школа не найдена" description="Проверьте подключение данных школы." />
      </div>
    )
  }

  return (
    <div className="max-w-7xl bg-[#E9EEF7] p-2.5 md:p-5">
      <PageHeader
        eyebrow={school.name}
        title="Настройки"
        description="Данные школы, публичная страница и правила записи."
      />

      <div className="mt-3 space-y-3">
        <CompactSettingsSection title="Данные школы" description="Название, описание и внешний вид страницы.">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Название автошколы" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            <Input label="Адрес страницы" helperText="Адрес страницы управляется перед запуском и сейчас недоступен для изменения" value={school.slug} readOnly disabled />
            <Input label="Основной цвет" placeholder="#1f5b43" value={form.primaryColor} onChange={(event) => setForm((current) => ({ ...current, primaryColor: event.target.value }))} />
            <Input label="Logo URL" placeholder="https://..." value={form.logoUrl} onChange={(event) => setForm((current) => ({ ...current, logoUrl: event.target.value }))} />
          </div>
          <div className="mt-4">
            <Textarea label="Описание" rows={4} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          </div>
        </CompactSettingsSection>

        <CompactSettingsSection title="Публичная страница" description="Ссылка, кнопки и короткий preview.">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-3">
              <div className="rounded-[14px] border border-[#D8E0EC] bg-[#F8FAFE] px-3 py-2">
                <p className="caption">Ссылка</p>
                <p className="mt-1 break-all text-sm font-bold text-[#111827]">{publicUrl}</p>
              </div>
              <div className="flex flex-wrap gap-2">
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
              className="rounded-[16px] border border-[#D8E0EC] bg-white p-3"
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-[12px] text-sm font-semibold text-white"
                style={{ backgroundColor: previewColor }}
              >
                {form.logoUrl ? (
                  <img src={form.logoUrl} alt={form.name} className="h-full w-full rounded-[16px] object-cover" />
                ) : (
                  form.name.slice(0, 2).toUpperCase()
                )}
              </div>
              <p className="mt-2 text-[16px] font-bold text-[#111827]">{form.name || 'Автошкола'}</p>
              <p className="mt-1 line-clamp-3 text-sm leading-5 text-[#4B5A70]">
                {form.description || 'Описание школы будет показано на публичной странице записи.'}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(selectedCategories.length ? selectedCategories : DRIVING_CATEGORIES.slice(0, 1)).slice(0, 5).map((category) => (
                  <span key={category.code} className="rounded-[16px] bg-[#F8FAFE] px-3 py-1 text-xs font-bold text-[#4B5A70]">
                    {category.code}
                  </span>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1.5 text-center">
                <div className="rounded-[16px] bg-[#F8FAFE] px-3 py-3">
                  <p className="text-lg font-bold text-[#111827]">{db.branches.bySchool(school.id).filter((branch) => branch.isActive).length}</p>
                  <p className="text-xs text-[#667085]">филиала</p>
                </div>
                <div className="rounded-[16px] bg-[#F8FAFE] px-3 py-3">
                  <p className="text-lg font-bold text-[#111827]">{db.instructors.bySchool(school.id).filter((instructor) => instructor.isActive).length}</p>
                  <p className="text-xs text-[#667085]">инструкторов</p>
                </div>
              </div>
              <div className="mt-2 rounded-[12px] px-3 py-2 text-center text-sm font-semibold text-white" style={{ backgroundColor: previewColor }}>
                Войти ученику
              </div>
            </div>
          </div>
        </CompactSettingsSection>

        <CompactSettingsSection title="Категории прав" description="Что ученик видит при записи.">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {DRIVING_CATEGORIES.map((category) => {
              const enabled = form.enabledCategoryCodes.includes(category.code)
              return (
                <button
                  key={category.code}
                  type="button"
                  onClick={() => toggleCategory(category.code)}
                  className={`rounded-[12px] border px-3 py-2 text-left transition ${
                    enabled
                      ? 'rgba(246,184,77,0.20) rgba(246,184,77,0.12) text-[#111827]'
                      : 'border-[#D8E0EC] bg-white text-[#4B5A70] hover:rgba(246,184,77,0.20)'
                  }`}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-lg font-semibold">{category.code}</span>
                    <span className={`h-3 w-3 rounded-full ${enabled ? 'bg-accent' : 'bg-warm-border'}`} />
                  </span>
                  <span className="mt-1 block text-sm font-medium">{category.title}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-[#667085]">{category.description}</span>
                </button>
              )
            })}
          </div>
          {selectedCategories.length === 0 ? (
            <div className="mt-4 rounded-[16px] border border-warning-soft #FFFBEB px-4 py-3 text-sm text-amber-900">
              Выберите хотя бы одну категорию, иначе ученики не увидят варианты записи.
            </div>
          ) : null}
        </CompactSettingsSection>

        <CompactSettingsSection title="Правила записи" description="Лимиты, филиалы и длительность занятия.">
          <div className="grid gap-3 md:grid-cols-[260px_220px]">
            <label className="flex items-center gap-3 rounded-[16px] border border-[#D8E0EC] bg-[#F8FAFE] px-4 py-3 text-sm text-[#4B5A70]">
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
          <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
            <div>
              <p className="text-sm font-medium text-[#4B5A70]">Выбор филиала учеником</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {[
                  { value: 'student_choice' as const, title: 'Ученик выбирает филиал', text: 'Подходит, если школа работает в разных районах.' },
                  { value: 'fixed_first' as const, title: 'Прикрепить к одному филиалу', text: 'Публичная запись сразу покажет инструкторов первого филиала.' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, branchSelectionMode: option.value }))}
                    className={`rounded-[16px] border px-3 py-2.5 text-left transition ${
                      form.branchSelectionMode === option.value
                        ? 'border-accent rgba(246,184,77,0.12) text-[#111827]'
                        : 'border-[#D8E0EC] bg-white text-[#4B5A70] hover:rgba(246,184,77,0.20)'
                    }`}
                  >
                    <span className="block text-sm font-semibold">{option.title}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-[#667085]">{option.text}</span>
                  </button>
                ))}
              </div>
            </div>
            <Input
              label="Занятий за одну запись"
              helperText="Например: 2 — можно выбрать два времяа в один или разные дни"
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
        </CompactSettingsSection>

        <CompactSettingsSection title="Служебное" description="Для настройки стенда и восстановления тестовых данных.">
          <WarningRow>
            Это действие очищает локальный рабочий снимок и заново загружает стартовые данные. Не используйте во время реальной работы с учениками.
          </WarningRow>
          <div className="mt-3">
            <Button variant="danger" size="sm" onClick={() => setResetOpen(true)}>
              <RefreshCw size={15} />
              Обновить стартовые данные
            </Button>
          </div>
        </CompactSettingsSection>

        <StickyBottomAction>
          <Button className="w-full md:w-auto" onClick={() => void handleSave()} disabled={saving}>
            <Settings2 size={16} />
            {saving ? 'Сохраняем...' : 'Сохранить изменения'}
          </Button>
        </StickyBottomAction>
      </div>

      <ConfirmDialog
        open={resetOpen}
        title="Обновить стартовые данные"
        description="Текущий локальный снимок будет очищен, после чего стартовые данные школы создадутся заново."
        confirmLabel="Обновить данные"
        onClose={() => setResetOpen(false)}
        onConfirm={handleReset}
        danger
      />
    </div>
  )
}
