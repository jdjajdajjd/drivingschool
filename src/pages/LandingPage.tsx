import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CalendarDays,
  Users,
  BarChart3,
  MapPin,
  Clock,
  CheckCircle2,
  Puzzle,
  Car,
  Zap,
  Shield,
  MessageSquare,
  Send,
  Palette,
  Code2,
  CreditCard,
  Bell,
  UserPlus,
  Building2,
  FileSpreadsheet,
} from 'lucide-react'
import { PublicNav } from '../components/layout/PublicNav'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { formatPrice } from '../lib/utils'

const BASE_FEATURES = [
  { icon: CalendarDays, label: 'Онлайн-запись на вождение' },
  { icon: Users, label: 'Инструкторы с личными страницами' },
  { icon: MapPin, label: 'Несколько филиалов' },
  { icon: Clock, label: 'Гибкое расписание слотов' },
  { icon: BarChart3, label: 'Базовая статистика' },
  { icon: Shield, label: 'История записей ученика' },
  { icon: Zap, label: 'Личная ссылка инструктора' },
  { icon: Car, label: 'Публичная страница школы' },
]

const MODULES_PREVIEW = [
  { icon: Send, name: 'Telegram-уведомления', price: 199, popular: true },
  { icon: CreditCard, name: 'Онлайн-оплата', price: 990, popular: true },
  { icon: Bell, name: 'Автонапоминания', price: 390, popular: false },
  { icon: BarChart3, name: 'Расширенная аналитика', price: 690, popular: false },
  { icon: Palette, name: 'Брендирование страницы', price: 490, popular: false },
  { icon: Code2, name: 'Виджет на сайт', price: 490, popular: false },
  { icon: MessageSquare, name: 'SMS-уведомления', price: 0, popular: false },
  { icon: Users, name: 'Роли и администраторы', price: 490, popular: false },
  { icon: FileSpreadsheet, name: 'Импорт из Excel', price: 1490, popular: false },
  { icon: UserPlus, name: 'Дополнительный инструктор', price: 149, popular: false },
  { icon: Building2, name: 'Дополнительный филиал', price: 299, popular: false },
]

const STEPS = [
  {
    num: '01',
    title: 'Регистрируете школу',
    desc: 'Создаёте аккаунт, добавляете филиалы и инструкторов. Занимает 10 минут.',
  },
  {
    num: '02',
    title: 'Ученики записываются онлайн',
    desc: 'Делитесь ссылкой на страницу записи. Ученики выбирают инструктора, день и время.',
  },
  {
    num: '03',
    title: 'Управляете из админки',
    desc: 'Подтверждаете записи, смотрите расписание, подключаете нужные модули.',
  },
]

const stagger = {
  container: {
    hidden: {},
    show: { transition: { staggerChildren: 0.07 } },
  },
  item: {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
  },
}

function DashboardPreview() {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-[0_20px_60px_0_rgba(0,0,0,0.10),0_4px_16px_0_rgba(0,0,0,0.06)] overflow-hidden">
      {/* Browser chrome */}
      <div className="bg-stone-50 border-b border-stone-200 px-4 py-2.5 flex items-center gap-3">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-stone-300" />
          <div className="w-2.5 h-2.5 rounded-full bg-stone-300" />
          <div className="w-2.5 h-2.5 rounded-full bg-stone-300" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="bg-white border border-stone-200 rounded-md px-3 py-0.5 text-[11px] text-stone-400 font-medium">
            drivedesk.ru/admin
          </div>
        </div>
      </div>

      <div className="flex" style={{ height: 348 }}>
        {/* Mini sidebar */}
        <div className="w-28 border-r border-stone-100 bg-white py-3 px-2 flex flex-col gap-0.5 shrink-0">
          <div className="flex items-center gap-1.5 px-2 mb-3">
            <div className="w-5 h-5 bg-forest-800 rounded-md flex items-center justify-center">
              <Car size={10} className="text-white" />
            </div>
            <span className="text-[10px] font-semibold text-stone-900">DriveDesk</span>
          </div>
          {['Обзор', 'Записи', 'Слоты', 'Инструкторы', 'Модули'].map((item, i) => (
            <div
              key={item}
              className={`text-[11px] px-2 py-1.5 rounded-lg font-medium ${
                i === 0 ? 'bg-forest-50 text-forest-800' : 'text-stone-400'
              }`}
            >
              {item}
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 p-3 bg-stone-50 overflow-hidden">
          <p className="text-[11px] font-semibold text-stone-600 mb-2.5">
            Обзор · Автошкола «Вираж»
          </p>

          <div className="grid grid-cols-2 gap-2 mb-2.5">
            {[
              { label: 'Записей в месяце', value: '127', delta: '+18%' },
              { label: 'Заполненность', value: '76%', delta: '+5%' },
              { label: 'Подтверждено', value: '89', delta: 'активных' },
              { label: 'Инструкторов', value: '4', delta: '2 филиала' },
            ].map(({ label, value, delta }) => (
              <div key={label} className="bg-white rounded-xl border border-stone-100 p-2.5">
                <p className="text-[9px] text-stone-400 mb-1">{label}</p>
                <p className="text-[17px] font-semibold text-stone-900 leading-none tabular-nums">
                  {value}
                </p>
                <p className="text-[9px] text-forest-600 font-medium mt-1">{delta}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
            <div className="px-2.5 py-1.5 border-b border-stone-100">
              <span className="text-[9px] font-semibold text-stone-400 uppercase tracking-wider">
                Последние записи
              </span>
            </div>
            {[
              { name: 'Иванова А.', sub: 'Смирнов · Сег. 10:00', color: 'green' },
              { name: 'Петров К.', sub: 'Козлов · Сег. 12:30', color: 'amber' },
              { name: 'Сидорова М.', sub: 'Смирнов · Завт. 9:00', color: 'green' },
              { name: 'Козлов Д.', sub: 'Орлов · Завт. 11:00', color: 'green' },
            ].map((row) => (
              <div
                key={row.name}
                className="px-2.5 py-1.5 flex items-center gap-2 border-b border-stone-50 last:border-0"
              >
                <div className="w-5 h-5 bg-forest-100 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-[8px] font-bold text-forest-700">{row.name[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-stone-800 truncate">{row.name}</p>
                  <p className="text-[9px] text-stone-400 truncate">{row.sub}</p>
                </div>
                <div
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    row.color === 'green' ? 'bg-forest-500' : 'bg-amber-400'
                  }`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-stone-50">
      <PublicNav />

      {/* Hero */}
      <section className="pt-24 pb-16 px-6 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="lg:grid lg:grid-cols-[1fr_460px] xl:grid-cols-[1fr_500px] gap-12 xl:gap-16 items-center">
            {/* Left */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <Badge variant="forest" size="md" className="mb-5">
                Для автошкол России
              </Badge>

              <h1 className="text-5xl md:text-[64px] font-semibold text-stone-900 leading-[1.07] tracking-tight mb-5">
                Цифровая платформа
                <span className="block text-forest-700">для автошколы</span>
              </h1>

              <p className="text-lg text-stone-500 leading-relaxed mb-8 max-w-md">
                Онлайн-запись, расписание инструкторов, аналитика — в одном месте.
                Платите за базу, подключайте только нужные модули.
              </p>

              <div className="flex flex-wrap gap-3 mb-8">
                <Button size="lg" onClick={() => navigate('/admin')}>
                  Открыть демо-админку
                  <ArrowRight size={18} />
                </Button>
                <Button size="lg" variant="secondary" onClick={() => navigate('/school/virazh')}>
                  Страница записи
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                {['Без установки и сервера', 'Готово за 10 минут', 'Данные в безопасности'].map(
                  (item) => (
                    <div key={item} className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-forest-600 shrink-0" />
                      <span className="text-sm text-stone-500">{item}</span>
                    </div>
                  ),
                )}
              </div>
            </motion.div>

            {/* Right - Product Preview */}
            <motion.div
              initial={{ opacity: 0, x: 24, y: 12 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ delay: 0.25, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="hidden lg:block"
            >
              <DashboardPreview />
            </motion.div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-10"
          >
            <p className="text-sm font-semibold text-forest-700 mb-2">Просто</p>
            <h2 className="text-3xl md:text-4xl font-semibold text-stone-900 tracking-tight">
              Три шага до запуска
            </h2>
          </motion.div>

          <motion.div
            variants={stagger.container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-4"
          >
            {STEPS.map(({ num, title, desc }) => (
              <motion.div key={num} variants={stagger.item}>
                <div className="bg-white rounded-2xl border border-stone-100 shadow-card p-6 h-full">
                  <span className="text-4xl font-bold text-stone-100 block mb-4 tabular-nums">
                    {num}
                  </span>
                  <h3 className="text-base font-semibold text-stone-900 mb-2">{title}</h3>
                  <p className="text-sm text-stone-500 leading-relaxed">{desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-10"
          >
            <p className="text-sm font-semibold text-forest-700 mb-2">База тарифа</p>
            <h2 className="text-3xl md:text-4xl font-semibold text-stone-900 tracking-tight mb-3">
              Всё необходимое включено
            </h2>
            <p className="text-base text-stone-500 max-w-lg">
              За 4 990 ₽/мес вы получаете полноценную систему управления автошколой без скрытых
              доплат.
            </p>
          </motion.div>

          <motion.div
            variants={stagger.container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3"
          >
            {BASE_FEATURES.map(({ icon: Icon, label }) => (
              <motion.div
                key={label}
                variants={stagger.item}
                className="flex items-start gap-3 p-4 rounded-xl bg-stone-50 border border-stone-100"
              >
                <div className="w-8 h-8 bg-forest-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <Icon size={14} className="text-forest-700" />
                </div>
                <span className="text-sm text-stone-700 font-medium leading-snug">{label}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Modules */}
      <section id="modules" className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-10"
          >
            <p className="text-sm font-semibold text-forest-700 mb-2">Каталог модулей</p>
            <h2 className="text-3xl md:text-4xl font-semibold text-stone-900 tracking-tight mb-3">
              Подключайте только нужное
            </h2>
            <p className="text-base text-stone-500 max-w-lg">
              Никаких пакетов. Каждый модуль — отдельная функция, которую вы включаете по мере
              роста.
            </p>
          </motion.div>

          <motion.div
            variants={stagger.container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          >
            {MODULES_PREVIEW.map(({ icon: Icon, name, price, popular }) => (
              <motion.div
                key={name}
                variants={stagger.item}
                className="bg-white rounded-xl border border-stone-100 shadow-card p-4 flex items-center gap-3 hover:shadow-card-hover transition-shadow duration-200"
              >
                <div className="w-9 h-9 bg-forest-50 rounded-xl flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-forest-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-stone-900 truncate">{name}</p>
                    {popular && (
                      <Badge variant="forest" size="sm">
                        Хит
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {price === 0 ? 'Бесплатно' : `${formatPrice(price)}/мес`}
                  </p>
                </div>
                <Puzzle size={13} className="text-stone-300 shrink-0" />
              </motion.div>
            ))}
          </motion.div>

          <div className="mt-6 text-center">
            <Button variant="secondary" onClick={() => navigate('/admin/modules')}>
              Открыть каталог модулей
              <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-10"
          >
            <p className="text-sm font-semibold text-forest-700 mb-2">Прозрачные цены</p>
            <h2 className="text-3xl md:text-4xl font-semibold text-stone-900 tracking-tight">
              Понятная модель
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-5">
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-forest-800 rounded-2xl p-7 text-white"
            >
              <p className="text-forest-300 text-xs font-semibold uppercase tracking-wider mb-5">
                Базовый тариф
              </p>
              <div className="flex items-baseline gap-2 mb-1.5">
                <span className="text-5xl font-semibold tabular-nums">4 990</span>
                <span className="text-forest-300 text-lg">₽/мес</span>
              </div>
              <p className="text-forest-300 text-sm mb-7">Всё необходимое включено</p>

              <ul className="space-y-2.5 mb-7">
                {BASE_FEATURES.map(({ label }) => (
                  <li key={label} className="flex items-center gap-2.5 text-sm text-forest-100">
                    <CheckCircle2 size={14} className="text-forest-400 shrink-0" />
                    {label}
                  </li>
                ))}
              </ul>

              <Button
                className="w-full bg-white text-forest-900 hover:bg-forest-50"
                size="lg"
                onClick={() => navigate('/admin')}
              >
                Попробовать демо
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-stone-50 rounded-2xl p-7 border border-stone-100"
            >
              <p className="text-stone-400 text-xs font-semibold uppercase tracking-wider mb-5">
                Подключаемые модули
              </p>
              <div className="flex items-baseline gap-2 mb-1.5">
                <span className="text-3xl font-semibold text-stone-900 tabular-nums">от 149 ₽</span>
              </div>
              <p className="text-stone-400 text-sm mb-7">за каждый подключённый модуль/мес</p>

              <div className="space-y-2.5 mb-7">
                {MODULES_PREVIEW.slice(0, 6).map(({ icon: Icon, name, price }) => (
                  <div key={name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Icon size={14} className="text-stone-400" />
                      <span className="text-sm text-stone-700">{name}</span>
                    </div>
                    <span className="text-sm font-semibold text-stone-900 tabular-nums">
                      {price === 0 ? '0 ₽' : `${price} ₽`}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-stone-200">
                <p className="text-xs text-stone-400 text-center">
                  Подключайте в любой момент, без контрактов
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-semibold text-stone-900 tracking-tight mb-3">
              Готово к работе
              <span className="block text-forest-700">за 10 минут</span>
            </h2>
            <p className="text-base text-stone-500 mb-7">
              Посмотрите демо прямо сейчас — без регистрации.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button size="lg" onClick={() => navigate('/admin')}>
                Открыть демо
                <ArrowRight size={18} />
              </Button>
              <Button size="lg" variant="secondary" onClick={() => navigate('/school/virazh')}>
                <Car size={18} />
                Страница «Вираж»
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-100 py-8 px-6 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-forest-800 rounded-lg flex items-center justify-center">
              <Car size={13} className="text-white" />
            </div>
            <span className="text-base font-semibold text-stone-900">DriveDesk</span>
          </div>
          <p className="text-sm text-stone-400">© 2024 DriveDesk. Цифровая платформа для автошкол.</p>
          <div className="flex gap-6">
            <a href="#" className="text-sm text-stone-400 hover:text-stone-700 transition-colors">
              Политика конфиденциальности
            </a>
            <a href="#" className="text-sm text-stone-400 hover:text-stone-700 transition-colors">
              Условия использования
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
