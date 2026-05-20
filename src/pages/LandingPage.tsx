import { ArrowRight, CalendarCheck, CheckCircle as CheckCircle2, Clock, GraduationCap, ChartLineUp, PaperPlaneTilt as Send, Sparkle, UserCheck, Spinner as Loader2 } from '@phosphor-icons/react'
const Clock3 = Clock
const LayoutDashboard = ChartLineUp
const Sparkles = Sparkle
import { FormEvent, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BrandMark } from '../components/layout/BrandMark'
import { setDataNamespace } from '../services/storage'
import studentCabinetMockupUrl from '../../hochuvodit/1/iPhone 15.svg?url'

type LeadStatus = 'idle' | 'submitting' | 'success' | 'error'

const benefits = [
  {
    title: 'Запись без звонков',
    text: 'Ученик выбирает инструктора, день и время на странице школы.',
    icon: CalendarCheck,
    tone: 'bg-[#EAF3FF] text-[#315A7C]',
  },
  {
    title: 'Кабинет ученика',
    text: 'После записи ученик видит дату, время, инструктора и контакты школы.',
    icon: GraduationCap,
    tone: 'bg-[#EEF8F1] text-[#2F6E4B]',
  },
  {
    title: 'Расписание школы',
    text: 'Администратор видит слоты, записи и занятость инструкторов.',
    icon: LayoutDashboard,
    tone: 'bg-[#F2EEFF] text-[#5A4A87]',
  },
]

const steps = [
  { title: 'Школа дает ссылку', text: 'Ссылка ведет на страницу записи конкретной автошколы.' },
  { title: 'Ученик записывается сам', text: 'Выбирает инструктора, день, время и оставляет контакты.' },
  { title: 'Запись попадает в кабинет', text: 'Администратор видит новую запись в расписании.' },
]

const schoolFeatures = [
  'расписание по инструкторам',
  'свободные и занятые окна',
  'долги и оплаты учеников',
  'запросы на переносы и отмены',
  'готовность школы к запуску',
  'отдельная страница школы',
]

const pains = [
  {
    title: 'Администратор меньше сидит в телефоне',
    text: 'Ученик сам выбирает окно, а школа сразу видит запись в кабинете.',
    icon: UserCheck,
    label: 'меньше звонков',
  },
  {
    title: 'Директор видит потери',
    text: 'Свободные окна, долги, просроченные занятия и проблемы дня собраны на главном экране.',
    icon: ChartLineUp,
    label: 'контроль денег',
  },
  {
    title: 'Школу проще подключить',
    text: 'Филиалы, инструкторы, слоты, ученики и публичная ссылка собраны в один запускной контур.',
    icon: CheckCircle2,
    label: 'быстрый старт',
  },
]

function LandingPhoneMockup() {
  return (
    <article className="relative z-0 hidden overflow-visible rounded-[34px] lg:block lg:min-h-0">
      <div
        className="pointer-events-none absolute inset-x-[-8px] top-[-8px] h-[610px] overflow-hidden sm:top-[-14px] sm:h-[700px] lg:left-[-235px] lg:right-[-10px] lg:top-[-16px] lg:h-[805px]"
        style={{
          WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, #000 84%, rgba(0,0,0,0.72) 93%, transparent 100%)',
          maskImage: 'linear-gradient(to bottom, #000 0%, #000 84%, rgba(0,0,0,0.72) 93%, transparent 100%)',
        }}
      >
        <img
          src={studentCabinetMockupUrl}
          alt="Кабинет ученика vroom на iPhone"
          className="absolute left-1/2 top-[-30px] w-[690px] max-w-none -translate-x-[42%] select-none sm:top-[-42px] sm:w-[780px] sm:-translate-x-[42%] lg:left-[50%] lg:top-[-18px] lg:w-[700px] lg:-translate-x-[36%] [image-rendering:auto]"
          decoding="sync"
          loading="eager"
        />
      </div>
    </article>
  )
}

export function LandingPage() {
  const navigate = useNavigate()
  const formRef = useRef<HTMLElement | null>(null)
  const [leadStatus, setLeadStatus] = useState<LeadStatus>('idle')
  const [leadError, setLeadError] = useState('')
  const [lead, setLead] = useState({
    name: '',
    phone: '',
    schoolName: '',
    city: '',
    comment: '',
  })

  function openDemo() {
    setDataNamespace('demo')
    navigate('/demo')
  }

  function scrollToLeadForm() {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function updateLead(field: keyof typeof lead, value: string) {
    setLeadStatus('idle')
    setLeadError('')
    setLead((current) => ({ ...current, [field]: value }))
  }

  async function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const payload = {
      name: lead.name.trim(),
      phone: lead.phone.trim(),
      schoolName: lead.schoolName.trim(),
      city: lead.city.trim(),
      comment: lead.comment.trim(),
    }

    if (!payload.name || !payload.phone || !payload.schoolName) {
      setLeadStatus('error')
      setLeadError('Заполните имя, телефон и название автошколы.')
      return
    }

    setLeadStatus('submitting')
    setLeadError('')

    try {
      const response = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = (await response.json().catch(() => null)) as { error?: string } | null

      if (!response.ok) {
        throw new Error(result?.error || 'Не удалось отправить заявку.')
      }

      setLeadStatus('success')
      setLead({ name: '', phone: '', schoolName: '', city: '', comment: '' })
    } catch (error) {
      setLeadStatus('error')
      setLeadError(error instanceof Error ? error.message : 'Не удалось отправить заявку.')
    }
  }

  return (
    <div className="landing-shell min-h-dvh bg-[#EEF3F8] bg-[radial-gradient(circle_at_18%_0%,rgba(203,221,238,0.72),transparent_34%),radial-gradient(circle_at_82%_16%,rgba(226,232,240,0.9),transparent_30%),linear-gradient(180deg,#F8FBFE_0%,#EEF3F8_48%,#E9EFF6_100%)] text-[#111827]">
      <header className="landing-header mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <button
          type="button"
          className="rounded-full px-1 py-2 text-left transition active:scale-[0.98]"
          onClick={() => navigate('/')}
        >
          <BrandMark size="lg" />
        </button>

        <button
          type="button"
          className="landing-nav-button hidden min-h-10 rounded-full border border-[#DDE7F0] bg-white/82 px-4 text-[14px] font-medium text-[#3F4C59] shadow-[0_12px_34px_rgba(37,51,68,0.08)] backdrop-blur-xl transition hover:bg-white active:scale-[0.97] sm:inline-flex sm:items-center"
          onClick={openDemo}
        >
          Посмотреть демо
        </button>
      </header>

      <main className="landing-main mx-auto w-full max-w-6xl px-4 pb-14 sm:px-6">
        <section className="landing-hero-grid relative grid items-stretch gap-4 lg:grid-cols-[1.32fr_0.68fr]">
          <article className="landing-hero-card relative z-10 rounded-[34px] border border-[#D7E2EC] bg-white/92 p-6 shadow-[0_30px_90px_rgba(43,57,75,0.13)] backdrop-blur-2xl sm:p-8 lg:p-9">
            <div className="landing-pill inline-flex items-center gap-2 rounded-full bg-[#EAF3FF] px-3 py-2 text-[13px] font-medium text-[#315A7C]">
              <Sparkles size={15} />
              vroom.today
            </div>

            <h1 className="landing-title mt-7 max-w-[13ch] text-[38px] font-semibold leading-[1.02] tracking-[-0.02em] text-[#111827] sm:text-[62px]">
              Онлайн-запись для автошкол
            </h1>

            <p className="landing-copy mt-5 max-w-[58ch] text-[16px] font-normal leading-7 text-[#657281] sm:text-[17px]">
              Ученики сами выбирают свободное время. Директор видит записи, долги, свободные окна и проблемы дня в одном кабинете.
            </p>

            <div className="mt-5 inline-flex flex-wrap items-baseline gap-2 rounded-[22px] border border-[#D7E2EC] bg-[#F8FBFE] px-4 py-3 shadow-[0_12px_30px_rgba(43,57,75,0.08)]">
              <span className="text-[13px] font-medium text-[#667381]">базовый тариф</span>
              <strong className="text-[28px] font-semibold leading-none text-[#111827]">4 990 ₽</strong>
              <span className="text-[13px] font-medium text-[#667381]">в месяц</span>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                className="landing-primary inline-flex min-h-[56px] items-center justify-center gap-2 rounded-full bg-[#111827] px-5 text-[15px] font-medium text-white shadow-[0_18px_44px_rgba(17,24,39,0.16)] transition hover:bg-[#1D2633] active:scale-[0.98]"
                onClick={scrollToLeadForm}
              >
                Оставить заявку
                <ArrowRight size={18} />
              </button>
              <button
                type="button"
                className="landing-secondary inline-flex min-h-[56px] items-center justify-center gap-2 rounded-full border border-[#DDE7F0] bg-white px-5 text-[15px] font-medium text-[#111827] shadow-[0_12px_32px_rgba(31,42,56,0.07)] transition hover:bg-[#F9FBFD] active:scale-[0.98]"
                onClick={openDemo}
              >
                Посмотреть демо
              </button>
            </div>

            <div className="mt-8 grid gap-2 sm:grid-cols-3">
              {['ученик записывается сам', 'админ видит запись', 'без таблиц и чатов'].map((item) => (
                <div key={item} className="landing-proof-chip flex items-start gap-2 rounded-[18px] border border-[#E1EAF2] bg-white/72 px-3 py-3 shadow-[0_8px_24px_rgba(47,65,84,0.045)]">
                  <CheckCircle2 className="mt-0.5 shrink-0 text-[#3A7A57]" size={16} />
                  <span className="text-[13px] font-medium leading-5 text-[#465463]">{item}</span>
                </div>
              ))}
            </div>
          </article>

          <LandingPhoneMockup />
        </section>

        <section className="relative z-20 mt-5 grid gap-3 md:grid-cols-3">
          {benefits.map((card) => {
            const Icon = card.icon

            return (
              <article
                key={card.title}
                className="landing-benefit-card rounded-[30px] border border-[#D7E2EC] bg-white p-5 shadow-[0_18px_54px_rgba(43,57,75,0.12)]"
              >
                <span className={`grid h-12 w-12 place-items-center rounded-[18px] ${card.tone}`}>
                  <Icon size={22} />
                </span>
                <h3 className="mt-5 text-[22px] font-semibold leading-7 tracking-[-0.01em] text-[#111827]">{card.title}</h3>
                <p className="mt-2 text-[14px] font-normal leading-6 text-[#667381]">{card.text}</p>
              </article>
            )
          })}
        </section>

        <section className="landing-proof-section mt-5 grid gap-3 lg:grid-cols-3">
          {pains.map((pain) => {
            const Icon = pain.icon
            return (
              <article key={pain.title} className="landing-proof-card rounded-[26px] border border-[#D7E2EC] bg-white p-5 shadow-[0_18px_54px_rgba(43,57,75,0.10)]">
                <div className="flex items-start justify-between gap-4">
                  <span className="landing-proof-icon grid h-11 w-11 shrink-0 place-items-center rounded-[16px] bg-[#EAF3FF] text-[#315A7C]">
                    <Icon size={21} weight="duotone" />
                  </span>
                  <span className="landing-proof-label rounded-full border border-[#DDE7F0] bg-[#F8FBFE] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5A6675]">
                    {pain.label}
                  </span>
                </div>
                <h3 className="mt-5 text-[20px] font-semibold leading-[1.18] tracking-[-0.01em] text-[#111827]">{pain.title}</h3>
                <p className="mt-2 text-[15px] font-medium leading-6 text-[#536170]">{pain.text}</p>
              </article>
            )
          })}
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="landing-flow-card rounded-[30px] border border-[#D7E2EC] bg-white p-6 shadow-[0_18px_54px_rgba(43,57,75,0.11)]">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#EEF8F1] px-3 py-2 text-[13px] font-medium text-[#2F6E4B]">
              <Clock3 size={15} />
              как это работает
            </div>
            <h2 className="mt-5 text-[30px] font-semibold leading-tight tracking-[-0.01em] text-[#111827]">
              Как проходит запись
            </h2>
            <div className="mt-6 space-y-3">
              {steps.map((step, index) => (
                <div key={step.title} className="landing-step-card flex gap-3 rounded-[22px] border border-[#E1EAF2] bg-[#F8FBFE] p-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[13px] font-semibold text-[#111827] shadow-[0_8px_20px_rgba(31,42,56,0.05)]">
                    {index + 1}
                  </span>
                  <span>
                    <span className="block text-[16px] font-semibold text-[#111827]">{step.title}</span>
                    <span className="mt-1 block text-[14px] font-normal leading-5 text-[#667381]">{step.text}</span>
                  </span>
                </div>
              ))}
            </div>
          </article>

          <article className="landing-admin-card rounded-[30px] border border-[#C9D8E6] bg-[#F8FBFE] p-6 text-[#111827] shadow-[0_18px_54px_rgba(43,57,75,0.12)]">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#EAF3FF] px-3 py-2 text-[13px] font-medium text-[#315A7C]">
              <UserCheck size={15} />
              для администратора
            </div>
            <h2 className="mt-5 max-w-[18ch] text-[30px] font-semibold leading-tight tracking-[-0.01em] text-[#111827]">
              Что видно в кабинете школы
            </h2>
            <p className="mt-4 max-w-[52ch] text-[15px] font-normal leading-6 text-[#5D6B7A]">
              Администратор видит расписание, свободные окна, заявки учеников и занятость инструкторов.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {schoolFeatures.map((feature) => (
                <div key={feature} className="landing-feature-card rounded-[20px] border border-[#E1EAF2] bg-white px-4 py-4 text-[14px] font-medium leading-5 text-[#2D3A48] shadow-[0_10px_28px_rgba(43,57,75,0.06)]">
                  {feature}
                </div>
              ))}
            </div>
          </article>
        </section>

        <section
          ref={formRef}
          className="landing-lead-card mt-5 scroll-mt-6 rounded-[30px] border border-[#D7E2EC] bg-white p-5 shadow-[0_18px_54px_rgba(43,57,75,0.11)] sm:p-6 lg:grid lg:grid-cols-[0.8fr_1.2fr] lg:gap-8"
        >
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#F2EEFF] px-3 py-2 text-[13px] font-medium text-[#5A4A87]">
              <Send size={15} />
              заявка на подключение
            </div>
            <h2 className="mt-5 text-[30px] font-semibold leading-tight tracking-[-0.01em] text-[#111827]">
              Оставить заявку на подключение
            </h2>
            <p className="mt-3 text-[15px] font-normal leading-6 text-[#667381]">
              Напишите контакты. Я покажу демо и отвечу на вопросы по подключению.
            </p>
          </div>

          <form className="mt-6 grid gap-3 lg:mt-0" onSubmit={(event) => void submitLead(event)}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2 text-[13px] font-medium text-[#667381]">
                Ваше имя
                <input
                  className="landing-input min-h-[52px] rounded-[18px] border border-[#D7E2EC] bg-[#FBFDFF] px-4 text-[15px] font-medium text-[#111827] outline-none transition placeholder:text-[#A2ACB7] focus:border-[#9DB3C8]"
                  value={lead.name}
                  placeholder="Иван"
                  autoComplete="name"
                  onChange={(event) => updateLead('name', event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-[13px] font-medium text-[#667381]">
                Телефон
                <input
                  className="landing-input min-h-[52px] rounded-[18px] border border-[#D7E2EC] bg-[#FBFDFF] px-4 text-[15px] font-medium text-[#111827] outline-none transition placeholder:text-[#A2ACB7] focus:border-[#9DB3C8]"
                  value={lead.phone}
                  placeholder="+7 999 123-45-67"
                  autoComplete="tel"
                  onChange={(event) => updateLead('phone', event.target.value)}
                />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2 text-[13px] font-medium text-[#667381]">
                Автошкола
                <input
                  className="landing-input min-h-[52px] rounded-[18px] border border-[#D7E2EC] bg-[#FBFDFF] px-4 text-[15px] font-medium text-[#111827] outline-none transition placeholder:text-[#A2ACB7] focus:border-[#9DB3C8]"
                  value={lead.schoolName}
                  placeholder="Название школы"
                  onChange={(event) => updateLead('schoolName', event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-[13px] font-medium text-[#667381]">
                Город
                <input
                  className="landing-input min-h-[52px] rounded-[18px] border border-[#D7E2EC] bg-[#FBFDFF] px-4 text-[15px] font-medium text-[#111827] outline-none transition placeholder:text-[#A2ACB7] focus:border-[#9DB3C8]"
                  value={lead.city}
                  placeholder="Москва"
                  onChange={(event) => updateLead('city', event.target.value)}
                />
              </label>
            </div>
            <label className="grid gap-2 text-[13px] font-medium text-[#667381]">
              Комментарий
              <textarea
                className="landing-input min-h-[104px] resize-none rounded-[18px] border border-[#D7E2EC] bg-[#FBFDFF] px-4 py-3 text-[15px] font-medium leading-6 text-[#111827] outline-none transition placeholder:text-[#A2ACB7] focus:border-[#9DB3C8]"
                value={lead.comment}
                placeholder="Сколько филиалов и инструкторов"
                onChange={(event) => updateLead('comment', event.target.value)}
              />
            </label>

            {leadStatus === 'success' ? (
              <div className="rounded-[18px] bg-[#ECF8F1] px-4 py-3 text-[14px] font-medium leading-5 text-[#2F6E4B]">
                Заявка отправлена. Я свяжусь с вами в ближайшее время.
              </div>
            ) : null}
            {leadStatus === 'error' ? (
              <div className="rounded-[18px] bg-[#FFF0EF] px-4 py-3 text-[14px] font-medium leading-5 text-[#B4443D]">
                {leadError || 'Не удалось отправить заявку. Попробуйте еще раз.'}
              </div>
            ) : null}

            <button
              type="submit"
              className="landing-primary inline-flex min-h-[56px] items-center justify-center gap-2 rounded-full bg-[#111827] px-5 text-[15px] font-medium text-white shadow-[0_18px_44px_rgba(17,24,39,0.16)] transition hover:bg-[#1D2633] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#AEB8C3]"
              disabled={leadStatus === 'submitting'}
            >
              {leadStatus === 'submitting' ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
              {leadStatus === 'submitting' ? 'Отправляем' : 'Отправить заявку'}
            </button>
            <p className="text-[12px] font-medium leading-5 text-[#7A8795]">
              Отправляя заявку, вы соглашаетесь с <a className="font-semibold text-[#111827]" href="/terms">условиями сервиса</a> и <a className="font-semibold text-[#111827]" href="/privacy">политикой конфиденциальности</a>.
            </p>
          </form>
        </section>
      </main>
    </div>
  )
}
