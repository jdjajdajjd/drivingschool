import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  MessageSquare, Send, Palette, Code2, CreditCard, BarChart3,
  Users, Bell, FileSpreadsheet, UserPlus, Building2,
  CheckCircle2, ArrowRight, Puzzle,
} from 'lucide-react'
import { db } from '../../services/storage'
import { MODULE_CATALOG, CATEGORY_LABELS, getModuleById } from '../../services/modules'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { formatPrice, generateId } from '../../lib/utils'
import type { Module, SubscriptionModule } from '../../types'

const ICON_MAP: Record<string, React.ElementType> = {
  MessageSquare, Send, Palette, Code2, CreditCard, BarChart3,
  Users, Bell, FileSpreadsheet, UserPlus, Building2,
}

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.05 } } },
  item: { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } } },
}

export function AdminModules() {
  const navigate = useNavigate()
  const [activeModules, setActiveModules] = useState<SubscriptionModule[]>([])
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    const school = db.schools.bySlug('virazh')
    if (!school) return
    setActiveModules(db.subModules.bySchool(school.id))
  }, [])

  function isActive(moduleId: string) {
    return activeModules.some((sm) => sm.moduleId === moduleId && sm.status === 'active')
  }

  function toggle(module: Module) {
    const school = db.schools.bySlug('virazh')
    if (!school) return

    if (isActive(module.id)) {
      const sm = activeModules.find((m) => m.moduleId === module.id)
      if (sm) {
        db.subModules.remove(sm.id)
        setActiveModules((prev) => prev.filter((m) => m.moduleId !== module.id))
      }
    } else {
      const newSm: SubscriptionModule = {
        id: generateId('submod'),
        schoolId: school.id,
        moduleId: module.id,
        activatedAt: new Date().toISOString(),
        status: 'active',
      }
      db.subModules.upsert(newSm)
      setActiveModules((prev) => [...prev, newSm])
    }
  }

  const categories = ['all', ...Array.from(new Set(MODULE_CATALOG.map((m) => m.category)))]

  const filtered =
    filter === 'all' ? MODULE_CATALOG : MODULE_CATALOG.filter((m) => m.category === filter)

  const totalMonthly = activeModules
    .map((sm) => getModuleById(sm.moduleId))
    .filter(Boolean)
    .filter((m) => m!.priceType === 'monthly')
    .reduce((acc, m) => acc + m!.price, 0)

  return (
    <div className="p-8 max-w-7xl">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <p className="text-xs text-stone-400 uppercase tracking-wide font-medium mb-1">
          Платформа
        </p>
        <h1 className="font-sans text-3xl font-medium text-stone-900">Каталог модулей</h1>
      </motion.div>

      {/* Active summary */}
      {activeModules.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="bg-forest-800 rounded-2xl p-5 mb-6 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Puzzle size={18} className="text-forest-300" />
            <div>
              <p className="text-sm font-medium text-white">
                {activeModules.length} модул{activeModules.length === 1 ? 'ь' : activeModules.length < 5 ? 'я' : 'ей'} подключено
              </p>
              <p className="text-xs text-forest-300">
                База 4 990 ₽ + {formatPrice(totalMonthly)}/мес за модули
              </p>
            </div>
          </div>
          <p className="font-sans text-2xl font-medium text-white">
            {formatPrice(4990 + totalMonthly)}<span className="text-forest-300 text-base font-sans font-normal">/мес</span>
          </p>
        </motion.div>
      )}

      {/* Category filter */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ${
              filter === cat
                ? 'bg-stone-900 border-stone-900 text-white'
                : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            {cat === 'all' ? 'Все' : CATEGORY_LABELS[cat] ?? cat}
          </button>
        ))}
      </div>

      {/* Module grid */}
      <motion.div
        variants={stagger.container}
        initial="hidden"
        animate="show"
        className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {filtered.map((module) => {
          const Icon = ICON_MAP[module.icon] ?? Puzzle
          const active = isActive(module.id)

          return (
            <motion.div
              key={module.id}
              variants={stagger.item}
              className={`bg-white rounded-2xl border shadow-card transition-all duration-200 overflow-hidden group ${
                active ? 'border-forest-200 shadow-card-hover' : 'border-stone-100 hover:shadow-card-hover'
              }`}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                    active ? 'bg-forest-100' : 'bg-stone-100'
                  }`}>
                    <Icon size={20} className={active ? 'text-forest-700' : 'text-stone-500'} />
                  </div>
                  <div className="flex items-center gap-2">
                    {module.isPopular && <Badge variant="forest" size="sm">Популярный</Badge>}
                    {active && (
                      <div className="flex items-center gap-1">
                        <CheckCircle2 size={14} className="text-forest-600" />
                        <span className="text-xs text-forest-700 font-medium">Активен</span>
                      </div>
                    )}
                  </div>
                </div>

                <h3 className="font-sans text-lg font-medium text-stone-900 mb-1.5">
                  {module.name}
                </h3>
                <p className="text-xs text-stone-400 leading-relaxed mb-4">
                  {module.shortDescription}
                </p>

                {/* Price */}
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="font-sans text-2xl font-medium text-stone-900">
                    {module.price === 0 ? '0 ₽' : `${module.price.toLocaleString('ru-RU')} ₽`}
                  </span>
                  <span className="text-xs text-stone-400">
                    {module.priceType === 'monthly' && '/мес'}
                    {module.priceType === 'one-time' && ' разово'}
                    {module.priceType === 'usage' && ''}
                  </span>
                  {module.usageNote && (
                    <span className="text-xs text-stone-400">{module.usageNote}</span>
                  )}
                </div>

                {/* Features preview */}
                <ul className="space-y-1.5 mb-5">
                  {module.features.slice(0, 3).map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-stone-500">
                      <div className="w-1 h-1 bg-stone-300 rounded-full shrink-0" />
                      {f}
                    </li>
                  ))}
                  {module.features.length > 3 && (
                    <li className="text-xs text-stone-400 pl-3">
                      +{module.features.length - 3} ещё...
                    </li>
                  )}
                </ul>
              </div>

              <div className="px-6 pb-6 flex gap-2">
                <Button
                  variant={active ? 'danger' : 'primary'}
                  size="sm"
                  className="flex-1"
                  onClick={() => toggle(module)}
                >
                  {active ? 'Отключить' : 'Подключить'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/admin/modules/${module.id}`)}
                >
                  <ArrowRight size={14} />
                </Button>
              </div>
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}
