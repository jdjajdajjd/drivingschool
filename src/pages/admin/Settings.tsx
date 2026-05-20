import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { OpenNewWindow, UserBadgeCheck, Building, Clock, CalendarPlus, Link as LinkIcon } from 'iconoir-react'
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

function SetupCard({ done, index, title, text, to }: { done: boolean; index: number; title: string; text: string; to: string }) {
  return (
    <Link to={to} className={`rounded-[20px] border p-4 transition hover:-translate-y-0.5 ${done ? 'border-[rgba(52,199,89,0.20)] bg-[#F1FAF4]' : 'border-[#D7E2EC] bg-white'}`}>
      <span className={`grid h-8 w-8 place-items-center rounded-full text-[13px] font-semibold ${done ? 'bg-[#188447] text-white' : 'bg-[#EAF4FF] text-[#075EBC]'}`}>{done ? '✓' : index}</span>
      <strong className="mt-4 block text-[15px] font-semibold text-[#111827]">{title}</strong>
      <span className="mt-1 block text-[13px] font-medium leading-5 text-[#667085]">{text}</span>
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
    { done: activeInstructors.length > 0, title: 'Добавьте инструктора', text: activeInstructors.length ? `${activeInstructors.length} ${plural(activeInstructors.length, 'инструктор активен', 'инструктора активны', 'инструкторов активны')}` : 'Без инструктора ученикам нечего выбирать.', to: `${basePath}/instructors` },
    { done: branches.length > 0, title: 'Укажите филиал', text: branches.length ? `${branches.length} ${plural(branches.length, 'филиал', 'филиала', 'филиалов')} в базе` : 'Нужно место, где проходит занятие.', to: `${basePath}/branches` },
    { done: freeSlots.length > 0, title: 'Создайте свободные окна', text: freeSlots.length ? `${freeSlots.length} окон доступно ученикам` : 'Окна появляются на публичной странице.', to: `${basePath}/schedule?create=slot` },
    { done: true, title: 'Отправьте ссылку ученикам', text: 'Ученик сам выберет дату и время.', to: `/school/${school.slug}` },
  ]
  const doneCount = setupItems.filter((item) => item.done).length
  const setupDone = doneCount === setupItems.length

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
    <div className="min-h-full overflow-y-auto bg-[#F5F7FA] pb-24 md:pb-6">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#E5EAF1] bg-white/95 px-4 py-3 backdrop-blur md:px-6">
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-[#667085]">Что нужно, чтобы ученики записывались сами</p>
          <h1 className="truncate text-[24px] font-semibold text-[#111827]">Настройки записи</h1>
        </div>
        <button type="button" onClick={() => void handleSave()} disabled={!canManageSettings || saving} className="v-admin-button is-blue min-h-11 px-5 disabled:cursor-not-allowed disabled:opacity-50">
          {saving ? 'Сохраняем…' : saved ? 'Сохранено' : 'Сохранить'}
        </button>
      </div>

      <div className="mx-auto max-w-5xl space-y-4 p-3 md:p-6 lg:p-8">
        {saveError ? <div aria-live="polite" className="rounded-[18px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[13px] font-semibold text-[#B42318]">{saveError}</div> : null}

        <section className="rounded-[24px] border border-[#D7DEE8] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)] md:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className={`v-admin-pill ${setupDone ? 'v-tone-ok' : 'v-tone-info'}`}>Настройка {doneCount}/{setupItems.length}</span>
              <h2 className="mt-3 text-[20px] font-semibold text-[#111827]">Базовый запуск записи</h2>
              <p className="mt-1 max-w-2xl text-[14px] font-medium leading-6 text-[#667085]">После этих шагов школа может отправить ссылку ученикам, а записи будут появляться в расписании.</p>
            </div>
            <Link to={`${basePath}/schedule?create=slot`} className="v-admin-button-secondary justify-center">
              <CalendarPlus width={16} height={16} aria-hidden="true" />
              Создать окна
            </Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {setupItems.map((item, index) => <SetupCard key={item.title} index={index + 1} {...item} />)}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-[24px] border border-[#D7DEE8] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)] md:p-5">
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

          <aside className="rounded-[24px] border border-[#D7DEE8] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)] md:p-5">
            <h2 className="text-[18px] font-semibold text-[#111827]">Ссылка для учеников</h2>
            <p className="mt-1 text-[13px] font-medium leading-5 text-[#667085]">Отправьте ее в чат ученику. Он выберет дату и время с телефона.</p>
            <div className="mt-4 rounded-[16px] border border-[#D7E2EC] bg-[#F8FAFC] px-3 py-2 text-[13px] font-semibold text-[#111827] break-all">{publicUrl}</div>
            <div className="mt-3 grid gap-2">
              <button type="button" onClick={() => void copyPublicUrl()} className="v-admin-button-secondary justify-center"><LinkIcon width={16} height={16} aria-hidden="true" />{copied ? 'Скопировано' : 'Скопировать ссылку'}</button>
              <Link to={`/school/${school.slug}`} target="_blank" className="v-admin-button-tertiary justify-center"><OpenNewWindow width={16} height={16} aria-hidden="true" />Открыть страницу</Link>
            </div>
          </aside>
        </section>

        <section className="rounded-[24px] border border-[#D7DEE8] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)] md:p-5">
          <h2 className="text-[18px] font-semibold text-[#111827]">База для записи</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Link to={`${basePath}/instructors`} className="v-admin-button-secondary min-h-14 justify-start"><UserBadgeCheck width={18} height={18} aria-hidden="true" />Инструкторы</Link>
            <Link to={`${basePath}/branches`} className="v-admin-button-secondary min-h-14 justify-start"><Building width={18} height={18} aria-hidden="true" />Филиалы</Link>
            <Link to={`${basePath}/schedule`} className="v-admin-button-secondary min-h-14 justify-start"><Clock width={18} height={18} aria-hidden="true" />Расписание</Link>
          </div>
        </section>
      </div>
    </div>
  )
}
