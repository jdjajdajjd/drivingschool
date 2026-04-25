import { ArrowLeft, BarChart3, Bell, Building2, Code2, CreditCard, FileSpreadsheet, MessageSquare, Palette, Puzzle, Send, UserPlus, Users } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { Section } from '../../components/ui/Section'
import { useToast } from '../../components/ui/Toast'
import { formatPrice } from '../../lib/utils'
import { MODULE_CATEGORY_LABELS, disableModule, enableModule, getModuleById, isModuleEnabled } from '../../services/modules'
import { db } from '../../services/storage'

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

export function AdminModuleDetail() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { moduleId } = useParams<{ moduleId: string }>()
  const school = db.schools.bySlug('virazh')
  const module = moduleId ? getModuleById(moduleId) : null

  if (!school || !module) {
    return (
      <div className="max-w-5xl p-6 md:p-8">
        <EmptyState
          title="Модуль не найден"
          description="Проверьте ссылку или вернитесь в каталог модулей."
          action={<Button onClick={() => navigate('/admin/modules')}>К каталогу</Button>}
        />
      </div>
    )
  }

  const Icon = ICON_MAP[module.icon] ?? Puzzle
  const currentSchool = school
  const currentModule = module
  const enabled = isModuleEnabled(currentSchool.id, currentModule.id)
  const priceLabel =
    currentModule.priceType === 'usage'
      ? currentModule.usageNote ?? 'По факту использования'
      : currentModule.priceType === 'one_time'
        ? `${formatPrice(currentModule.oneTimePrice ?? 0)} разово`
        : `${formatPrice(currentModule.monthlyPrice ?? 0)}/мес`

  function handleToggle(): void {
    if (enabled) {
      disableModule(currentSchool.id, currentModule.id)
      showToast('Модуль отключён', 'success')
      navigate('/admin/modules')
      return
    }

    enableModule(currentSchool.id, currentModule.id)
    showToast(currentModule.priceType === 'one_time' ? 'Разовая услуга добавлена' : 'Модуль подключён', 'success')
    navigate('/admin/modules')
  }

  return (
    <div className="max-w-5xl p-6 md:p-8">
      <button
        onClick={() => navigate('/admin/modules')}
        className="mb-4 inline-flex items-center gap-2 text-sm text-stone-500 transition hover:text-stone-900"
      >
        <ArrowLeft size={15} />
        Назад к каталогу
      </button>

      <PageHeader
        eyebrow={MODULE_CATEGORY_LABELS[module.category]}
        title={module.name}
        description={module.description}
        actions={
          <Button variant={enabled ? 'secondary' : 'primary'} onClick={handleToggle}>
            {enabled ? 'Отключить модуль' : module.priceType === 'one_time' ? 'Добавить услугу' : 'Подключить модуль'}
          </Button>
        }
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Section title="Что даёт модуль" description="Коротко и по делу: без фейковых обещаний и без технической перегрузки.">
          <div className="flex items-start gap-4 rounded-3xl border border-stone-100 bg-stone-50 px-5 py-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-forest-700 shadow-soft">
              <Icon size={20} />
            </div>
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={enabled ? 'success' : 'default'}>
                  {enabled ? 'Подключено' : 'Не подключено'}
                </Badge>
                {module.isRecommended ? <Badge variant="outline">Рекомендуем</Badge> : null}
              </div>
              <p className="mt-3 text-lg font-semibold text-stone-900">{priceLabel}</p>
              {module.usageNote ? <p className="mt-1 text-sm text-stone-500">{module.usageNote}</p> : null}
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {module.features.map((feature) => (
              <div key={feature} className="rounded-2xl border border-stone-100 bg-white px-4 py-3 text-sm text-stone-600">
                {feature}
              </div>
            ))}
          </div>
        </Section>

        <Section title="Статус" description="Как модуль учитывается в стоимости школы.">
          <div className="space-y-3">
            <div className="rounded-2xl border border-stone-100 bg-stone-50 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-stone-400">Категория</p>
              <p className="mt-1 text-sm font-semibold text-stone-900">{MODULE_CATEGORY_LABELS[module.category]}</p>
            </div>
            <div className="rounded-2xl border border-stone-100 bg-stone-50 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-stone-400">Тип цены</p>
              <p className="mt-1 text-sm font-semibold text-stone-900">
                {module.priceType === 'monthly' ? 'Ежемесячно' : module.priceType === 'one_time' ? 'Разовая услуга' : 'По использованию'}
              </p>
            </div>
            <div className="rounded-2xl border border-stone-100 bg-stone-50 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-stone-400">Режим</p>
              <p className="mt-1 text-sm font-semibold text-stone-900">
                {enabled ? 'Уже включён в школу' : 'Можно подключить в один клик'}
              </p>
            </div>
          </div>
        </Section>
      </div>
    </div>
  )
}
