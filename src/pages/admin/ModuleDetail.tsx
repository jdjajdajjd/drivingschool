import { AddTeamIcon, ArrowLeft01Icon, BellDotIcon, BookOpen01Icon, Building03Icon, ChartBarLineIcon, CodeIcon, FileSpreadsheetIcon, MailSend01Icon, Message01Icon, PaintBoardIcon, PuzzleIcon, UserMultipleIcon } from '@hugeicons/core-free-icons'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { Section } from '../../components/ui/Section'
import { useToast } from '../../components/ui/Toast'
import { createHugeIcon } from '../../components/ui/HugeIcon'
import { formatPrice } from '../../lib/utils'
import { MODULE_CATEGORY_LABELS, disableModule, enableModule, getModuleById, isModuleEnabled } from '../../services/modules'
import { db } from '../../services/storage'
import { ADMIN_BASE_PATH } from '../../services/accessControl'

const ArrowLeft = createHugeIcon(ArrowLeft01Icon)
const BarChart3 = createHugeIcon(ChartBarLineIcon)
const Bell = createHugeIcon(BellDotIcon)
const BookOpen = createHugeIcon(BookOpen01Icon)
const Building2 = createHugeIcon(Building03Icon)
const Code2 = createHugeIcon(CodeIcon)
const FileSpreadsheet = createHugeIcon(FileSpreadsheetIcon)
const MessageSquare = createHugeIcon(Message01Icon)
const Palette = createHugeIcon(PaintBoardIcon)
const Puzzle = createHugeIcon(PuzzleIcon)
const Send = createHugeIcon(MailSend01Icon)
const UserPlus = createHugeIcon(AddTeamIcon)
const Users = createHugeIcon(UserMultipleIcon)

const ICON_MAP: Record<string, React.ElementType> = {
  MessageSquare,
  BookOpen,
  Send,
  Palette,
  Code2,
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
  const school = db.schools.all()[0] ?? null
  const module = moduleId ? getModuleById(moduleId) : null

  if (!school || !module) {
    return (
      <div className="max-w-5xl p-6 md:p-8">
        <EmptyState
          title="Дополнение не найден"
          description="Проверьте ссылку или вернитесь в каталог дополнений."
          action={<Button onClick={() => navigate(`${ADMIN_BASE_PATH}/modules`)}>К каталогу</Button>}
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
    if (currentModule.isComingSoon) {
      showToast('Дополнение пока недоступно для подключения.', 'error')
      return
    }

    if (enabled) {
      disableModule(currentSchool.id, currentModule.id)
      showToast('Дополнение отключено', 'success')
      navigate(`${ADMIN_BASE_PATH}/modules`)
      return
    }

    enableModule(currentSchool.id, currentModule.id)
    showToast(currentModule.priceType === 'one_time' ? 'Разовая услуга добавлена' : 'Дополнение подключено', 'success')
    navigate(`${ADMIN_BASE_PATH}/modules`)
  }

  return (
    <div className="max-w-5xl p-6 md:p-8">
      <button
        onClick={() => navigate(`${ADMIN_BASE_PATH}/modules`)}
        className="mb-4 inline-flex items-center gap-2 text-sm text-[#667085] transition hover:text-[#111827]"
      >
        <ArrowLeft size={15} />
        Назад к каталогу
      </button>

      <PageHeader
        eyebrow={MODULE_CATEGORY_LABELS[module.category]}
        title={module.name}
        description={module.description}
        actions={
          <Button variant={enabled ? 'secondary' : 'primary'} disabled={module.isComingSoon} onClick={handleToggle}>
            {module.isComingSoon ? 'Скоро' : enabled ? 'Отключить дополнение' : module.priceType === 'one_time' ? 'Добавить услугу' : 'Подключить дополнение'}
          </Button>
        }
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Section title="Что даёт дополнение" description="Коротко и по делу: без фейковых обещаний и без технической перегрузки.">
          <div className="flex items-start gap-4 rounded-[16px] border border-[#D8E0EC] bg-[#F8FAFE] px-5 py-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-white text-[#1F2BD8] shadow-[0_20px_60px_rgba(15,20,25,0.08)]">
              <Icon size={20} />
            </div>
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={enabled ? 'success' : 'default'}>
                  {module.isComingSoon ? 'Скоро' : enabled ? 'Подключено' : 'Не подключено'}
                </Badge>
                {module.isRecommended ? <Badge variant="outline">Рекомендуем</Badge> : null}
              </div>
              <p className="mt-3 text-lg font-semibold text-[#111827]">{priceLabel}</p>
              {module.usageNote ? <p className="mt-1 text-sm text-[#667085]">{module.usageNote}</p> : null}
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {module.features.map((feature) => (
              <div key={feature} className="rounded-[16px] border border-[#D8E0EC] bg-white px-4 py-3 text-sm text-[#4B5A70]">
                {feature}
              </div>
            ))}
          </div>
        </Section>

        <Section title="Статус" description="Как дополнение учитывается в стоимости школы.">
          <div className="space-y-3">
            <div className="rounded-[16px] border border-[#D8E0EC] bg-[#F8FAFE] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[#667085]">Категория</p>
              <p className="mt-1 text-sm font-semibold text-[#111827]">{MODULE_CATEGORY_LABELS[module.category]}</p>
            </div>
            <div className="rounded-[16px] border border-[#D8E0EC] bg-[#F8FAFE] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[#667085]">Тип цены</p>
              <p className="mt-1 text-sm font-semibold text-[#111827]">
                {module.priceType === 'monthly' ? 'Ежемесячно' : module.priceType === 'one_time' ? 'Разовая услуга' : 'По использованию'}
              </p>
            </div>
            <div className="rounded-[16px] border border-[#D8E0EC] bg-[#F8FAFE] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[#667085]">Режим</p>
              <p className="mt-1 text-sm font-semibold text-[#111827]">
                {module.isComingSoon ? 'Готовим к запуску' : enabled ? 'Уже включён в школу' : 'Можно подключить в один клик'}
              </p>
            </div>
          </div>
        </Section>
      </div>
    </div>
  )
}
