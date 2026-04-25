import { generateId } from '../lib/utils'
import type { BillingSummary, Module, ModuleCategory, SchoolModule } from '../types'
import { db } from './storage'

export const BASE_MONTHLY_PRICE = 4990

export const MODULE_CATALOG: Module[] = [
  {
    id: 'sms',
    name: 'SMS-уведомления',
    category: 'notifications',
    description:
      'Подтверждения и важные сообщения ученикам через SMS. Стоимость сообщений оплачивается отдельно.',
    priceType: 'usage',
    monthlyPrice: 0,
    usageNote: 'SMS оплачиваются по факту',
    icon: 'MessageSquare',
    features: ['Подтверждения записи', 'Сервисные сообщения', 'Оплата по факту отправки'],
  },
  {
    id: 'telegram',
    name: 'Telegram-уведомления',
    category: 'notifications',
    description: 'Уведомления для администратора о новых записях, отменах и переносах.',
    priceType: 'monthly',
    monthlyPrice: 199,
    icon: 'Send',
    features: ['Новые записи', 'Отмены и переносы', 'Быстрые уведомления администратору'],
    isRecommended: true,
  },
  {
    id: 'branding',
    name: 'Брендирование страницы',
    category: 'management',
    description:
      'Расширенные настройки внешнего вида страницы записи: логотип, цвета, тексты и визуальные блоки.',
    priceType: 'monthly',
    monthlyPrice: 490,
    icon: 'Palette',
    features: ['Логотип', 'Цветовые акценты', 'Тексты и preview публичной страницы'],
  },
  {
    id: 'widget',
    name: 'Виджет записи на сайт',
    category: 'integrations',
    description: 'Встраиваемая кнопка или форма записи для сайта автошколы.',
    priceType: 'monthly',
    monthlyPrice: 490,
    icon: 'Code2',
    features: ['Кнопка записи', 'Встраиваемая форма', 'Использование на сайте автошколы'],
  },
  {
    id: 'payments',
    name: 'Онлайн-оплата',
    category: 'sales',
    description: 'Приём предоплаты или оплаты занятий онлайн.',
    priceType: 'monthly',
    monthlyPrice: 990,
    usageNote: 'Плюс комиссия эквайринга',
    icon: 'CreditCard',
    features: ['Предоплата занятий', 'Онлайн-оплата', 'Подготовка к эквайрингу'],
  },
  {
    id: 'analytics',
    name: 'Расширенная аналитика',
    category: 'analytics',
    description: 'Загрузка инструкторов, динамика записей, отмены и отчёты по филиалам.',
    priceType: 'monthly',
    monthlyPrice: 690,
    icon: 'BarChart3',
    features: ['Загрузка инструкторов', 'Отчёты по филиалам', 'Динамика записей'],
  },
  {
    id: 'roles',
    name: 'Роли и дополнительные админы',
    category: 'management',
    description: 'Дополнительные пользователи админки, роли и разграничение доступа.',
    priceType: 'monthly',
    monthlyPrice: 490,
    icon: 'Users',
    features: ['Несколько админов', 'Роли', 'Разграничение доступа'],
  },
  {
    id: 'reminders',
    name: 'Автонапоминания',
    category: 'notifications',
    description: 'Автоматические напоминания ученикам о занятиях через подключённые каналы.',
    priceType: 'monthly',
    monthlyPrice: 390,
    icon: 'Bell',
    features: ['Напоминания по расписанию', 'Работа по SMS/Telegram', 'Снижение пропусков'],
  },
  {
    id: 'excel-import',
    name: 'Импорт из Excel',
    category: 'one_time',
    description: 'Разовый импорт учеников, инструкторов или расписания из Excel.',
    priceType: 'one_time',
    oneTimePrice: 1490,
    icon: 'FileSpreadsheet',
    features: ['Разовый импорт данных', 'Стартовая загрузка базы', 'Поддержка расписания'],
  },
  {
    id: 'extra-instructor',
    name: 'Дополнительный инструктор',
    category: 'limits',
    description: 'Расширение лимита инструкторов сверх базового пакета.',
    priceType: 'monthly',
    monthlyPrice: 149,
    icon: 'UserPlus',
    features: ['Расширение лимита', 'Новые инструкторы сверх базы', 'Гибкий рост команды'],
  },
  {
    id: 'extra-branch',
    name: 'Дополнительный филиал',
    category: 'limits',
    description: 'Расширение лимита филиалов сверх базового пакета.',
    priceType: 'monthly',
    monthlyPrice: 299,
    icon: 'Building2',
    features: ['Расширение лимита', 'Новый филиал сверх базы', 'Рост сети автошколы'],
  },
]

export const MODULE_CATEGORY_LABELS: Record<ModuleCategory, string> = {
  notifications: 'Уведомления',
  sales: 'Продажи',
  analytics: 'Аналитика',
  integrations: 'Интеграции',
  management: 'Управление',
  limits: 'Лимиты',
  one_time: 'Разовые услуги',
}

export const BASE_FEATURES = [
  'Публичная страница автошколы',
  'Онлайн-запись ученика',
  'Выбор филиала',
  'Выбор инструктора',
  'Выбор даты и слота',
  'Админка автошколы',
  'Управление филиалами',
  'Управление инструкторами',
  'Управление слотами',
  'Список записей',
  'Отмена и перенос записи',
  'Личная ссылка инструктора',
  'Расписание инструктора',
  'История записей',
  'История ученика',
  'Базовая статистика',
]

export function getModulesCatalog(): Module[] {
  return MODULE_CATALOG
}

export function getModuleById(moduleId: string): Module | null {
  return MODULE_CATALOG.find((module) => module.id === moduleId) ?? null
}

export function getEnabledModules(schoolId: string): Array<SchoolModule & { module: Module }> {
  return db.schoolModules
    .bySchool(schoolId)
    .filter((schoolModule) => schoolModule.status === 'enabled')
    .map((schoolModule) => {
      const module = getModuleById(schoolModule.moduleId)
      return module ? { ...schoolModule, module } : null
    })
    .filter((item): item is SchoolModule & { module: Module } => Boolean(item))
}

export function isModuleEnabled(schoolId: string, moduleId: string): boolean {
  return getEnabledModules(schoolId).some((item) => item.moduleId === moduleId)
}

export function enableModule(schoolId: string, moduleId: string): SchoolModule | null {
  const module = getModuleById(moduleId)
  if (!module) {
    return null
  }

  const existing = db.schoolModules.bySchool(schoolId).find((item) => item.moduleId === moduleId) ?? null

  const enabledModule: SchoolModule = existing
    ? {
        ...existing,
        status: 'enabled',
        enabledAt: existing.enabledAt || new Date().toISOString(),
      }
    : {
        id: generateId('school-module'),
        schoolId,
        moduleId,
        enabledAt: new Date().toISOString(),
        status: 'enabled',
      }

  db.schoolModules.upsert(enabledModule)
  return enabledModule
}

export function disableModule(schoolId: string, moduleId: string): SchoolModule | null {
  const existing = db.schoolModules.bySchool(schoolId).find((item) => item.moduleId === moduleId) ?? null
  if (!existing) {
    return null
  }

  const disabled: SchoolModule = {
    ...existing,
    status: 'disabled',
  }
  db.schoolModules.upsert(disabled)
  return disabled
}

export function calculateBasePrice(): number {
  return BASE_MONTHLY_PRICE
}

export function calculateModulesMonthlyTotal(schoolId: string): number {
  return getEnabledModules(schoolId)
    .filter((item) => item.module.priceType === 'monthly')
    .reduce((sum, item) => sum + (item.module.monthlyPrice ?? 0), 0)
}

export function calculateOneTimeTotal(schoolId: string): number {
  return getEnabledModules(schoolId)
    .filter((item) => item.module.priceType === 'one_time')
    .reduce((sum, item) => sum + (item.module.oneTimePrice ?? 0), 0)
}

export function calculateTotalMonthlyPrice(schoolId: string): number {
  return calculateBasePrice() + calculateModulesMonthlyTotal(schoolId)
}

export function getBillingSummary(schoolId: string): BillingSummary {
  const enabledModules = getEnabledModules(schoolId)
  return {
    baseMonthlyPrice: calculateBasePrice(),
    modulesMonthlyTotal: calculateModulesMonthlyTotal(schoolId),
    oneTimeTotal: calculateOneTimeTotal(schoolId),
    totalMonthlyPrice: calculateTotalMonthlyPrice(schoolId),
    enabledModulesCount: enabledModules.length,
  }
}
