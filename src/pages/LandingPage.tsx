import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  LayoutDashboard,
  Link2,
  PhoneCall,
  Users,
} from 'lucide-react'
import { PublicNav } from '../components/layout/PublicNav'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

const painPoints = [
  'Звонки и переписки вместо нормальной записи',
  'Листы, MAX и заметки в телефоне',
  'Путаница по филиалам и инструкторам',
  'Двойные записи и ручные переносы',
]

const solution = [
  { icon: CalendarDays, title: 'Страница записи', text: 'Ученик сам выбирает филиал, инструктора, дату и свободный слот.' },
  { icon: Clock3, title: 'Календарь слотов', text: 'Администратор видит доступность и быстро управляет расписанием.' },
  { icon: LayoutDashboard, title: 'Админка', text: 'Все записи, статусы и действия находятся в одной спокойной панели.' },
  { icon: Link2, title: 'Ссылка инструктора', text: 'У каждого инструктора есть личная страница с ближайшими занятиями.' },
  { icon: Users, title: 'История ученика', text: 'Повторные записи не теряются, телефон нормализуется и связывает данные.' },
  { icon: BarChart3, title: 'Базовая статистика', text: 'Ключевые показатели видны без лишнего визуального шума.' },
]

function DemoPreview() {
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="border-b border-stone-100 bg-stone-50 px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">Демо-интерфейс</p>
      </div>
      <div className="grid gap-4 p-5">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { label: 'Записи сегодня', value: '14' },
            { label: 'Свободные слоты', value: '23' },
            { label: 'Инструкторы в работе', value: '5' },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-stone-100 bg-stone-50 px-4 py-4">
              <p className="text-xs text-stone-500">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold text-stone-900">{item.value}</p>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-stone-100 bg-white">
          <div className="grid grid-cols-[1.1fr_0.9fr_0.8fr] border-b border-stone-100 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400">
            <span>Ученик</span>
            <span>Время</span>
            <span>Статус</span>
          </div>
          {[
            ['Анна Иванова', 'Сегодня · 10:30', 'Активна'],
            ['Павел Соколов', 'Сегодня · 12:00', 'Проведена'],
            ['Елена Новикова', 'Завтра · 09:00', 'Активна'],
          ].map(([name, time, status]) => (
            <div key={name} className="grid grid-cols-[1.1fr_0.9fr_0.8fr] items-center px-4 py-3 text-sm">
              <span className="font-medium text-stone-900">{name}</span>
              <span className="text-stone-500">{time}</span>
              <span>
                <Badge variant={status === 'Проведена' ? 'default' : 'success'}>{status}</Badge>
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

export function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <PublicNav />

      <main>
        <section className="px-6 pb-14 pt-28">
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1fr_480px]">
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
              <Badge variant="outline" size="md">
                MVP SaaS для автошкол
              </Badge>
              <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-stone-900 md:text-[3.5rem] md:leading-[1.04]">
                Онлайн-запись на вождение для автошкол
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-stone-500">
                Ученики сами выбирают свободные слоты, администратор видит все записи в панели,
                а инструктор открывает свою ссылку и сразу понимает расписание.
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

              <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-stone-500">
                {[
                  'Без backend на старте',
                  'Рабочий booking flow',
                  'Подходит для демо директору',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-forest-700" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.08 }}>
              <DemoPreview />
            </motion.div>
          </div>
        </section>

        <section id="pricing" className="px-6 py-8">
          <div className="mx-auto max-w-6xl">
            <Card padding="lg" className="bg-white">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-400">Цена</p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
                    4 990 ₽/мес + подключаемые модули
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">
                    База уже покрывает запись, слоты, админку, страницы инструкторов и базовую статистику.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button variant="secondary" onClick={() => navigate('/admin/modules')}>
                    Каталог модулей
                  </Button>
                  <Button onClick={() => navigate('/admin')}>
                    Перейти в демо
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </section>

        <section id="problems" className="px-6 py-14">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-400">Боль</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">Что ломает управление автошколой</h2>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {painPoints.map((item) => (
                <Card key={item} padding="md">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                      <AlertCircle size={16} />
                    </div>
                    <p className="text-base font-medium leading-relaxed text-stone-800">{item}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="solution" className="bg-white px-6 py-16">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-400">Решение</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">Спокойный рабочий контур вместо хаоса</h2>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {solution.map(({ icon: Icon, title, text }) => (
                <Card key={title} padding="md">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-100 text-forest-700">
                    <Icon size={18} />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-stone-900">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-500">{text}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-16">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-stone-900 md:text-4xl">
              Показать директору можно уже сейчас
            </h2>
            <p className="mt-3 text-base leading-relaxed text-stone-500">
              Откройте публичную запись, админку и страницу инструктора на одном демо-проекте.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button size="lg" onClick={() => navigate('/school/virazh')}>
                <PhoneCall size={16} />
                Демо записи
              </Button>
              <Button size="lg" variant="secondary" onClick={() => navigate('/admin')}>
                <LayoutDashboard size={16} />
                Админка
              </Button>
              <Button size="lg" variant="ghost" onClick={() => navigate('/instructor/tok-petrov-2024')}>
                <Users size={16} />
                Экран инструктора
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
