import { BarChart3, Bell, Building2, Code2, CreditCard, FileSpreadsheet, MessageSquare, Palette, Puzzle, Send, UserPlus, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { Section } from '../../components/ui/Section'
import { useToast } from '../../components/ui/Toast'
import { formatPrice } from '../../lib/utils'
import {
  BASE_FEATURES,
  MODULE_CATEGORY_LABELS,
  disableModule,
  enableModule,
  getBillingSummary,
  getEnabledModules,
  getModulesCatalog,
  isModuleEnabled,
} from '../../services/modules'
import { ADMIN_BASE_PATH } from '../../services/accessControl'
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
    return module.usageNote ?? 'Оплачивается по факту использования'
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
  const [showBaseFeatures, setShowBaseFeatures] = useState(false)
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
      <div className="max-w-7xl p-4 md:p-6">
        <EmptyState title="Школа не найдена" description="Демо-данные не загружены." />
      </div>
    )
  }

  return (
    <div className="max-w-7xl p-4 md:p-6">
      <PageHeader
        eyebrow={school.name}
        title="Модули"
        description="База остаётся простой: 4 990 ₽ в месяц. Дополнительные возможности подключаются отдельно, только когда они действительно нужны."
      />

      <div className="mt-8 space-y-6">
        <Section title="Стоимость" description="Короткая сводка по текущей конфигурации школы.">
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1.2fr]">
            <div className="rounded-2xl bg-stone-50 px-4 py-4">
              <p className="text-sm font-medium text-stone-600">База</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">{formatPrice(billing.baseMonthlyPrice)}</p>
            </div>
            <div className="rounded-2xl bg-stone-50 px-4 py-4">
              <p className="text-sm font-medium text-stone-600">Модули</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">{formatPrice(billing.modulesMonthlyTotal)}</p>
              {billing.oneTimeTotal > 0 ? <p className="mt-1 text-sm text-stone-500">Разово: {formatPrice(billing.oneTimeTotal)}</p> : null}
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white px-4 py-4">
              <p className="text-sm font-medium text-stone-600">Итого</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
                {formatPrice(billing.totalMonthlyPrice)}
                <span className="ml-1 text-base font-medium text-stone-500">/мес</span>
              </p>
              <p className="mt-1 text-sm text-stone-500">Подключено модулей: {billing.enabledModulesCount}</p>
            </div>
          </div>
        </Section>

        {enabled.length > 0 ? (
          <Section title="Подключено сейчас" description="Текущие расширения этой школы.">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {enabled.map((item) => (
                <div key={item.id} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-stone-900">{item.module.name}</p>
                      <p className="mt-1 text-sm text-stone-600">{getPriceLabel(item.module)}</p>
                    </div>
                    <Badge variant="success">Подключено</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        ) : null}

        <Section
          title="Что входит в базу"
          description="История ученика, записи, слоты и базовая админка уже входят в 4 990 ₽."
          actions={
            <Button variant="ghost" size="sm" onClick={() => setShowBaseFeatures((current) => !current)}>
              {showBaseFeatures ? 'Скрыть список' : 'Показать список'}
            </Button>
          }
        >
          {showBaseFeatures ? (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {BASE_FEATURES.map((feature) => (
                <div key={feature} className="rounded-xl bg-stone-50 px-4 py-3 text-sm text-stone-700">
                  {feature}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-stone-600">
              Базовый пакет уже закрывает публичную запись, список записей, работу с учениками, инструкторами,
              филиалами, слотами и личной ссылкой инструктора.
            </p>
          )}
        </Section>

        <Section title="Каталог модулей" description="Подключайте только то, что усиливает продукт для конкретной школы.">
          <div className="mb-5 flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`rounded-full border px-3.5 py-2 text-sm font-medium transition ${
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
            <EmptyState title="По этому фильтру модулей нет" description="Попробуйте выбрать другую категорию." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredModules.map((module) => {
                const Icon = ICON_MAP[module.icon] ?? Puzzle
                const enabledState = isModuleEnabled(school.id, module.id)

                return (
                  <div key={module.id} className="rounded-2xl border border-stone-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="text-stone-400">
                          <Icon size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-stone-500">{MODULE_CATEGORY_LABELS[module.category]}</p>
                          <h3 className="mt-1 text-base font-semibold text-stone-900">{module.name}</h3>
                        </div>
                      </div>
                      <Badge variant={enabledState ? 'success' : 'default'}>
                        {enabledState ? 'Подключено' : 'Не подключено'}
                      </Badge>
                    </div>

                    <p className="mt-3 text-sm leading-relaxed text-stone-600">{module.description}</p>

                    <div className="mt-4">
                      <p className="text-xl font-semibold tracking-tight text-stone-900">{getPriceLabel(module)}</p>
                      {module.priceType === 'usage' && module.usageNote ? (
                        <p className="mt-1 text-sm text-stone-500">{module.usageNote}</p>
                      ) : null}
                    </div>

                    <div className="mt-5 flex gap-2 border-t border-stone-100 pt-4">
                      <Button
                        variant={enabledState ? 'secondary' : 'primary'}
                        size="sm"
                        className="flex-1"
                        onClick={() => handleToggle(module)}
                      >
                        {enabledState ? 'Отключить' : 'Подключить'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`${ADMIN_BASE_PATH}/modules/${module.id}`)}>
                        Подробнее
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}
