import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BarChart3,
  Bell,
  Building2,
  Code2,
  CreditCard,
  FileSpreadsheet,
  MessageSquare,
  Palette,
  Puzzle,
  Send,
  UserPlus,
  Users,
} from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'
import { formatPrice, generateId } from '../../lib/utils'
import { MODULE_CATALOG, CATEGORY_LABELS, getModuleById } from '../../services/modules'
import { db } from '../../services/storage'
import type { Module, SubscriptionModule } from '../../types'

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

export function AdminModules() {
  const navigate = useNavigate()
  const [activeModules, setActiveModules] = useState<SubscriptionModule[]>([])
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    const school = db.schools.bySlug('virazh')
    if (!school) {
      return
    }
    setActiveModules(db.subModules.bySchool(school.id))
  }, [])

  function isActive(moduleId: string): boolean {
    return activeModules.some((subscription) => subscription.moduleId === moduleId && subscription.status === 'active')
  }

  function toggle(module: Module): void {
    const school = db.schools.bySlug('virazh')
    if (!school) {
      return
    }

    if (isActive(module.id)) {
      const subscription = activeModules.find((item) => item.moduleId === module.id)
      if (!subscription) {
        return
      }

      db.subModules.remove(subscription.id)
      setActiveModules((current) => current.filter((item) => item.moduleId !== module.id))
      return
    }

    const nextSubscription: SubscriptionModule = {
      id: generateId('submod'),
      schoolId: school.id,
      moduleId: module.id,
      activatedAt: new Date().toISOString(),
      status: 'active',
    }

    db.subModules.upsert(nextSubscription)
    setActiveModules((current) => [...current, nextSubscription])
  }

  const categories = ['all', ...Array.from(new Set(MODULE_CATALOG.map((module) => module.category)))]
  const filteredModules = filter === 'all' ? MODULE_CATALOG : MODULE_CATALOG.filter((module) => module.category === filter)
  const totalMonthly = activeModules
    .map((subscription) => getModuleById(subscription.moduleId))
    .filter(Boolean)
    .filter((module) => module?.priceType === 'monthly')
    .reduce((sum, module) => sum + (module?.price ?? 0), 0)

  return (
    <div className="max-w-7xl p-6 md:p-8">
      <PageHeader
        eyebrow="Платформа"
        title="Каталог модулей"
        description="Подключаемые возможности без тарифной перегрузки: выбираете только то, что реально нужно школе."
      />

      {activeModules.length > 0 ? (
        <div className="mt-6 rounded-[28px] border border-stone-200 bg-white p-5 shadow-soft">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-stone-900">
                Подключено {activeModules.length} модулей
              </p>
              <p className="mt-1 text-sm text-stone-500">
                База 4 990 ₽ + {formatPrice(totalMonthly)}/мес за активные модули
              </p>
            </div>
            <p className="text-2xl font-semibold tracking-tight text-stone-900">
              {formatPrice(4990 + totalMonthly)}
              <span className="ml-1 text-sm font-medium text-stone-400">/мес</span>
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setFilter(category)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              filter === category
                ? 'border-forest-700 bg-forest-700 text-white'
                : 'border-stone-200 bg-white text-stone-500 hover:border-stone-300 hover:text-stone-900'
            }`}
          >
            {category === 'all' ? 'Все' : CATEGORY_LABELS[category] ?? category}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredModules.map((module, index) => {
          const Icon = ICON_MAP[module.icon] ?? Puzzle
          const active = isActive(module.id)

          return (
            <motion.div key={module.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: index * 0.03 }}>
              <Card padding="md">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-100 text-forest-700">
                    <Icon size={18} />
                  </div>
                  <div className="flex items-center gap-2">
                    {module.isPopular ? <Badge variant="outline">Популярный</Badge> : null}
                    {active ? <Badge variant="forest">Активен</Badge> : null}
                  </div>
                </div>

                <h3 className="mt-5 text-lg font-semibold text-stone-900">{module.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-500">{module.shortDescription}</p>

                <div className="mt-5 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold tracking-tight text-stone-900">
                    {module.price === 0 ? '0 ₽' : formatPrice(module.price)}
                  </span>
                  <span className="text-sm text-stone-400">
                    {module.priceType === 'monthly' ? '/мес' : module.priceType === 'one-time' ? 'разово' : module.usageNote ?? ''}
                  </span>
                </div>

                <ul className="mt-5 space-y-2 text-sm text-stone-500">
                  {module.features.slice(0, 3).map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-stone-300" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 flex gap-2 border-t border-stone-100 pt-4">
                  <Button variant={active ? 'danger' : 'primary'} size="sm" className="flex-1" onClick={() => toggle(module)}>
                    {active ? 'Отключить' : 'Подключить'}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => navigate(`/admin/modules/${module.id}`)}>
                    Подробнее
                  </Button>
                </div>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
