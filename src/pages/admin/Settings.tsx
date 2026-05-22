import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { OpenNewWindow, Link as LinkIcon, NavArrowRight as ChevronRight } from 'iconoir-react'
import { db } from '../../services/storage'
import { adminSettings, createCurrentStaffAuditEntry } from '../../services/adminStorage'
import type { SchoolSettings as SchoolSettingsType } from '../../types'
import { assertAdminPermission, canUseAdminPermission } from '../../services/adminAccess'
import { formatDuration } from '../../lib/utils'
import { updateSchoolConfirmed } from '../../services/schoolService'
import { getAdminBasePathForLocation } from '../../services/accessControl'

const LESSON_DURATION_OPTIONS = [45, 60, 90, 120]
const BOOKING_DAYS_OPTIONS = [7, 14, 21, 30]
const CANCEL_HOURS_OPTIONS = [2, 4, 6, 12, 24]

function plural(value: number, one: string, few: string, many: string): string {
  const mod10 = Math.abs(value) % 10
  const mod100 = Math.abs(value) % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

function SettingsListItem({ done, title, text, to }: { done: boolean; title: string; text: string; to: string }) {
  return (
    <Link to={to} className="v-settings-row">
      <span className="min-w-0">
        <strong className="block truncate text-[14px] font-semibold text-[#111827]">{title}</strong>
        <span className="mt-0.5 block truncate text-[12px] font-medium text-[#667085]">{text}</span>
      </span>
      <span className="v-settings-row-action">
        <span className={done ? 'v-settings-status is-done' : 'v-settings-status'}>{done ? 'Настроено' : 'Не настроено'}</span>
        <ChevronRight width={16} height={16} aria-hidden="true" />
      </span>
    </Link>
  )
}

export function AdminSettings() {
  const school = db.schools.currentAdmin()
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [copied, setCopied] = useState(false)
  const [schoolPhone, setSchoolPhone] = useState(school?.phone ?? '')
  const canManageSettings = canUseAdminPermission('settings.manage')
  const basePath = getAdminBasePathForLocation()

  const defaults: SchoolSettingsType = useMemo(() => {
    if (!school) return { schoolId: '', defaultLessonDuration: 90, maxDaysAheadForBooking: 14, minHoursBeforeCancel: 4, maxActiveBookingsPerStudent: 2, allowBookingWithDebt: true, allowBookingWithoutMedical: true, allowBookingWithoutContract: true, requireManualModeration: false, allowChangeInstructor: true, allowStudentChooseInstructor: true, allowDifferentInstructors: true, maxLessonsPerDay: 2, maxLessonsPerWeek: 6, breakBetweenLessons: 15, workDays: [1, 2, 3, 4, 5, 6], workStartHour: 8, workEndHour: 20, defaultPricingPlans: [], blockBookingOnDebt: false, debtGracePeriodDays: 7, notifyAdminOnNoShow: true, notifyAdminOnCancel: true, notifyAdminOnNewBooking: true, notifyAdminOnDebt: false, requiredDocuments: [], documentExpiryWarningDays: 14 }
    return adminSettings.get(school.id)
  }, [school?.id])

  const [settings, setSettings] = useState<SchoolSettingsType>(defaults)
  const update = (key: keyof SchoolSettingsType, value: unknown) => setSettings((current) => ({ ...current, [key]: value }))

  if (!school) return null

  const instructors = db.instructors.bySchool(school.id)
  const activeInstructors = instructors.filter((item) => item.isActive)
  const branches = db.branches.bySchool(school.id)
  const freeSlots = db.slots.bySchool(school.id).filter((slot) => slot.status === 'available' && new Date(`${slot.date}T${slot.time}:00`) > new Date())
  const publicUrl = `${window.location.origin}/school/${school.slug}`
  const setupItems = [
    { done: activeInstructors.length > 0, title: 'Инструкторы', text: activeInstructors.length ? `${activeInstructors.length} ${plural(activeInstructors.length, 'инструктор активен', 'инструктора активны', 'инструкторов активны')}` : 'Не настроено', to: `${basePath}/instructors` },
    { done: settings.workStartHour < settings.workEndHour && branches.length > 0, title: 'Рабочие часы', text: `${settings.workStartHour}:00–${settings.workEndHour}:00 · ${branches.length || 'нет'} ${plural(branches.length, 'филиал', 'филиала', 'филиалов')}`, to: `${basePath}/settings` },
    { done: freeSlots.length > 0, title: 'Типы занятий', text: `По умолчанию: ${formatDuration(settings.defaultLessonDuration)}`, to: `${basePath}/schedule?create=slot` },
    { done: true, title: 'Ссылка для учеников', text: 'Готова', to: `/school/${school.slug}` },
  ]

  const copyPublicUrl = async () => {
    try {
      await navigator.clipboard?.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  const handleSave = async () => {
    const access = assertAdminPermission('settings.manage')
    if (!access.ok || !school || saving) return
    setSaving(true)
    setSaveError('')
    const schoolResult = await updateSchoolConfirmed(school.id, {
      name: school.name,
      slug: school.slug,
      description: school.description,
      phone: schoolPhone.trim(),
      email: school.email,
      address: school.address,
      primaryColor: school.primaryColor,
      logoUrl: school.logoUrl,
      bookingLimitEnabled: true,
      maxActiveBookingsPerStudent: settings.maxActiveBookingsPerStudent,
      branchSelectionMode: school.branchSelectionMode,
      maxSlotsPerBooking: school.maxSlotsPerBooking,
      defaultLessonDuration: settings.defaultLessonDuration,
      enabledCategoryCodes: school.enabledCategoryCodes,
      isActive: school.isActive,
    })
    if (!schoolResult.ok) {
      setSaving(false)
      setSaveError(schoolResult.error ?? 'Не удалось сохранить настройки школы.')
      return
    }
    try {
      await adminSettings.saveConfirmed(settings)
      createCurrentStaffAuditEntry(school.id, 'settings_changed', 'school_settings', school.id, 'Изменены настройки записи')
      setSaved(true)
      setTimeout(() => setSaved(false), 1800)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Не удалось сохранить правила записи.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-full overflow-y-auto bg-[#F5F7FA] pb-24 md:pb-6 vroom-settings-minimal">
      <div className="v-admin-toolbar mx-3 mt-3 md:mx-5 md:mt-5">
        <div className="min-w-0">
          <h1 className="v-admin-heading">Настройки</h1>
        </div>
        <button type="button" onClick={() => void handleSave()} disabled={!canManageSettings || saving} className="v-admin-button is-blue min-h-11 px-5 disabled:cursor-not-allowed disabled:opacity-50">
          {saving ? 'Сохраняем…' : saved ? 'Сохранено' : 'Сохранить'}
        </button>
      </div>

      <div className="mx-auto max-w-5xl space-y-3 p-3 md:p-5 lg:p-6">
        {saveError ? <div aria-live="polite" className="rounded-[18px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[13px] font-semibold text-[#B42318]">{saveError}</div> : null}

        <section className="v-admin-panel p-4 md:p-5">
          <h2 className="text-[18px] font-semibold text-[#111827]">Настройки</h2>
          <div className="v-settings-list mt-3">
            {setupItems.map((item) => <SettingsListItem key={item.title} {...item} />)}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="v-admin-panel p-4 md:p-5">
            <h2 className="text-[18px] font-semibold text-[#111827]">Правила записи</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-medium text-[#667085]">Телефон школы</span>
                <input name="school-phone" type="tel" inputMode="tel" autoComplete="tel" value={schoolPhone} onChange={(event) => setSchoolPhone(event.target.value)} disabled={!canManageSettings} className="v-admin-input w-full" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-medium text-[#667085]">Длительность занятия</span>
                <select name="default-lesson-duration" autoComplete="off" value={settings.defaultLessonDuration} onChange={(event) => update('defaultLessonDuration', Number(event.target.value))} className="v-admin-input w-full">
                  {LESSON_DURATION_OPTIONS.map((value) => <option key={value} value={value}>{formatDuration(value)}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-medium text-[#667085]">Запись вперед</span>
                <select name="max-days-ahead" autoComplete="off" value={settings.maxDaysAheadForBooking} onChange={(event) => update('maxDaysAheadForBooking', Number(event.target.value))} className="v-admin-input w-full">
                  {BOOKING_DAYS_OPTIONS.map((value) => <option key={value} value={value}>{value} дней</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-medium text-[#667085]">Отмена не позднее</span>
                <select name="min-hours-before-cancel" autoComplete="off" value={settings.minHoursBeforeCancel} onChange={(event) => update('minHoursBeforeCancel', Number(event.target.value))} className="v-admin-input w-full">
                  {CANCEL_HOURS_OPTIONS.map((value) => <option key={value} value={value}>{value} ч</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-medium text-[#667085]">Начало рабочего дня</span>
                <input type="number" name="work-start-hour" inputMode="numeric" autoComplete="off" min={0} max={23} value={settings.workStartHour} onChange={(event) => update('workStartHour', Number(event.target.value))} className="v-admin-input w-full" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-medium text-[#667085]">Конец рабочего дня</span>
                <input type="number" name="work-end-hour" inputMode="numeric" autoComplete="off" min={0} max={23} value={settings.workEndHour} onChange={(event) => update('workEndHour', Number(event.target.value))} className="v-admin-input w-full" />
              </label>
            </div>
            <div className="mt-4">
              <span className="mb-2 block text-[13px] font-medium text-[#667085]">Рабочие дни</span>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                {['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'].map((day, index) => {
                  const active = settings.workDays.includes(index)
                  return (
                    <button key={day} type="button" onClick={() => update('workDays', active ? settings.workDays.filter((item) => item !== index) : [...settings.workDays, index])} className={`h-10 rounded-xl text-[13px] font-medium transition ${active ? 'bg-[#0A84FF] text-white' : 'border border-[#D7DEE8] bg-[#F8FAFC] text-[#667085]'}`}>{day}</button>
                  )
                })}
              </div>
            </div>
          </div>

          <aside className="v-admin-panel p-4 md:p-5">
            <h2 className="text-[18px] font-semibold text-[#111827]">Ссылка для учеников</h2>
            <div className="mt-4 rounded-[16px] border border-[#D7E2EC] bg-[#F8FAFC] px-3 py-2 text-[13px] font-semibold text-[#111827] break-all">{publicUrl}</div>
            <div className="mt-3 grid gap-2">
              <button type="button" onClick={() => void copyPublicUrl()} className="v-admin-button-secondary justify-center"><LinkIcon width={16} height={16} aria-hidden="true" />{copied ? 'Скопировано' : 'Скопировать ссылку'}</button>
              <Link to={`/school/${school.slug}`} target="_blank" className="v-admin-button-tertiary justify-center"><OpenNewWindow width={16} height={16} aria-hidden="true" />Открыть страницу</Link>
            </div>
          </aside>
        </section>

      </div>
    </div>
  )
}
