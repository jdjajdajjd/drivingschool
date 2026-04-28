import { addDays, isAfter, isSameDay } from 'date-fns'
import { AlertTriangle, BarChart3, Building2, CalendarDays, Puzzle, RefreshCw } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { Section } from '../components/ui/Section'
import { StatCard } from '../components/ui/StatCard'
import { EmptyState } from '../components/ui/EmptyState'
import { Button } from '../components/ui/Button'
import { formatPrice } from '../lib/utils'
import { getBillingSummary } from '../services/modules'
import { performDemoReset } from '../services/schoolService'
import { db } from '../services/storage'
import { validateDataIntegrity } from '../services/integrityService'
import { SUPERADMIN_BASE_PATH } from '../services/accessControl'

export function SuperAdminOverview() {
  const schools = db.schools.all()
  const today = new Date()
  const sevenDaysAhead = addDays(today, 7)

  const metrics = schools.map((school) => {
    const billing = getBillingSummary(school.id)
    const todayBookings = db.bookings.bySchool(school.id).filter((booking) => {
      const slot = db.slots.byId(booking.slotId)
      return slot ? isSameDay(new Date(`${slot.date}T${slot.time}:00`), today) : false
    }).length

    const noSlots = db.slots
      .bySchool(school.id)
      .filter((slot) => slot.status === 'available')
      .filter((slot) => {
        const startsAt = new Date(`${slot.date}T${slot.time}:00`)
        return isAfter(startsAt, today) && startsAt <= sevenDaysAhead
      }).length === 0

    const warnings = validateDataIntegrity(school.id)
    return {
      school,
      billing,
      todayBookings,
      noSlots,
      warnings,
      enabledModules: db.schoolModules.bySchool(school.id).filter((item) => item.status === 'enabled').length,
    }
  })

  const activeSchools = schools.filter((school) => school.isActive !== false)
  const todayBookingsTotal = metrics.reduce((sum, item) => sum + item.todayBookings, 0)
  const mrr = metrics
    .filter((item) => item.school.isActive !== false)
    .reduce((sum, item) => sum + item.billing.totalMonthlyPrice, 0)
  const enabledModulesTotal = metrics.reduce((sum, item) => sum + item.enabledModules, 0)
  const schoolsWithoutSlots = metrics.filter((item) => item.noSlots).length
  const schoolsWithWarnings = metrics.filter((item) => item.warnings.length > 0).length

  return (
    <div className="max-w-7xl p-4 md:p-6">
      <PageHeader
        eyebrow="DriveDesk"
        title="Superadmin"
        description="Обзор по всем автошколам, их стоимости, загрузке и важным сигналам в демо-режиме."
        actions={
          <Button
            variant="secondary"
            onClick={() => {
              performDemoReset()
              window.location.href = SUPERADMIN_BASE_PATH
            }}
          >
            <RefreshCw size={15} />
            Сбросить демо-данные
          </Button>
        }
      />

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Всего автошкол" value={schools.length} icon={<Building2 size={18} />} />
        <StatCard label="Активных автошкол" value={activeSchools.length} icon={<Building2 size={18} />} />
        <StatCard label="Записей сегодня" value={todayBookingsTotal} icon={<CalendarDays size={18} />} />
        <StatCard label="Оценка MRR в демо" value={formatPrice(mrr)} icon={<BarChart3 size={18} />} />
        <StatCard label="Подключённых модулей" value={enabledModulesTotal} icon={<Puzzle size={18} />} />
        <StatCard label="Школ без свободных слотов на 7 дней" value={schoolsWithoutSlots} icon={<AlertTriangle size={18} />} />
        <StatCard label="Школ с предупреждениями" value={schoolsWithWarnings} icon={<AlertTriangle size={18} />} />
      </div>

      <div className="mt-6">
        <Section title="Сигналы по школам" description="Куда смотреть в первую очередь, если демо-данные выглядят проблемно.">
          {metrics.length === 0 ? (
            <EmptyState title="Автошкол пока нет" description="Создайте первую автошколу в панели владельца сервиса." />
          ) : (
            <div className="space-y-3">
              {metrics.map((item) => (
                <div key={item.school.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/30">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm font-black text-ink-900">{item.school.name}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        /{item.school.slug} · {formatPrice(item.billing.totalMonthlyPrice)}/мес · модулей: {item.enabledModules}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {item.noSlots ? <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">Нет слотов на 7 дней</span> : null}
                      {item.warnings.length > 0 ? <span className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700">Есть предупреждения: {item.warnings.length}</span> : null}
                      {!item.noSlots && item.warnings.length === 0 ? <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Стабильно</span> : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}
