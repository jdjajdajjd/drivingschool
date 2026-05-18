import { useState, useMemo } from 'react'
import { db } from '../../services/storage'
import { adminSettings, createCurrentStaffAuditEntry } from '../../services/adminStorage'
import type { SchoolSettings as SchoolSettingsType } from '../../types'
import { assertAdminPermission, canUseAdminPermission } from '../../services/adminAccess'

export function AdminSettings() {
  const school = db.schools.currentAdmin()
  const [saved, setSaved] = useState(false)
  const [schoolPhone, setSchoolPhone] = useState(school?.phone ?? '')
  const canManageSettings = canUseAdminPermission('settings.manage')

  const defaults: SchoolSettingsType = useMemo(() => {
    if (!school) return { schoolId: '', defaultLessonDuration: 60, maxDaysAheadForBooking: 14, minHoursBeforeCancel: 4, maxActiveBookingsPerStudent: 3, allowBookingWithDebt: false, allowBookingWithoutMedical: false, allowBookingWithoutContract: false, requireManualModeration: false, allowChangeInstructor: true, allowStudentChooseInstructor: true, allowDifferentInstructors: true, maxLessonsPerDay: 2, maxLessonsPerWeek: 6, breakBetweenLessons: 15, workDays: [1, 2, 3, 4, 5], workStartHour: 8, workEndHour: 20, defaultPricingPlans: [], blockBookingOnDebt: true, debtGracePeriodDays: 7, notifyAdminOnNoShow: true, notifyAdminOnCancel: true, notifyAdminOnNewBooking: true, notifyAdminOnDebt: true, requiredDocuments: [], documentExpiryWarningDays: 14 }
    return adminSettings.get(school.id)
  }, [school?.id])

  const [settings, setSettings] = useState<SchoolSettingsType>(defaults)

  const update = (key: keyof SchoolSettingsType, value: unknown) => {
    setSettings((s) => ({ ...s, [key]: value }))
  }

  const handleSave = () => {
    const access = assertAdminPermission('settings.manage')
    if (!access.ok || !school) return

    db.schools.upsert({ ...school, phone: schoolPhone.trim() })
    adminSettings.save(settings)
    createCurrentStaffAuditEntry(school.id, 'settings_changed', 'school_settings', school.id, 'Изменены настройки школы')
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!school) return null

  return (
    <div className="overflow-y-auto">
      <div className="flex items-center justify-between border-b border-gray-100 bg-white px-4 py-4 md:px-6">
        <h1 className="text-[24px] font-black text-gray-900">Настройки школы</h1>
        <button onClick={handleSave} disabled={!canManageSettings} className="v-admin-button px-5 disabled:cursor-not-allowed disabled:opacity-50">
          {saved ? '✓ Сохранено' : 'Сохранить'}
        </button>
      </div>

      <div className="max-w-3xl space-y-6 p-4 md:p-6 lg:p-8">
        {/* General */}
        <section className="rounded-2xl border border-gray-100 bg-white p-5">
          <h2 className="mb-4 text-[16px] font-bold text-gray-900">Общие настройки</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-gray-600">Название школы</label>
              <input value={school.name} readOnly className="w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-[14px] font-semibold text-gray-400" />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-gray-600">Телефон</label>
              <input value={schoolPhone} onChange={(e) => setSchoolPhone(e.target.value)} disabled={!canManageSettings} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-[14px] font-semibold text-gray-900 disabled:cursor-not-allowed disabled:text-gray-400" />
            </div>
          </div>
        </section>

        {/* Lesson rules */}
        <section className="rounded-2xl border border-gray-100 bg-white p-5">
          <h2 className="mb-4 text-[16px] font-bold text-gray-900">Правила записи</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-gray-600">Длительность занятия (мин)</label>
              <input type="number" value={settings.defaultLessonDuration} onChange={(e) => update('defaultLessonDuration', parseInt(e.target.value))} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-[14px] font-semibold text-gray-900" />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-gray-600">Запись на сколько дней вперёд</label>
              <input type="number" value={settings.maxDaysAheadForBooking} onChange={(e) => update('maxDaysAheadForBooking', parseInt(e.target.value))} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-[14px] font-semibold text-gray-900" />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-gray-600">Мин. часов до отмены</label>
              <input type="number" value={settings.minHoursBeforeCancel} onChange={(e) => update('minHoursBeforeCancel', parseInt(e.target.value))} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-[14px] font-semibold text-gray-900" />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-gray-600">Макс. записей на ученика</label>
              <input type="number" value={settings.maxActiveBookingsPerStudent} onChange={(e) => update('maxActiveBookingsPerStudent', parseInt(e.target.value))} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-[14px] font-semibold text-gray-900" />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-gray-600">Занятий в день макс.</label>
              <input type="number" value={settings.maxLessonsPerDay} onChange={(e) => update('maxLessonsPerDay', parseInt(e.target.value))} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-[14px] font-semibold text-gray-900" />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-gray-600">Перерыв между (мин)</label>
              <input type="number" value={settings.breakBetweenLessons} onChange={(e) => update('breakBetweenLessons', parseInt(e.target.value))} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-[14px] font-semibold text-gray-900" />
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {[
              { key: 'allowBookingWithDebt', label: 'Разрешить запись при долге' },
              { key: 'allowBookingWithoutMedical', label: 'Разрешить запись без медсправки' },
              { key: 'allowBookingWithoutContract', label: 'Разрешить запись без договора' },
              { key: 'requireManualModeration', label: 'Ручная модерация записей' },
              { key: 'allowStudentChooseInstructor', label: 'Ученик может выбрать инструктора' },
              { key: 'blockBookingOnDebt', label: 'Блокировать запись при долге' },
              { key: 'notifyAdminOnNoShow', label: 'Уведомлять о неявке' },
              { key: 'notifyAdminOnCancel', label: 'Уведомлять об отмене' },
              { key: 'notifyAdminOnNewBooking', label: 'Уведомлять о новой записи' },
            ].map((opt) => (
              <label key={opt.key} className="flex cursor-pointer items-center gap-3 rounded-xl bg-gray-50 p-3">
                <input
                  type="checkbox"
                  checked={Boolean((settings as unknown as Record<string, unknown>)[opt.key])}
                  onChange={(e) => update(opt.key as keyof SchoolSettingsType, e.target.checked)}
                  className="h-5 w-5 rounded border-gray-300"
                />
                <span className="text-[14px] font-semibold text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Work hours */}
        <section className="rounded-2xl border border-gray-100 bg-white p-5">
          <h2 className="mb-4 text-[16px] font-bold text-gray-900">Рабочие часы</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-gray-600">Начало работы</label>
              <input type="number" min={0} max={23} value={settings.workStartHour} onChange={(e) => update('workStartHour', parseInt(e.target.value))} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-[14px] font-semibold text-gray-900" />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-gray-600">Конец работы</label>
              <input type="number" min={0} max={23} value={settings.workEndHour} onChange={(e) => update('workEndHour', parseInt(e.target.value))} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-[14px] font-semibold text-gray-900" />
            </div>
          </div>
          <div className="mt-4">
            <label className="mb-2 block text-[13px] font-semibold text-gray-600">Рабочие дни</label>
            <div className="flex gap-2">
              {['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'].map((day, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const days = settings.workDays.includes(i) ? settings.workDays.filter((d) => d !== i) : [...settings.workDays, i]
                    update('workDays', days)
                  }}
                  className={`h-10 w-12 rounded-xl text-[13px] font-semibold transition ${
                    settings.workDays.includes(i) ? 'bg-[#111827] text-white' : 'border border-gray-200 bg-gray-50 text-gray-500'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Debt */}
        <section className="rounded-2xl border border-gray-100 bg-white p-5">
          <h2 className="mb-4 text-[16px] font-bold text-gray-900">Финансы и долги</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-gray-600">Дней отсрочки по долгу</label>
              <input type="number" value={settings.debtGracePeriodDays} onChange={(e) => update('debtGracePeriodDays', parseInt(e.target.value))} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-[14px] font-semibold text-gray-900" />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
