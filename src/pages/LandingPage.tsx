import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight01Icon, CheckmarkCircle02Icon } from '@hugeicons/core-free-icons'
import { createHugeIcon } from '../components/ui/HugeIcon'
import { BrandMark } from '../components/layout/BrandMark'
import { db, setDataNamespace } from '../services/storage'

void React

const ArrowRight = createHugeIcon(ArrowRight01Icon)
const Check = createHugeIcon(CheckmarkCircle02Icon)

const demoSlug = db.schools[0]?.slug ?? 'virazh'

const schoolActions = [
  {
    title: 'Открыть демо для школы',
    text: 'Посмотреть рабочий пульт: день, записи, деньги и проблемы.',
    to: '/workspace-admin',
    primary: true,
  },
  {
    title: 'Войти в кабинет школы',
    text: 'Для директора, сотрудников и управляющего.',
    to: '/staff-entrance-73q',
  },
]

const studentActions = [
  {
    title: 'Записаться на занятие',
    text: 'Выбор филиала, инструктора, даты и времени без звонков.',
    to: `/school/${demoSlug}/book`,
  },
  {
    title: 'Вход ученика',
    text: 'Занятия, документы и история записей.',
    to: `/school/${demoSlug}/login`,
  },
]

const signals = [
  ['Сегодня', 'видно все занятия и переносы'],
  ['Деньги', 'понятно, кто оплатил и где долг'],
  ['Загрузка', 'директор видит свободное время инструкторов'],
  ['Запись', 'ученик выбирает время сам'],
]

export function LandingPage() {
  const navigate = useNavigate()

  function go(to: string) {
    if (to === '/workspace-admin') setDataNamespace('workspace')
    navigate(to)
  }

  return (
    <div className="min-h-dvh bg-[#F5F1EA] text-[#15120E]">
      <main className="mx-auto flex min-h-dvh w-full max-w-[1180px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-3 rounded-[20px] border border-[rgba(21,18,14,0.08)] bg-white/90 px-3 py-3 shadow-[0_18px_50px_rgba(63,46,28,0.08)] backdrop-blur">
          <button className="flex min-w-0 items-center gap-3 text-left" onClick={() => go('/')}>
            <BrandMark size="md" />
            <span className="min-w-0">
              <span className="block text-[17px] font-black leading-5 text-[#15120E]">Vroom</span>
              <span className="block truncate text-[12px] font-extrabold leading-4 text-[#7C7066]">для школ и учеников</span>
            </span>
          </button>
          <nav className="flex items-center gap-2">
            <button
              className="hidden min-h-11 rounded-[14px] border border-[rgba(21,18,14,0.10)] bg-white px-4 text-[14px] font-extrabold text-[#15120E] sm:inline-flex sm:items-center"
              onClick={() => go(`/school/${demoSlug}/book`)}
            >
              Записаться
            </button>
            <button
              className="inline-flex min-h-11 items-center gap-2 rounded-[14px] bg-[#15120E] px-4 text-[14px] font-extrabold text-white shadow-[0_12px_26px_rgba(21,18,14,0.18)]"
              onClick={() => go('/workspace-admin')}
            >
              <span className="sm:hidden">Школе</span>
              <span className="hidden sm:inline">Для школы</span>
              <ArrowRight size={16} />
            </button>
          </nav>
        </header>

        <section className="grid flex-1 items-center gap-4 py-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.8fr)] lg:gap-8 lg:py-8">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-[28px] border border-[rgba(21,18,14,0.08)] bg-white p-5 shadow-[0_24px_70px_rgba(63,46,28,0.10)] sm:p-8 lg:p-9"
          >
            <div className="max-w-[620px]">
              <h1 className="text-[44px] font-black leading-[0.96] tracking-[-0.04em] text-[#15120E] sm:text-[64px] lg:text-[74px]">
                Vroom для автошкол
              </h1>
              <p className="mt-5 max-w-[560px] text-[18px] font-bold leading-7 text-[#5F554C]">
                Порядок в расписании, записях, оплатах и работе инструкторов. Директор сразу видит день, деньги и места, где нужно вмешаться.
              </p>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {schoolActions.map((action) => (
                <button
                  key={action.title}
                  className={[
                    'group flex min-h-[104px] flex-col justify-between rounded-[18px] border p-4 text-left transition duration-150 active:scale-[0.99]',
                    action.primary
                      ? 'border-[#15120E] bg-[#15120E] text-white shadow-[0_18px_34px_rgba(21,18,14,0.20)]'
                      : 'border-[rgba(21,18,14,0.10)] bg-[#FBF8F2] text-[#15120E] hover:border-[rgba(21,18,14,0.18)]',
                  ].join(' ')}
                  onClick={() => go(action.to)}
                >
                  <span>
                    <span className="block text-[16px] font-black leading-5">{action.title}</span>
                    <span className={['mt-2 block text-[13px] font-bold leading-5', action.primary ? 'text-white/72' : 'text-[#756B61]'].join(' ')}>
                      {action.text}
                    </span>
                  </span>
                  <ArrowRight className="mt-3 self-end transition group-hover:translate-x-0.5" size={20} />
                </button>
              ))}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {studentActions.map((action) => (
                <button
                  key={action.title}
                  className="group flex min-h-[92px] flex-col justify-between rounded-[18px] border border-[rgba(21,18,14,0.10)] bg-white p-4 text-left text-[#15120E] transition duration-150 hover:bg-[#F8F3EA] active:scale-[0.99]"
                  onClick={() => go(action.to)}
                >
                  <span>
                    <span className="block text-[15px] font-black leading-5">{action.title}</span>
                    <span className="mt-2 block text-[12px] font-bold leading-5 text-[#756B61]">{action.text}</span>
                  </span>
                  <ArrowRight className="mt-2 self-end transition group-hover:translate-x-0.5" size={18} />
                </button>
              ))}
            </div>
          </motion.div>

          <motion.aside
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.34, delay: 0.04, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-[28px] border border-[rgba(21,18,14,0.08)] bg-[#15120E] p-5 text-white shadow-[0_24px_70px_rgba(21,18,14,0.18)] sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[12px] font-black uppercase leading-4 tracking-[0.08em] text-white/46">рабочий пульт</p>
                <h2 className="mt-2 text-[30px] font-black leading-[1.02] tracking-[-0.03em] text-white">Что видит школа</h2>
              </div>
              <BrandMark variant="light" size="md" className="bg-[#15120E]" />
            </div>

            <div className="mt-6 grid gap-2">
              {signals.map(([title, text]) => (
                <div key={title} className="grid grid-cols-[42px_minmax(0,1fr)] gap-3 rounded-[16px] border border-white/10 bg-white/[0.06] p-3">
                  <span className="grid h-10 w-10 place-items-center rounded-[13px] bg-white text-[#15120E]">
                    <Check size={18} />
                  </span>
                  <span className="min-w-0">
                    <strong className="block text-[15px] font-black leading-5 text-white">{title}</strong>
                    <span className="mt-1 block text-[13px] font-bold leading-5 text-white/62">{text}</span>
                  </span>
                </div>
              ))}
            </div>

            <button
              className="mt-5 flex min-h-[58px] w-full items-center justify-between rounded-[16px] bg-white px-4 text-left text-[#15120E] shadow-[0_14px_28px_rgba(0,0,0,0.18)]"
              onClick={() => go('/workspace-admin')}
            >
              <span>
                <span className="block text-[15px] font-black leading-5">Посмотреть демо</span>
                <span className="block text-[12px] font-bold leading-4 text-[#756B61]">без настройки и звонков</span>
              </span>
              <ArrowRight size={20} />
            </button>
          </motion.aside>
        </section>
      </main>
    </div>
  )
}
