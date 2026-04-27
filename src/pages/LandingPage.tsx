import { motion } from 'framer-motion'
import {
  ArrowRight,
  Car,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  ShieldCheck,
  UserCog,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { ADMIN_LOGIN_PATH, SUPERADMIN_LOGIN_PATH } from '../services/accessControl'

const primaryEntrances = [
  {
    title: 'Войти как ученик',
    text: 'Профиль ученика, ближайшая запись и запись на занятие.',
    path: '/school/virazh',
    icon: GraduationCap,
    tone: 'bg-blue-600 text-white',
    button: 'Открыть ученика',
  },
  {
    title: 'Войти как администратор',
    text: 'Записи, ученики, расписание и настройки автошколы.',
    path: ADMIN_LOGIN_PATH,
    icon: UserCog,
    tone: 'bg-stone-900 text-white',
    button: 'Открыть админку',
  },
  {
    title: 'Войти как супер-админ',
    text: 'Управление школами, модулями и общей витриной сервиса.',
    path: SUPERADMIN_LOGIN_PATH,
    icon: ShieldCheck,
    tone: 'bg-indigo-600 text-white',
    button: 'Открыть superadmin',
  },
]

const quickLinks = [
  { label: 'Служебный вход школы', path: ADMIN_LOGIN_PATH, icon: ClipboardList },
  { label: 'Вход супер-админа', path: SUPERADMIN_LOGIN_PATH, icon: ShieldCheck },
  { label: 'Кабинет инструктора', path: '/instructor/tok-petrov-2024', icon: LayoutDashboard },
]

export function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.08),_transparent_30%),linear-gradient(180deg,#f6f7fb_0%,#f2f4f8_100%)] text-stone-900">
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-4 sm:px-6 lg:py-6">
        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col gap-3 border-b border-stone-200 pb-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 shadow-soft">
              <Car size={20} className="text-white" />
            </div>
            <div>
              <p className="text-lg font-semibold leading-tight">DriveDesk</p>
              <p className="text-sm text-stone-500">Панель демонстрации продукта</p>
            </div>
          </div>

          <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-sm font-medium text-emerald-800">
            Прод: drivingschool-6wy.pages.dev
          </div>
        </motion.header>

        <section className="grid flex-1 gap-4 py-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.03 }}
            className="space-y-4"
          >
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Быстрый вход в продукт
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">
                Здесь только рабочие экраны, которые можно открывать на демонстрации и в ежедневной работе.
              </p>
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              {primaryEntrances.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className="group flex min-h-[188px] flex-col rounded-xl border border-stone-200 bg-white p-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-card active:translate-y-0"
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.tone}`}>
                      <Icon size={20} />
                    </div>
                    <h2 className="mt-4 text-lg font-semibold leading-tight">{item.title}</h2>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-stone-500">{item.text}</p>
                    <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700">
                      {item.button}
                      <ArrowRight size={16} className="transition group-hover:translate-x-1" />
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-soft">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Что показывать первым</h2>
                  <p className="mt-1 text-sm leading-relaxed text-stone-500">
                    Лучший порядок: ученик создаёт запись, запись появляется в админке, админ переносит или завершает занятие.
                  </p>
                </div>
                <Button size="lg" onClick={() => navigate('/school/virazh')}>
                  Начать с ученика
                  <ArrowRight size={16} />
                </Button>
              </div>
            </div>
          </motion.div>

          <motion.aside
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.08 }}
            className="rounded-xl border border-stone-200 bg-white p-4 shadow-soft"
          >
            <h2 className="text-lg font-semibold">Быстрые разделы</h2>
            <p className="mt-1 text-sm text-stone-500">
              Прямые входы в ключевые экраны без поиска по меню.
            </p>

            <div className="mt-4 space-y-2">
              {quickLinks.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className="flex w-full items-center gap-3 rounded-xl border border-stone-100 bg-stone-50 px-3.5 py-3 text-left transition hover:border-stone-200 hover:bg-white"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-blue-700">
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
