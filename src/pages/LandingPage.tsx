import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight01Icon } from '@hugeicons/core-free-icons'
import { createHugeIcon } from '../components/ui/HugeIcon'
import { db, setDataNamespace } from '../services/storage'
import { WORKSPACE_ADMIN_LOGIN_PATH } from '../services/accessControl'

const ArrowRight = createHugeIcon(ArrowRight01Icon)
export function LandingPage() {
  const navigate = useNavigate()
  const [demoSchool, setDemoSchool] = useState<{ name: string; slug: string; description: string } | null>(null)

  useEffect(() => {
    setDataNamespace('demo')
    const schools = db.schools.all().filter((s) => s.isActive)
    setDemoSchool(schools[0] ?? { name: 'Вираж', slug: 'virazh', description: 'Профессиональная подготовка водителей с 2008 года.' })
  }, [])

  const demoSlug = demoSchool?.slug ?? 'virazh'

  return (
    <div className="min-h-dvh overflow-hidden bg-[#F6F7FA] text-[#111418]">
      <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-4 pb-6 pt-4 md:max-w-6xl md:px-8 md:py-8">
        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          className="mb-5 flex items-center justify-between rounded-[24px] border border-[#E7E9EF] bg-white px-3.5 py-3 shadow-[0_12px_34px_rgba(15,20,25,0.06)] md:mb-10"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[16px] bg-[#EEF0FA] text-[#2442D8] shadow-[0_12px_30px_rgba(36,66,216,0.14)]">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
                <path d="M7 10h6M10 7l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[17px] font-black leading-5 tracking-[-0.03em]">vroom</p>
              <p className="truncate text-[12px] font-bold leading-4 text-[#8B8D94]">запись учеников на вождение</p>
            </div>
          </div>
          <button
            className="min-h-11 rounded-[16px] bg-[#EEF0FA] px-3.5 text-[13px] font-black text-[#2442D8] transition active:scale-[0.97] md:px-5"
            onClick={() => navigate(WORKSPACE_ADMIN_LOGIN_PATH)}
          >
            Войти
          </button>
        </motion.header>

        <section className="grid gap-4 md:grid-cols-[1.05fr_0.95fr] md:items-center md:gap-8">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.26, delay: 0.03 }}
            className="overflow-hidden rounded-[32px] border border-[#E3E6EE] bg-white p-5 shadow-[0_20px_58px_rgba(15,20,25,0.08)] md:p-8"
          >
            <div className="mb-7 inline-flex items-center gap-2 rounded-full bg-[#EEF0FA] px-3 py-2 text-[12px] font-black text-[#2442D8] ring-1 ring-[#DDE2F7]">
              <span className="h-2 w-2 rounded-full bg-[#2442D8]" />
              Онлайн-запись для автошколы
            </div>
            <h1 className="max-w-[640px] text-[42px] font-black leading-[0.95] tracking-[-0.06em] text-[#111418] md:text-[72px]">
              Меньше звонков. Больше записей.
            </h1>
            <p className="mt-5 max-w-[520px] text-[16px] font-semibold leading-7 text-[#5F6672] md:text-[19px]">
              Ученики сами выбирают свободное время. Директор видит расписание, записи, инструкторов и ссылку школы в одном понятном кабинете.
            </p>
            <div className="mt-7 grid gap-2.5 sm:grid-cols-2">
              <button
                className="min-h-[58px] rounded-[20px] bg-[#2442D8] px-5 text-[15px] font-black text-white shadow-[0_18px_40px_rgba(36,66,216,0.26)] transition active:scale-[0.98]"
                onClick={() => navigate(`/school/${demoSlug}`)}
              >
                Смотреть как ученик
              </button>
              <button
                className="min-h-[58px] rounded-[20px] border border-[#E3E6EE] bg-white px-5 text-[15px] font-black text-[#111418] transition active:scale-[0.98]"
                onClick={() => navigate(WORKSPACE_ADMIN_LOGIN_PATH)}
              >
                Открыть админку
              </button>
            </div>
            <div className="mt-7 grid grid-cols-3 gap-2">
              {[
                ['Ссылка', 'ученикам'],
                ['Расписание', 'инструкторов'],
                ['Записи', 'в кабинете'],
              ].map(([value, label]) => (
                <div key={value} className="rounded-[18px] bg-[#F7F8FB] px-3 py-3 ring-1 ring-[#E3E6EE]">
                  <p className="text-[15px] font-black leading-none text-[#111418]">{value}</p>
                  <p className="mt-1 text-[11px] font-bold leading-4 text-[#737985]">{label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.26, delay: 0.1 }}
            className="space-y-3"
          >
            <div className="rounded-[30px] border border-[#E7E9EF] bg-white p-4 shadow-[0_16px_46px_rgba(15,20,25,0.07)]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[12px] font-black uppercase tracking-[0.14em] text-[#B8BABF]">как это работает</p>
                  <h2 className="mt-1 text-[24px] font-black leading-tight tracking-[-0.04em] text-[#050609]">Три шага без лишней возни</h2>
                </div>
              </div>
              <div className="space-y-2.5">
                {[
                  ['01', 'Настройте школу', 'Название, телефон, филиалы, инструкторы и категории.'],
                  ['02', 'Добавьте расписание', 'Одним действием создайте свободные окна на неделю или месяц.'],
                  ['03', 'Дайте ссылку ученикам', 'Они записываются сами, запись появляется в админке.'],
                ].map(([num, title, text]) => (
                  <div key={num} className="grid grid-cols-[42px_minmax(0,1fr)] gap-3 rounded-[22px] bg-[#F7F8FB] p-3">
                    <div className="grid h-10 w-10 place-items-center rounded-[15px] bg-[#EEF0FA] text-[13px] font-black text-[#2442D8]">{num}</div>
                    <div className="min-w-0">
                      <p className="text-[15px] font-black leading-5 text-[#050609]">{title}</p>
                      <p className="mt-0.5 text-[13px] font-semibold leading-5 text-[#8B8D94]">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              className="flex min-h-[76px] w-full items-center justify-between rounded-[28px] border border-[#E7E9EF] bg-white px-4 text-left shadow-[0_16px_42px_rgba(15,20,25,0.06)] transition active:scale-[0.99]"
              onClick={() => navigate(`/school/${demoSlug}/book`)}
            >
              <div className="min-w-0">
                <p className="text-[12px] font-black uppercase tracking-[0.12em] text-[#B8BABF]">быстрый тест</p>
                <p className="mt-0.5 truncate text-[17px] font-black text-[#111418]">Запись ученика в демо</p>
              </div>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[16px] bg-[#2442D8] text-white">
                <ArrowRight size={18} />
              </span>
            </button>
          </motion.div>
        </section>
      </main>
    </div>
  )
}
