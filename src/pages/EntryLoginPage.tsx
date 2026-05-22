import { ArrowRight, BuildingOffice as Building2, GraduationCap, LockKey, ShieldCheck } from '@/components/icons/lucide'
const LockKeyhole = LockKey
import { useNavigate } from 'react-router-dom'
import { BrandMark } from '../components/layout/BrandMark'
import { DEMO_STUDENT_LOGIN_PATH } from '../services/schoolRoutes'
import { setDataNamespace } from '../services/storage'

const loginCards = [
  {
    title: 'Автошкола',
    text: 'Вход в рабочий кабинет для подключённой школы.',
    cta: 'Войти как автошкола',
    to: '/admin-login',
    namespace: 'workspace' as const,
    icon: Building2,
  },
  {
    title: 'Ученик',
    text: 'Вход в личный кабинет по телефону и паролю.',
    cta: 'Войти как ученик',
    to: DEMO_STUDENT_LOGIN_PATH,
    namespace: 'demo' as const,
    icon: GraduationCap,
  },
]

export function EntryLoginPage() {
  const navigate = useNavigate()

  function openRoute(to: string, namespace: 'demo' | 'workspace') {
    setDataNamespace(namespace)
    navigate(to)
  }

  return (
    <div className="min-h-dvh bg-[#F4F7FA] text-[#111827]">
      <main className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col px-4 py-5">
        <header className="flex items-center justify-between">
          <button type="button" className="rounded-full px-1 py-2 text-left transition active:scale-[0.98]" onClick={() => navigate('/')}>
            <BrandMark size="lg" />
          </button>
          <button
            type="button"
            className="min-h-10 rounded-full border border-white/80 bg-white/75 px-4 text-[14px] font-medium text-[#3F4C59] shadow-[0_10px_30px_rgba(22,31,44,0.05)] backdrop-blur-xl transition hover:bg-white active:scale-[0.97]"
            onClick={() => navigate('/demo')}
          >
            Демо
          </button>
        </header>

        <section className="flex flex-1 flex-col justify-center py-8">
          <div className="rounded-[34px] border border-white/80 bg-white/78 p-6 shadow-[0_28px_80px_rgba(31,42,56,0.08)] backdrop-blur-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#EAF3FF] px-3 py-2 text-[13px] font-medium text-[#315A7C]">
              <LockKeyhole size={15} />
              вход в vroom
            </div>
            <h1 className="mt-6 text-[38px] font-semibold leading-[1.02] tracking-[-0.02em] text-[#111827]">Выберите кабинет</h1>
            <p className="mt-4 text-[15px] font-normal leading-6 text-[#667381]">
              Рабочий вход открывается только тем, кому школа или сервис уже выдали доступ.
            </p>

            <div className="mt-6 space-y-3">
              {loginCards.map((card) => {
                const Icon = card.icon

                return (
                  <button
                    key={card.title}
                    type="button"
                    className="group flex w-full items-center gap-4 rounded-[24px] border border-[#E9EEF4] bg-white p-4 text-left shadow-[0_12px_30px_rgba(31,42,56,0.05)] transition hover:border-[#DDE6EF] active:scale-[0.99]"
                    onClick={() => openRoute(card.to, card.namespace)}
                  >
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[18px] bg-[#F2F5F8] text-[#111827]">
                      <Icon size={22} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[18px] font-semibold text-[#111827]">{card.title}</span>
                      <span className="mt-1 block text-[14px] font-normal leading-5 text-[#667381]">{card.text}</span>
                    </span>
                    <ArrowRight className="shrink-0 text-[#9AA6B2] transition group-hover:translate-x-0.5 group-hover:text-[#111827]" size={19} />
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-4 flex gap-3 rounded-[24px] border border-white/80 bg-white/65 p-4 shadow-[0_12px_34px_rgba(31,42,56,0.05)] backdrop-blur-2xl">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[16px] bg-[#ECF8F1] text-[#2F6E4B]">
              <ShieldCheck size={20} />
            </span>
            <p className="text-[13px] font-normal leading-5 text-[#667381]">
              Если доступа ещё нет, откройте демо или обратитесь к автошколе. Публичная главная не показывает внутренние инструменты сервиса.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
