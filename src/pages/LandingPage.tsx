import { motion } from 'framer-motion'
import { ArrowRight, CalendarDays, LayoutDashboard, Link2, Puzzle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PublicNav } from '../components/layout/PublicNav'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

const howItWorks = [
  {
    title: 'Ученик записывается сам',
    text: 'Выбирает филиал, инструктора, дату и свободное время по обычной ссылке в браузере.',
    icon: CalendarDays,
  },
  {
    title: 'Администратор держит всё под контролем',
    text: 'Видит записи, переносы, отмены, учеников и свободные слоты в одной панели.',
    icon: LayoutDashboard,
  },
  {
    title: 'Инструктор открывает личную ссылку',
    text: 'Сразу видит ближайшие занятия, контакты ученика и статус записи.',
    icon: Link2,
  },
]

const demoLinks = [
  { label: 'Страница записи ученика', path: '/school/virazh' },
  { label: 'Админка автошколы', path: '/admin' },
  { label: 'Записи', path: '/admin/bookings' },
  { label: 'Модули', path: '/admin/modules' },
  { label: 'Суперадминка', path: '/superadmin' },
]

export function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <PublicNav />

      <main>
        <section className="px-6 pb-16 pt-28">
          <div className="mx-auto max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]"
            >
              <div className="max-w-3xl">
                <p className="text-sm font-medium text-stone-600">DriveDesk для автошкол</p>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight text-stone-900 md:text-[3.5rem] md:leading-[1.04]">
                  Онлайн-запись на вождение для автошкол
                </h1>
                <p className="mt-5 max-w-2xl text-lg leading-relaxed text-stone-600">
                  Ученики сами выбирают свободные слоты, администратор видит все записи в панели, инструкторы
                  получают личное расписание по ссылке.
                </p>
                <p className="mt-4 text-sm font-medium text-stone-600">
                  Без установки приложений. Работает по обычной ссылке в браузере.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Button size="lg" onClick={() => navigate('/school/virazh')}>
                    Открыть демо записи
                    <ArrowRight size={16} />
                  </Button>
                  <Button size="lg" variant="secondary" onClick={() => navigate('/admin')}>
                    Открыть админку
                  </Button>
                </div>
              </div>

              <Card padding="lg">
                <p className="text-sm font-medium text-stone-500">Цена</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-stone-900">
                  4 990 ₽<span className="ml-1 text-base font-medium text-stone-500">/мес</span>
                </p>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">+ подключаемые модули только при необходимости.</p>

                <div className="mt-6 space-y-3 border-t border-stone-100 pt-5">
                  <div className="rounded-xl bg-stone-50 px-4 py-3 text-sm text-stone-700">Онлайн-запись ученика</div>
                  <div className="rounded-xl bg-stone-50 px-4 py-3 text-sm text-stone-700">Админка школы и список записей</div>
                  <div className="rounded-xl bg-stone-50 px-4 py-3 text-sm text-stone-700">История ученика и ссылка инструктора</div>
                </div>
              </Card>
            </motion.div>
          </div>
        </section>

        <section className="bg-white px-6 py-16">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-stone-500">Как это работает</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">Понятный рабочий контур без звонков и таблиц</h2>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {howItWorks.map(({ title, text, icon: Icon }) => (
                <Card key={title} padding="md">
                  <div className="text-stone-400">
                    <Icon size={18} />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-stone-900">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-600">{text}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="px-6 py-16">
          <div className="mx-auto max-w-6xl">
            <Card padding="lg">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-sm font-medium text-stone-500">Модули</p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">База остаётся простой, расширения подключаются отдельно</h2>
                  <p className="mt-3 text-sm leading-relaxed text-stone-600">
                    Уведомления, брендирование, аналитика и дополнительные лимиты подключаются по мере роста школы,
                    а не зашиваются в тарифную сетку.
                  </p>
                </div>
                <Button variant="secondary" onClick={() => navigate('/admin/modules')}>
                  <Puzzle size={16} />
                  Открыть каталог модулей
                </Button>
              </div>
            </Card>
          </div>
        </section>

        <section className="px-6 pb-20">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-stone-500">Демо</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">Ключевые экраны в одном месте</h2>
            </div>

            <div className="mt-8 grid gap-3 lg:grid-cols-2">
              {demoLinks.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white px-4 py-4 text-left transition hover:border-stone-300"
                >
                  <div>
                    <p className="text-sm font-semibold text-stone-900">{item.label}</p>
                    <p className="mt-1 text-sm text-stone-500">{item.path}</p>
                  </div>
                  <ArrowRight size={16} className="text-stone-400" />
                </button>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
