import { ExternalLink } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { StateView } from '../../components/ui/StateView'
import { DataRow } from '../../components/ui/DataList'
import { PageHeader } from '../../components/ui/PageHeader'
import { Section } from '../../components/ui/Section'
import { StatCard } from '../../components/ui/StatCard'
import { Badge } from '../../components/ui/Badge'
import { formatInstructorName, formatPrice } from '../../lib/utils'
import { getEnabledModules } from '../../services/modules'
import { getSchoolOverview } from '../../services/schoolService'
import { db } from '../../services/storage'
import { ADMIN_BASE_PATH, SUPERADMIN_BASE_PATH } from '../../services/accessControl'

export function SuperAdminSchoolDetail() {
  const { schoolId } = useParams<{ schoolId: string }>()
  const navigate = useNavigate()
  const overview = schoolId ? getSchoolOverview(schoolId) : null

  const collections = useMemo(() => {
    if (!schoolId) return null

    return {
      branches: db.branches.bySchool(schoolId),
      instructors: db.instructors.bySchool(schoolId),
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
    <div className="max-w-7xl p-4 md:p-6">
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
              Настройки школы
            </Button>
          </div>
        }
      />

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Филиалы" value={overview.branchCount} />
        <StatCard label="Инструкторы" value={overview.instructorCount} />
        <StatCard label="Активные записи" value={overview.activeBookingsCount} />
        <StatCard label="Стоимость в месяц" value={formatPrice(overview.billing.totalMonthlyPrice)} />
      </div>

      <div className="mt-6 space-y-5">
        <Section title="Конфигурация" description="Ключевые white-label и операционные параметры школы.">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-product-border bg-product-alt px-4 py-4">
              <p className="ui-kicker">Slug</p>
              <p className="mt-1 text-sm font-semibold text-product-main">{overview.school.slug}</p>
            </div>
            <div className="rounded-2xl border border-product-border bg-product-alt px-4 py-4">
              <p className="ui-kicker">Лимит записей</p>
              <p className="mt-1 text-sm font-semibold text-product-main">
                {overview.school.bookingLimitEnabled ? overview.school.maxActiveBookingsPerStudent : 'Выключен'}
              </p>
            </div>
            <div className="rounded-2xl border border-product-border bg-product-alt px-4 py-4">
              <p className="ui-kicker">Свободные слоты 7 дней</p>
              <p className="mt-1 text-sm font-semibold text-product-main">{overview.freeSlots7Days}</p>
            </div>
            <div className="rounded-2xl border border-product-border bg-product-alt px-4 py-4">
              <p className="ui-kicker">Предупреждения</p>
              <p className="mt-1 text-sm font-semibold text-product-main">{overview.integrityWarnings}</p>
            </div>
          </div>
        </Section>

        <Section title="Филиалы и инструкторы" description="Быстрый срез наполнения школы без перехода в админку.">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              {collections.branches.map((branch) => (
                <DataRow key={branch.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-product-main">{branch.name}</p>
                      <p className="mt-1 text-sm text-product-secondary">{branch.address || 'Адрес не указан'}</p>
                    </div>
                    <Badge variant={branch.isActive ? 'success' : 'muted'}>{branch.isActive ? 'Активен' : 'Скрыт'}</Badge>
                  </div>
                </DataRow>
              ))}
            </div>
            <div className="space-y-3">
              {collections.instructors.map((instructor) => (
                <DataRow key={instructor.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-product-main">{formatInstructorName(instructor.name)}</p>
                      <p className="mt-1 text-sm text-product-secondary">{instructor.car ?? 'Машина не указана'}</p>
                    </div>
                    <Badge variant={instructor.isActive ? 'success' : 'muted'}>{instructor.isActive ? 'Активен' : 'Скрыт'}</Badge>
                  </div>
                </DataRow>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Модули и биллинг" description="Текущий состав подключённых возможностей и расчётная стоимость tenant.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {collections.enabledModules.map((item) => (
              <DataRow key={item.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-product-main">{item.module.name}</p>
                    <p className="mt-1 text-sm text-product-secondary">
                      {item.module.priceType === 'monthly'
                        ? `${formatPrice(item.module.monthlyPrice ?? 0)}/мес`
                        : item.module.priceType === 'one_time'
                          ? `${formatPrice(item.module.oneTimePrice ?? 0)} разово`
                          : item.module.usageNote ?? 'По факту использования'}
                    </p>
                  </div>
                  <Badge variant="forest">Включён</Badge>
                </div>
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
