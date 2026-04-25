import { ExternalLink, Settings2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { Section } from '../../components/ui/Section'
import { formatPrice } from '../../lib/utils'
import { getSchoolOverview, getSchools } from '../../services/schoolService'

export function SuperAdminSchools() {
  const navigate = useNavigate()
  const rows = getSchools()
    .map((school) => getSchoolOverview(school.id))
    .filter((item): item is NonNullable<ReturnType<typeof getSchoolOverview>> => Boolean(item))

  return (
    <div className="max-w-7xl p-6 md:p-8">
      <PageHeader
        eyebrow="Superadmin"
        title="Автошколы"
        description="Все школы, их загрузка, подключённые модули и текущая демо-стоимость в месяц."
        actions={<Button onClick={() => navigate('/superadmin/schools/new')}>Создать автошколу</Button>}
      />

      <div className="mt-8">
        <Section title="Список школ" description={`Найдено ${rows.length} автошкол.`}>
          {rows.length === 0 ? (
            <EmptyState title="Автошкол пока нет" description="Создайте первую школу, чтобы увидеть её в каталоге." />
          ) : (
            <div className="space-y-4">
              {rows.map((item) => (
                <div key={item.school.id} className="rounded-3xl border border-stone-200 bg-white p-4 shadow-soft">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-stone-400">Школа</p>
                        <p className="mt-1 text-sm font-semibold text-stone-900">{item.school.name}</p>
                        <p className="text-sm text-stone-500">/{item.school.slug}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-stone-400">Филиалы / инструкторы</p>
                        <p className="mt-1 text-sm font-semibold text-stone-900">{item.branchCount} / {item.instructorCount}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-stone-400">Ученики / активные записи</p>
                        <p className="mt-1 text-sm font-semibold text-stone-900">{item.studentCount} / {item.activeBookingsCount}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-stone-400">Записи 30 дней / слоты 7 дней</p>
                        <p className="mt-1 text-sm font-semibold text-stone-900">{item.bookingsLast30Days} / {item.freeSlots7Days}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-stone-400">Модули / сумма</p>
                        <p className="mt-1 text-sm font-semibold text-stone-900">{item.enabledModulesCount} / {formatPrice(item.billing.totalMonthlyPrice)}</p>
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[360px]">
                      <Button variant="secondary" size="sm" onClick={() => window.open(`/school/${item.school.slug}`, '_blank')}>
                        <ExternalLink size={14} />
                        Публичная
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => navigate('/admin')}>
                        <ExternalLink size={14} />
                        Админка
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => navigate(`/superadmin/schools/${item.school.id}`)}>
                        <Settings2 size={14} />
                        Настройки
                      </Button>
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
