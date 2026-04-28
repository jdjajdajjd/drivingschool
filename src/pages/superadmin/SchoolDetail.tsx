import { ExternalLink } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { StateView } from '../../components/ui/StateView'
import { DataRow } from '../../components/ui/DataList'
import { PageHeader } from '../../components/ui/PageHeader'
import { Section } from '../../components/ui/Section'
import { StatCard } from '../../components/ui/StatCard'
import { formatPrice } from '../../lib/utils'
import { getEnabledModules } from '../../services/modules'
import { getSchoolOverview } from '../../services/schoolService'
import { db } from '../../services/storage'
import { ADMIN_BASE_PATH, SUPERADMIN_BASE_PATH } from '../../services/accessControl'

export function SuperAdminSchoolDetail() {
  const { schoolId } = useParams<{ schoolId: string }>()
  const navigate = useNavigate()
  const overview = schoolId ? getSchoolOverview(schoolId) : null

  const collections = useMemo(() => {
    if (!schoolId) {
      return null
    }

    return {
      branches: db.branches.bySchool(schoolId),
      instructors: db.instructors.bySchool(schoolId),
      bookings: db.bookings.bySchool(schoolId),
      enabledModules: getEnabledModules(schoolId),
    }
  }, [schoolId])

  if (!overview || !collections) {
    return (
      <div className="max-w-6xl p-6 md:p-8">
        <StateView
          kind="error"
          title="Школа не найдена"
          description="Проверьте ссылку или вернитесь в список автошкол."
          action={<Button onClick={() => navigate(`${SUPERADMIN_BASE_PATH}/schools`)}>К списку школ</Button>}
        />
      </div>
    )
  }

  return (
    <div className="max-w-7xl p-6 md:p-8">
        <PageHeader
          eyebrow="Superadmin"
          title={overview.school.name}
          description={`/${overview.school.slug} · ${overview.school.description || 'Описание пока не заполнено.'}`}
        actions={
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => window.open(`/school/${overview.school.slug}`, '_blank')}>
              <ExternalLink size={15} />
              Публичная страница
            </Button>
            <Button variant="secondary" onClick={() => navigate(`${ADMIN_BASE_PATH}/settings`)}>
              Открыть настройки школы
            </Button>
          </div>
        }
      />

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Филиалы" value={overview.branchCount} />
        <StatCard label="Инструкторы" value={overview.instructorCount} />
        <StatCard label="Активные записи" value={overview.activeBookingsCount} />
        <StatCard label="Стоимость в месяц" value={formatPrice(overview.billing.totalMonthlyPrice)} />
      </div>

      <div className="mt-8 space-y-6">
        <Section title="Настройки школы" description="Текущие ключевые параметры школы.">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-stone-400">Slug</p>
              <p className="mt-1 text-sm font-semibold text-stone-900">{overview.school.slug}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-stone-400">Лимит записи</p>
              <p className="mt-1 text-sm font-semibold text-stone-900">
                {overview.school.bookingLimitEnabled ? overview.school.maxActiveBookingsPerStudent : 'Выключен'}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-stone-400">Свободные слоты на 7 дней</p>
              <p className="mt-1 text-sm font-semibold text-stone-900">{overview.freeSlots7Days}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-stone-400">Предупреждения</p>
              <p className="mt-1 text-sm font-semibold text-stone-900">{overview.integrityWarnings}</p>
            </div>
          </div>
        </Section>

        <Section title="Филиалы и инструкторы" description="Быстрый продуктовый срез по содержимому школы.">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              {collections.branches.map((branch) => (
                <DataRow key={branch.id}>
                  <p className="text-sm font-black text-ink-900">{branch.name}</p>
                  <p className="mt-1 text-sm text-slate-600">{branch.address || 'Адрес не указан'}</p>
                </DataRow>
              ))}
            </div>
            <div className="space-y-3">
              {collections.instructors.map((instructor) => (
                <DataRow key={instructor.id}>
                  <p className="text-sm font-black text-ink-900">{instructor.name}</p>
                  <p className="mt-1 text-sm text-slate-600">{instructor.car ?? 'Машина не указана'}</p>
                </DataRow>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Подключённые модули и стоимость" description="Текущий состав product-layer этой школы.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {collections.enabledModules.map((item) => (
              <DataRow key={item.id}>
                <p className="text-sm font-black text-ink-900">{item.module.name}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {item.module.priceType === 'monthly'
                    ? `${formatPrice(item.module.monthlyPrice ?? 0)}/мес`
                    : item.module.priceType === 'one_time'
                      ? `${formatPrice(item.module.oneTimePrice ?? 0)} разово`
                      : item.module.usageNote ?? 'По факту использования'}
                </p>
              </DataRow>
            ))}
            {collections.enabledModules.length === 0 ? (
              <StateView title="Подключённых модулей пока нет" description="Школа работает только на базовом пакете." />
            ) : null}
          </div>
        </Section>
      </div>
    </div>
  )
}
