import { BarChart3, Bell, Building2, Code2, CreditCard, FileSpreadsheet, MessageSquare, Palette, Puzzle, Send, UserPlus, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { Section } from '../../components/ui/Section'
import { StatCard } from '../../components/ui/StatCard'
import { useToast } from '../../components/ui/Toast'
import { formatPrice } from '../../lib/utils'
import {
  BASE_FEATURES,
  MODULE_CATEGORY_LABELS,
  getBillingSummary,
  getEnabledModules,
  getModulesCatalog,
  enableModule,
  disableModule,
  isModuleEnabled,
} from '../../services/modules'
import { db } from '../../services/storage'
import type { Module, ModuleCategory } from '../../types'

const ICON_MAP: Record<string, React.ElementType> = {
  MessageSquare,
  Send,
  Palette,
  Code2,
  CreditCard,
  BarChart3,
  Users,
  Bell,
  FileSpreadsheet,
  UserPlus,
  Building2,
}

const FILTERS: Array<'all' | ModuleCategory> = ['all', 'notifications', 'sales', 'analytics', 'integrations', 'management', 'limits', 'one_time']

function getPriceLabel(module: Module): string {
  if (module.priceType === 'usage') {
    return module.usageNote ?? 'По факту использования'
  }
  if (module.priceType === 'one_time') {
    return `${formatPrice(module.oneTimePrice ?? 0)} разово`
  }
  return `${formatPrice(module.monthlyPrice ?? 0)}/мес`
}

export function AdminModules() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const school = db.schools.bySlug('virazh')
  const [filter, setFilter] = useState<'all' | ModuleCategory>('all')
  const [, forceUpdate] = useState(0)

  const catalog = getModulesCatalog()
  const enabled = school ? getEnabledModules(school.id) : []
  const billing = school ? getBillingSummary(school.id) : null

  const filteredModules = useMemo(
    () => (filter === 'all' ? catalog : catalog.filter((module) => module.category === filter)),
    [catalog, filter],
  )

  function handleToggle(module: Module): void {
    if (!school) {
      return
    }

    if (isModuleEnabled(school.id, module.id)) {
      disableModule(school.id, module.id)
      forceUpdate((current) => current + 1)
      showToast('Модуль отключён', 'success')
      return
    }

    enableModule(school.id, module.id)
    forceUpdate((current) => current + 1)
    showToast(module.priceType === 'one_time' ? 'Разовая услуга добавлена' : 'Модуль подключён', 'success')
  }

  if (!school || !billing) {
    return (
      <div className="max-w-7xl p-6 md:p-8">
        <EmptyState title="Школа не найдена" description="Демо-данные не загружены." />
      </div>
    )
  }

  return (
    <div className="max-w-7xl p-6 md:p-8">
      <PageHeader
        eyebrow={school.name}
        title="Модули"
        description="Каталог полезных расширений для школы. База всегда остаётся честной и понятной: 4 990 ₽/мес + подключаемые модули."
      />

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="База" value={`${billing.baseMonthlyPrice.toLocaleString('ru-RU')} ₽`} meta="/мес" />
        <StatCard label="Подключённые модули" value={`${billing.modulesMonthlyTotal.toLocaleString('ru-RU')} ₽`} meta="/мес" />
        <StatCard label="Разовые услуги" value={`${billing.oneTimeTotal.toLocaleString('ru-RU')} ₽`} meta="разово" />
        <StatCard label="Подключено модулей" value={billing.enabledModulesCount} meta="всего" />
        <StatCard label="Итого в месяц" value={`${billing.totalMonthlyPrice.toLocaleString('ru-RU')} ₽`} meta="/мес" />
      </div>

      <div className="mt-8 space-y-6">
        <Section title="Что входит в базу" description="История ученика и базовая операционная работа уже входят в стоимость 4 990 ₽/мес.">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {BASE_FEATURES.map((feature) => (
              <div key={feature} className="rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3 text-sm text-stone-600">
                {feature}
              </div>
            ))}
          </div>
        </Section>

        <Section title="Каталог модулей" description="Подключайте только то, что реально усиливает продукт для школы.">
          <div className="mb-5 flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  filter === item
                    ? 'border-forest-700 bg-forest-700 text-white'
                    : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:text-stone-900'
                }`}
              >
                {item === 'all' ? 'Все' : MODULE_CATEGORY_LABELS[item]}
              </button>
            ))}
          </div>

          {filteredModules.length === 0 ? (
            <EmptyState title="По этому фильтру модулей пока нет" description="Попробуйте выбрать другую категорию." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredModules.map((module) => {
                const Icon = ICON_MAP[module.icon] ?? Puzzle
                const enabledState = isModuleEnabled(school.id, module.id)

                return (
                  <div key={module.id} className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-soft">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-100 text-forest-700">
                        <Icon size={18} />
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        {module.isRecommended ? <Badge variant="outline">Рекомендуем</Badge> : null}
                        <Badge variant={enabledState ? 'success' : 'default'}>
                          {enabledState ? 'Подключено' : 'Не подключено'}
                        </Badge>
                      </div>
                    </div>

                    <p className="mt-4 text-xs uppercase tracking-[0.16em] text-stone-400">
                      {MODULE_CATEGORY_LABELS[module.category]}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-stone-900">{module.name}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-stone-500">{module.description}</p>

                    <div className="mt-5">
                      <p className="text-2xl font-semibold tracking-tight text-stone-900">{getPriceLabel(module)}</p>
                      {module.priceType === 'usage' && module.usageNote ? (
                        <p className="mt-1 text-xs text-stone-500">{module.usageNote}</p>
                      ) : null}
                    </div>

                    <ul className="mt-5 space-y-2 text-sm text-stone-500">
                      {module.features.slice(0, 3).map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-stone-300" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-6 flex gap-2 border-t border-stone-100 pt-4">
                      <Button
                        variant={enabledState ? 'secondary' : 'primary'}
                        size="sm"
                        className="flex-1"
                        onClick={() => handleToggle(module)}
                      >
                        {enabledState ? 'Отключить' : 'Подключить'}
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => navigate(`/admin/modules/${module.id}`)}>
                        Подробнее
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Section>

        {enabled.length > 0 ? (
          <Section title="Подключено сейчас" description="Текущий набор модулей этой школы.">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {enabled.map((item) => (
                <div key={item.id} className="rounded-2xl border border-stone-100 bg-stone-50 px-4 py-4">
                  <p className="text-sm font-semibold text-stone-900">{item.module.name}</p>
                  <p className="mt-1 text-sm text-stone-500">{getPriceLabel(item.module)}</p>
                  <p className="mt-2 text-xs text-stone-400">
                    Подключено: {new Date(item.enabledAt).toLocaleDateString('ru-RU')}
                  </p>
                </div>
              ))}
            </div>
          </Section>
        ) : null}
      </div>
    </div>
  )
}
