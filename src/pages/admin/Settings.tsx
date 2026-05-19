import { useState, useMemo } from 'react'
import { db } from '../../services/storage'
import { adminSettings, createCurrentStaffAuditEntry } from '../../services/adminStorage'
import type { SchoolSettings as SchoolSettingsType } from '../../types'
import { assertAdminPermission, canUseAdminPermission } from '../../services/adminAccess'

const launchSteps = [
  'Заполнить филиалы, инструкторов и рабочие часы.',
  'Импортировать учеников из CSV на странице «Ученики».',
  'Создать свободные окна минимум на 7 дней вперёд.',
  'Проверить публичную ссылку школы и тестовую запись ученика.',
  'Назначить ответственного администратора и включить уведомления.',
]

const operationRules = [
  'Оплата 4 990 ₽/мес принимается вручную переводом; доступ продлевается после подтверждения оплаты.',
  'Резервное копирование Supabase и проверка /api/health выполняются перед массовой рассылкой.',
  'При инциденте P1: остановить новые подключения, сохранить скрин/время, проверить Supabase и последние изменения.',
]

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
    <div className="min-h-full overflow-y-auto bg-[#F5F7FA] pb-24 md:pb-6">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#E5EAF1] bg-white/95 px-4 py-3 backdrop-blur md:px-6">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#667085]">правила работы</p>
          <h1 className="truncate text-[24px] font-black tracking-[-0.03em] text-[#111827]">Настройки школы</h1>
        </div>
        <button onClick={handleSave} disabled={!canManageSettings} className="v-admin-button min-h-11 px-5 disabled:cursor-not-allowed disabled:opacity-50">
          {saved ? '✓ Сохранено' : 'Сохранить'}
        </button>
      </div>

      <div className="mx-auto max-w-5xl space-y-4 p-3 md:p-6 lg:p-8">
        <section className="rounded-[18px] border border-[#D7DEE8] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)] md:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-[12px] font-black uppercase tracking-[0.12em] text-[#315A7C]">Запуск школы</p>
              <h2 className="mt-2 text-[20px] font-black text-gray-900">Чеклист внедрения за 1-3 дня</h2>
              <p className="mt-2 max-w-[620px] text-[14px] font-semibold leading-6 text-gray-600">
                Этот блок закрывает подключение первой реальной автошколы: данные, расписание, тестовая запись, уведомления и операционный контроль.
              </p>
            </div>
            <span className="rounded-full bg-[#EEF8F1] px-3 py-1.5 text-[12px] font-black text-[#2F6E4B]">готово к пилоту</span>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-2">
              {launchSteps.map((step, index) => (
                <div key={step} className="flex gap-3 rounded-xl bg-[#F8FBFE] p-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-[12px] font-black text-[#315A7C] shadow-sm">{index + 1}</span>
                  <span className="text-[13px] font-semibold leading-5 text-gray-700">{step}</span>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-[#E1EAF2] bg-[#F8FBFE] p-4">
              <h3 className="text-[14px] font-black text-gray-900">Операционные правила</h3>
              <div className="mt-3 space-y-3">
                {operationRules.map((rule) => (
                  <p key={rule} className="text-[13px] font-semibold leading-5 text-gray-600">{rule}</p>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* General */}
        <section className="rounded-[18px] border border-[#D7DEE8] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)] md:p-5">
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
        <section className="rounded-[18px] border border-[#D7DEE8] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)] md:p-5">
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

          <div className="mt-4 grid gap-2 md:grid-cols-2">
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
              <label key={opt.key} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-[#E5EAF1] bg-[#F8FAFC] p-3">
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
        <section className="rounded-[18px] border border-[#D7DEE8] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)] md:p-5">
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
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'].map((day, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const days = settings.workDays.includes(i) ? settings.workDays.filter((d) => d !== i) : [...settings.workDays, i]
                    update('workDays', days)
                  }}
                  className={`h-10 rounded-xl text-[13px] font-semibold transition ${
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
        <section className="rounded-[18px] border border-[#D7DEE8] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)] md:p-5">
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
