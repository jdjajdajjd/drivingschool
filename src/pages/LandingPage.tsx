import { motion } from 'framer-motion'
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  Car,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  UserCog,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'

const primaryEntrances = [
  {
    title: 'Войти как ученик',
    text: 'Страница ученика: профиль, ближайшая запись и запись на занятие.',
    path: '/school/virazh',
    icon: GraduationCap,
    tone: 'bg-blue-600 text-white',
    button: 'Открыть ученика',
  },
  {
    title: 'Войти как администратор',
    text: 'Рабочая панель автошколы: записи, ученики, расписание и настройки.',
    path: '/admin',
    icon: UserCog,
    tone: 'bg-stone-900 text-white',
    button: 'Открыть админку',
  },
  {
    title: 'Войти как супер-админ',
    text: 'Управление школами, модулями и общей витриной сервиса.',
    path: '/superadmin',
    icon: ShieldCheck,
    tone: 'bg-indigo-600 text-white',
    button: 'Открыть superadmin',
  },
]

const quickLinks = [
  { label: 'Записи автошколы', path: '/admin/bookings', icon: ClipboardList },
  { label: 'Расписание и слоты', path: '/admin/slots', icon: CalendarClock },
  { label: 'Ученики', path: '/admin/students', icon: UsersRound },
  { label: 'Инструкторы', path: '/admin/instructors', icon: UserRound },
  { label: 'Филиалы', path: '/admin/branches', icon: Car },
  { label: 'Настройки школы', path: '/admin/settings', icon: Settings },
  { label: 'Модули', path: '/admin/modules', icon: BookOpen },
  { label: 'Кабинет инструктора', path: '/instructor/tok-petrov-2024', icon: LayoutDashboard },
]

export function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#f5f6f8] text-stone-900">
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:py-8">
        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col gap-4 border-b border-stone-200 pb-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 shadow-soft">
              <Car size={22} className="text-white" />
            </div>
            <div>
              <p className="text-xl font-semibold leading-tight">DriveDesk</p>
              <p className="text-sm text-stone-500">Панель демонстрации продукта</p>
            </div>
          </div>

          <div className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800">
            Прод: drivingschool-6wy.pages.dev
          </div>
        </motion.header>

        <section className="grid flex-1 gap-5 py-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:py-8">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.03 }}
            className="space-y-5"
          >
            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Быстрый вход в продукт
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-stone-600">
                Без лендинга и красивых обещаний. Здесь только рабочие экраны, которые можно
                открыть на демонстрации автошколе.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {primaryEntrances.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className="group flex min-h-[230px] flex-col rounded-[1.35rem] border border-stone-200 bg-white p-5 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-card active:translate-y-0"
                  >
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.tone}`}>
                      <Icon size={22} />
                    </div>
                    <h2 className="mt-5 text-xl font-semibold leading-tight">{item.title}</h2>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-stone-500">{item.text}</p>
                    <div className="mt-5 inline-flex items-center gap-2 text-base font-semibold text-blue-700">
                      {item.button}
                      <ArrowRight size={18} className="transition group-hover:translate-x-1" />
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="rounded-[1.35rem] border border-stone-200 bg-white p-5 shadow-soft">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Что показать в первую очередь</h2>
                  <p className="mt-1 text-sm leading-relaxed text-stone-500">
                    Оптимальный порядок демо: ученик записывается, запись появляется в админке,
                    админ переносит или завершает занятие.
                  </p>
                </div>
                <Button size="lg" onClick={() => navigate('/school/virazh')}>
                  Начать с ученика
                  <ArrowRight size={18} />
                </Button>
              </div>
            </div>
          </motion.div>

          <motion.aside
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.08 }}
            className="rounded-[1.35rem] border border-stone-200 bg-white p-5 shadow-soft"
          >
            <h2 className="text-xl font-semibold">Быстрые разделы</h2>
            <p className="mt-1 text-sm text-stone-500">
              Прямые входы в основные экраны без поиска по меню.
            </p>

            <div className="mt-5 space-y-2">
              {quickLinks.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3 text-left transition hover:border-stone-200 hover:bg-white"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700">
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-stone-900">{item.label}</p>
                      <p className="truncate text-xs text-stone-500">{item.path}</p>
                    </div>
                    <ArrowRight size={16} className="shrink-0 text-stone-400" />
                  </button>
                )
              })}
            </div>
          </motion.aside>
        </section>
      </main>
    </div>
  )
}
