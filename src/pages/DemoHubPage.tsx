import { ArrowRight, GraduationCap, ChartLineUp, PlayCircle, ArrowCounterClockwise as RotateCcw, ShieldCheck } from '@phosphor-icons/react'
const LayoutDashboard = ChartLineUp
import { useNavigate } from 'react-router-dom'
import { BrandMark } from '../components/layout/BrandMark'
import { setDataNamespace } from '../services/storage'

const demoCards = [
  {
    title: 'Демо ученика',
    text: 'Запись на занятие, создание кабинета и просмотр своих занятий глазами ученика.',
    cta: 'Открыть ученика',
    to: '/demo/student',
    icon: GraduationCap,
    tone: 'bg-[#EAF3FF] text-[#315A7C]',
  },
  {
    title: 'Демо автошколы',
    text: 'Расписание, ученики, инструкторы и слоты в безопасном тестовом кабинете.',
    cta: 'Открыть автошколу',
    to: '/demo/admin-login',
    icon: LayoutDashboard,
    tone: 'bg-[#ECF8F1] text-[#2F6E4B]',
  },
]

export function DemoHubPage() {
  const navigate = useNavigate()

  function openDemo(to: string) {
    setDataNamespace('demo')
    navigate(to)
  }

  return (
    <div className="min-h-dvh bg-[#F4F7FA] text-[#111827]">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <button type="button" className="rounded-full px-1 py-2 text-left transition active:scale-[0.98]" onClick={() => navigate('/')}>
          <BrandMark size="lg" />
        </button>
        <button
          type="button"
          className="min-h-10 rounded-full border border-white/80 bg-white/75 px-4 text-[14px] font-medium text-[#3F4C59] shadow-[0_10px_30px_rgba(22,31,44,0.05)] backdrop-blur-xl transition hover:bg-white active:scale-[0.97]"
          onClick={() => navigate('/login')}
        >
          Войти
        </button>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pb-14 sm:px-6">
        <section className="rounded-[34px] border border-white/80 bg-white/78 p-6 shadow-[0_28px_80px_rgba(31,42,56,0.08)] backdrop-blur-2xl sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#EAF3FF] px-3 py-2 text-[13px] font-medium text-[#315A7C]">
            <PlayCircle size={15} />
            безопасный демо-контур
          </div>
          <h1 className="mt-6 max-w-[13ch] text-[38px] font-semibold leading-[1.02] tracking-[-0.02em] text-[#111827] sm:text-[58px]">
            Посмотрите vroom в деле
          </h1>
          <p className="mt-4 max-w-[58ch] text-[16px] font-normal leading-7 text-[#667381]">
            Здесь только демонстрационные сценарии. Можно показывать клиентам, проходить запись и открывать кабинет автошколы без риска для рабочих данных.
          </p>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-2">
          {demoCards.map((card) => {
            const Icon = card.icon

            return (
              <button
                key={card.title}
                type="button"
                className="group rounded-[30px] border border-white/80 bg-white/76 p-5 text-left shadow-[0_18px_52px_rgba(31,42,56,0.07)] backdrop-blur-2xl transition hover:-translate-y-0.5 hover:bg-white active:scale-[0.99]"
                onClick={() => openDemo(card.to)}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className={`grid h-[52px] w-[52px] place-items-center rounded-[20px] ${card.tone}`}>
                    <Icon size={25} />
                  </span>
                  <span className="rounded-full bg-[#F6F9FC] px-3 py-1.5 text-[12px] font-medium text-[#667381]">demo</span>
                </div>
                <h2 className="mt-7 text-[28px] font-semibold leading-8 tracking-[-0.01em] text-[#111827]">{card.title}</h2>
                <p className="mt-3 text-[15px] font-normal leading-6 text-[#667381]">{card.text}</p>
                <span className="mt-7 inline-flex min-h-[48px] items-center gap-2 rounded-full bg-[#111827] px-5 text-[15px] font-medium text-white shadow-[0_16px_38px_rgba(17,24,39,0.14)] transition group-hover:bg-[#1D2633]">
                  {card.cta}
                  <ArrowRight className="transition group-hover:translate-x-0.5" size={18} />
                </span>
              </button>
            )
          })}
        </section>

        <section className="mt-5 grid gap-3 rounded-[30px] border border-white/80 bg-white/72 p-5 shadow-[0_16px_44px_rgba(31,42,56,0.06)] backdrop-blur-2xl sm:grid-cols-2">
          <div className="flex gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[17px] bg-[#F2EEFF] text-[#5A4A87]">
              <ShieldCheck size={21} />
            </span>
            <div>
              <h2 className="text-[17px] font-semibold text-[#111827]">Демо отделено от рабочих данных</h2>
              <p className="mt-1 text-[14px] font-normal leading-5 text-[#667381]">Тестовые действия не попадают в кабинет подключённой школы.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[17px] bg-[#EAF3FF] text-[#315A7C]">
              <RotateCcw size={21} />
            </span>
            <div>
              <h2 className="text-[17px] font-semibold text-[#111827]">Можно спокойно пересоздавать сценарии</h2>
              <p className="mt-1 text-[14px] font-normal leading-5 text-[#667381]">Демо подходит для показа, обучения и проверки продукта.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
