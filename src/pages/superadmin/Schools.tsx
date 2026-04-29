import { ExternalLink, Settings2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { StateView } from '../../components/ui/StateView'
import { DataRow } from '../../components/ui/DataList'
import { PageHeader } from '../../components/ui/PageHeader'
import { Section } from '../../components/ui/Section'
import { Badge } from '../../components/ui/Badge'
import { formatPrice } from '../../lib/utils'
import { getSchoolOverview, getSchools } from '../../services/schoolService'
import { ADMIN_BASE_PATH, SUPERADMIN_BASE_PATH } from '../../services/accessControl'

export function SuperAdminSchools() {
  const navigate = useNavigate()
  const rows = getSchools()
    .map((school) => getSchoolOverview(school.id))
    .filter((item): item is NonNullable<ReturnType<typeof getSchoolOverview>> => Boolean(item))

  return (
    <div className="max-w-7xl p-4 md:p-6">
      <PageHeader
        eyebrow="Superadmin"
        title="Автошколы"
        description="Все tenants платформы: статус, slug, активность, подключённые модули и текущая стоимость в месяц."
        actions={<Button onClick={() => navigate(`${SUPERADMIN_BASE_PATH}/schools/new`)}>Создать автошколу</Button>}
      />

      <div className="mt-6">
        <Section title="Список школ" description={`Найдено ${rows.length} школ.`}>
          {rows.length === 0 ? (
            <StateView title="Автошкол пока нет" description="Создайте первую школу, чтобы увидеть её в каталоге." action={<Button onClick={() => navigate(`${SUPERADMIN_BASE_PATH}/schools/new`)}>Создать автошколу</Button>} />
          ) : (
            <div className="space-y-3">
              {rows.map((item) => (
                <DataRow key={item.school.id} className="p-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="grid flex-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                      <div>
                        <p className="ui-kicker">Школа</p>
                        <p className="mt-1 text-base font-bold text-product-main">{item.school.name}</p>
                        <p className="text-sm text-product-muted">/{item.school.slug}</p>
                      </div>
                      <div>
                        <p className="ui-kicker">Статус</p>
                        <div className="mt-1">
                          <Badge variant={item.school.isActive === false ? 'muted' : 'success'}>{item.school.isActive === false ? 'Отключена' : 'Активна'}</Badge>
                        </div>
                      </div>
                      <div>
                        <p className="ui-kicker">Ученики / записи</p>
                        <p className="mt-1 text-sm font-bold text-product-main">{item.studentCount} / {item.activeBookingsCount}</p>
                      </div>
                      <div>
                        <p className="ui-kicker">30 дней / слоты 7 дней</p>
                        <p className="mt-1 text-sm font-bold text-product-main">{item.bookingsLast30Days} / {item.freeSlots7Days}</p>
                      </div>
                      <div>
                        <p className="ui-kicker">Модули / MRR</p>
                        <p className="mt-1 text-sm font-bold text-product-main">{item.enabledModulesCount} / {formatPrice(item.billing.totalMonthlyPrice)}</p>
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[360px]">
                      <Button variant="secondary" size="sm" onClick={() => window.open(`/school/${item.school.slug}`, '_blank')}>
                        <ExternalLink size={14} />
                        Публичная
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => navigate(ADMIN_BASE_PATH)}>
                        <ExternalLink size={14} />
                        Админка
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => navigate(`${SUPERADMIN_BASE_PATH}/schools/${item.school.id}`)}>
                        <Settings2 size={14} />
                        Детали
                      </Button>
                    </div>
                  </div>
                </DataRow>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}
