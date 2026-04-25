import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, CheckCircle2, MessageSquare, Send, Palette, Code2,
  CreditCard, BarChart3, Users, Bell, FileSpreadsheet, UserPlus, Building2, Puzzle,
} from 'lucide-react'
import { db } from '../../services/storage'
import { getModuleById, CATEGORY_LABELS } from '../../services/modules'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { generateId } from '../../lib/utils'
import type { Module, SubscriptionModule } from '../../types'

const ICON_MAP: Record<string, React.ElementType> = {
  MessageSquare, Send, Palette, Code2, CreditCard, BarChart3,
  Users, Bell, FileSpreadsheet, UserPlus, Building2,
}

export function AdminModuleDetail() {
  const { moduleId } = useParams<{ moduleId: string }>()
  const navigate = useNavigate()
  const [module, setModule] = useState<Module | null>(null)
  const [subModule, setSubModule] = useState<SubscriptionModule | null>(null)

  useEffect(() => {
    if (!moduleId) return
    const m = getModuleById(moduleId)
    setModule(m ?? null)

    const school = db.schools.bySlug('virazh')
    if (!school) return
    const sm = db.subModules.bySchool(school.id).find((s) => s.moduleId === moduleId)
    setSubModule(sm ?? null)
  }, [moduleId])

  function toggle() {
    const school = db.schools.bySlug('virazh')
    if (!school || !module) return

    if (subModule) {
      db.subModules.remove(subModule.id)
      setSubModule(null)
    } else {
      const newSm: SubscriptionModule = {
        id: generateId('submod'),
        schoolId: school.id,
        moduleId: module.id,
        activatedAt: new Date().toISOString(),
        status: 'active',
      }
      db.subModules.upsert(newSm)
      setSubModule(newSm)
    }
  }

  if (!module) {
    return (
      <div className="p-8 text-center">
        <p className="text-stone-400 mb-4">Модуль не найден</p>
        <Button onClick={() => navigate('/admin/modules')}>К каталогу</Button>
      </div>
    )
  }

  const Icon = ICON_MAP[module.icon] ?? Puzzle
  const isActive = !!subModule

  return (
    <div className="p-8 max-w-3xl">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <button
          onClick={() => navigate('/admin/modules')}
          className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900 transition-colors mb-8"
        >
          <ArrowLeft size={16} />
          Каталог модулей
        </button>

        <div className="bg-white rounded-3xl border border-stone-100 shadow-card overflow-hidden">
          {/* Header */}
          <div className={`px-8 py-10 ${isActive ? 'bg-forest-800' : 'bg-stone-50'} border-b border-stone-100`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isActive ? 'bg-forest-700' : 'bg-white shadow-soft'}`}>
                  <Icon size={26} className={isActive ? 'text-forest-100' : 'text-stone-600'} />
                </div>
                <div>
                  {module.isPopular && (
                    <Badge variant={isActive ? 'outline' : 'forest'} size="sm" className={`mb-2 ${isActive ? 'border-forest-600 text-forest-200' : ''}`}>
                      Популярный
                    </Badge>
                  )}
                  <h1 className={`font-display text-2xl font-medium ${isActive ? 'text-white' : 'text-stone-900'}`}>
                    {module.name}
                  </h1>
                  <p className={`text-sm mt-1 ${isActive ? 'text-forest-300' : 'text-stone-500'}`}>
                    {CATEGORY_LABELS[module.category] ?? module.category}
                  </p>
                </div>
              </div>
              {isActive && (
                <div className="flex items-center gap-2 bg-forest-700 px-3 py-1.5 rounded-full">
                  <CheckCircle2 size={14} className="text-forest-200" />
                  <span className="text-xs font-medium text-forest-100">Активен</span>
                </div>
              )}
            </div>
          </div>

          {/* Price */}
          <div className="px-8 py-6 border-b border-stone-100">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-5xl font-medium text-stone-900">
                {module.price === 0 ? '0 ₽' : `${module.price.toLocaleString('ru-RU')} ₽`}
              </span>
              <span className="text-stone-400 text-base">
                {module.priceType === 'monthly' && '/месяц'}
                {module.priceType === 'one-time' && '— разовый платёж'}
              </span>
            </div>
            {module.usageNote && (
              <p className="text-sm text-stone-400 mt-1">{module.usageNote}</p>
            )}
          </div>

          {/* Description */}
          <div className="px-8 py-6 border-b border-stone-100">
            <h2 className="font-display text-lg font-medium text-stone-900 mb-3">О модуле</h2>
            <p className="text-sm text-stone-500 leading-relaxed">{module.description}</p>
          </div>

          {/* Features */}
          <div className="px-8 py-6 border-b border-stone-100">
            <h2 className="font-display text-lg font-medium text-stone-900 mb-4">Что входит</h2>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {module.features.map((feature) => (
                <div key={feature} className="flex items-center gap-2.5">
                  <CheckCircle2 size={15} className="text-forest-600 shrink-0" />
                  <span className="text-sm text-stone-600">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="px-8 py-6 flex gap-3">
            <Button
              size="lg"
              variant={isActive ? 'danger' : 'primary'}
              onClick={toggle}
              className="flex-1"
            >
              {isActive ? 'Отключить модуль' : 'Подключить модуль'}
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigate('/admin/modules')}
            >
              Назад
            </Button>
          </div>
        </div>

        {isActive && subModule && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="mt-4 bg-forest-50 border border-forest-100 rounded-2xl p-5"
          >
            <p className="text-sm text-forest-800 font-medium mb-1">Модуль подключён</p>
            <p className="text-xs text-forest-600">
              Активирован:{' '}
              {new Date(subModule.activatedAt).toLocaleDateString('ru-RU', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
