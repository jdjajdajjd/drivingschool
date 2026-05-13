import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight01Icon,
  BookOpen01Icon,
  Building05Icon,
  Calendar03Icon,
  ChartBarLineIcon,
  CheckmarkCircle02Icon,
  Road02Icon,
  Shield01Icon,
  TaskDone02Icon,
  User03Icon,
  Wallet02Icon,
} from '@hugeicons/core-free-icons'
import { BrandMark } from '../components/layout/BrandMark'
import { createHugeIcon } from '../components/ui/HugeIcon'
import { setDataNamespace } from '../services/storage'

void React

const ArrowRight = createHugeIcon(ArrowRight01Icon)
const Book = createHugeIcon(BookOpen01Icon)
const Building = createHugeIcon(Building05Icon)
const Calendar = createHugeIcon(Calendar03Icon)
const Chart = createHugeIcon(ChartBarLineIcon)
const Check = createHugeIcon(CheckmarkCircle02Icon)
const Road = createHugeIcon(Road02Icon)
const Shield = createHugeIcon(Shield01Icon)
const Task = createHugeIcon(TaskDone02Icon)
const User = createHugeIcon(User03Icon)
const Wallet = createHugeIcon(Wallet02Icon)

type IconComponent = ReturnType<typeof createHugeIcon>

type Feature = {
  title: string
  text: string
  tone: string
  Icon: IconComponent
}

const features: Feature[] = [
  {
    title: 'Кабинет ученика',
    text: 'Регистрация по ФИО и телефону, ближайшее занятие, долги, прогресс и записи на одном экране.',
    tone: 'bg-[#EEF5FF] text-[#1B4FD7]',
    Icon: User,
  },
  {
    title: 'Запись без календарной боли',
    text: 'Показываем только актуальные дни и живые слоты на ближайшую неделю, как это реально работает в автошколах.',
    tone: 'bg-[#EAF8EF] text-[#138143]',
    Icon: Calendar,
  },
  {
    title: 'Деньги и задолженности',
    text: 'Понятные статусы оплат, просрочки, ближайший платеж и история списаний без ручных переписок.',
    tone: 'bg-[#FFF3D6] text-[#A66200]',
    Icon: Wallet,
  },
  {
    title: 'Рабочий кабинет школы',
    text: 'Администратор видит день, учеников, инструкторов, экзамены, платежи и узкие места в расписании.',
    tone: 'bg-[#F0EEFF] text-[#3124C8]',
    Icon: Building,
  },
]

const studentTimeline = [
  { label: 'Сегодня', title: 'Вождение', value: '15:00-16:30', status: 'Подтверждено', tone: 'border-[#1BB45E] bg-[#F7FFF9]' },
  { label: 'Завтра', title: 'Теория', value: '18:00', status: 'Открыто', tone: 'border-[#2344E8] bg-[#F8F9FF]' },
  { label: '23 мая', title: 'Экзамен', value: 'ГИБДД', status: 'Готовимся', tone: 'border-[#F59E0B] bg-[#FFF9ED]' },
]

const adminRows = [
  ['09:00', 'Основное вождение', '6 мест'],
  ['11:00', 'Доп. занятие', '2 места'],
  ['14:30', 'Экзамен', '8 учеников'],
]

function openSchoolCabinet() {
  setDataNamespace('workspace')
}

function LandingHeader() {
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-[#F7F1E7]/[0.88] backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <button className="rounded-full px-1 py-2 text-left active:scale-[0.98]" onClick={() => navigate('/')}>
          <BrandMark size="lg" />
        </button>
        <nav className="hidden items-center gap-7 text-[14px] font-extrabold text-[#4F453A] md:flex">
          <a className="transition hover:text-[#101114]" href="#product">
            Продукт
          </a>
          <a className="transition hover:text-[#101114]" href="#booking">
            Запись
          </a>
          <a className="transition hover:text-[#101114]" href="#price">
            Цена
          </a>
        </nav>
        <button
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#101114] px-4 text-[14px] font-black text-white shadow-[0_14px_34px_rgba(16,17,20,0.18)] transition active:scale-[0.97]"
          onClick={() => navigate('/school/virazh/register')}
        >
          Попробовать
          <ArrowRight size={18} />
        </button>
      </div>
    </header>
  )
}

function LessonCard() {
  return (
    <div className="rounded-[28px] bg-white p-4 shadow-[0_24px_70px_rgba(39,31,20,0.16)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[12px] font-black uppercase tracking-[0.12em] text-[#8B8176]">Ближайшее</p>
          <h3 className="mt-2 text-[24px] font-black leading-7 tracking-[-0.03em] text-[#111418]">Сегодня, 15:00</h3>
          <p className="mt-1 text-[14px] font-bold text-[#6C6258]">Основное вождение с Руденко Н. В.</p>
        </div>
        <span className="rounded-full bg-[#EAF8EF] px-3 py-1 text-[12px] font-black text-[#138143]">готово</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#ECE7DD]">
        <div className="h-full w-[62%] rounded-full bg-[#2344E8]" />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-[18px] bg-[#F5F1EA] p-3">
          <p className="text-[11px] font-bold text-[#8B8176]">Часы</p>
          <p className="mt-1 text-[18px] font-black text-[#111418]">18/56</p>
        </div>
        <div className="rounded-[18px] bg-[#F5F1EA] p-3">
          <p className="text-[11px] font-bold text-[#8B8176]">Долг</p>
          <p className="mt-1 text-[18px] font-black text-[#111418]">8К</p>
        </div>
        <div className="rounded-[18px] bg-[#F5F1EA] p-3">
          <p className="text-[11px] font-bold text-[#8B8176]">Экзамен</p>
          <p className="mt-1 text-[18px] font-black text-[#111418]">23 мая</p>
        </div>
      </div>
    </div>
  )
}

function StudentPhone() {
  return (
    <motion.div
      aria-hidden="true"
      className="relative mx-auto w-full max-w-[340px]"
      initial={{ opacity: 0, y: 28, rotate: -1.5 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="absolute -left-8 top-24 hidden h-28 w-28 rounded-full bg-[#FFB02E]/25 blur-2xl sm:block" />
      <div className="absolute -right-5 bottom-12 h-32 w-32 rounded-full bg-[#2344E8]/[0.18] blur-2xl" />
      <div className="relative rounded-[44px] border-[10px] border-[#111418] bg-[#F7F8FA] p-3 shadow-[0_34px_90px_rgba(17,20,24,0.28)]">
        <div className="absolute left-1/2 top-3 h-6 w-28 -translate-x-1/2 rounded-full bg-[#111418]" />
        <div className="min-h-[610px] overflow-hidden rounded-[34px] bg-[#F7F8FA] px-4 pb-4 pt-11">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-black text-[#8B8176]">Владимир</p>
              <h2 className="mt-1 text-[23px] font-black tracking-[-0.03em] text-[#111418]">Кабинет ученика</h2>
            </div>
            <div className="grid h-11 w-11 place-items-center rounded-full bg-[#DDE8FF] text-[#2344E8]">
              <User size={22} />
            </div>
          </div>

          <div className="mt-5 rounded-[24px] bg-[#111418] p-4 text-white shadow-[0_18px_45px_rgba(17,20,24,0.22)]">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#FFB02E] text-[#111418]">
                <Wallet size={21} />
              </div>
              <div>
                <p className="text-[13px] font-black text-white/[0.72]">Осталось оплатить</p>
                <p className="mt-1 text-[28px] font-black tracking-[-0.04em]">8 000 ₽</p>
                <p className="mt-1 text-[12px] font-bold text-white/[0.62]">Следующий платеж до 25 мая</p>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <LessonCard />
          </div>

          <div className="mt-4 grid gap-3">
            {studentTimeline.map((item) => (
              <div key={item.title} className={`rounded-[22px] border-l-[4px] ${item.tone} p-3 shadow-[0_14px_30px_rgba(39,31,20,0.07)]`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[12px] font-black text-[#8B8176]">{item.label}</p>
                    <p className="mt-1 text-[15px] font-black text-[#111418]">{item.title}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[14px] font-black text-[#111418]">{item.value}</p>
                    <p className="mt-1 text-[11px] font-black text-[#8B8176]">{item.status}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function AdminPanelPreview() {
  return (
    <div className="rounded-[32px] border border-white/[0.12] bg-[#17191D] p-4 text-white shadow-[0_28px_80px_rgba(0,0,0,0.28)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[12px] font-black uppercase tracking-[0.14em] text-white/[0.45]">школа сегодня</p>
          <h3 className="mt-2 text-[24px] font-black tracking-[-0.04em]">56 активных слотов</h3>
        </div>
        <div className="grid h-12 w-12 place-items-center rounded-[18px] bg-[#2344E8]">
          <Building size={24} />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2">
        {[
          ['12', 'записей'],
          ['4', 'долга'],
          ['3', 'экзамена'],
        ].map(([value, label]) => (
          <div key={label} className="rounded-[18px] bg-white/[0.08] p-3">
            <p className="text-[22px] font-black">{value}</p>
            <p className="text-[11px] font-bold text-white/[0.48]">{label}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-2">
        {adminRows.map(([time, title, value]) => (
          <div key={`${time}-${title}`} className="flex items-center gap-3 rounded-[18px] bg-white/[0.06] p-3">
            <span className="w-12 text-[13px] font-black text-[#FFB02E]">{time}</span>
            <span className="min-w-0 flex-1 text-[13px] font-bold text-white/[0.78]">{title}</span>
            <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] font-black text-white/70">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const Icon = feature.Icon
  return (
    <motion.article
      className="rounded-[28px] border border-black/[0.06] bg-white p-5 shadow-[0_18px_44px_rgba(39,31,20,0.08)]"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
    >
      <div className={`grid h-12 w-12 place-items-center rounded-[18px] ${feature.tone}`}>
        <Icon size={24} />
      </div>
      <h3 className="mt-5 text-[21px] font-black leading-6 tracking-[-0.03em] text-[#111418]">{feature.title}</h3>
      <p className="mt-3 text-[15px] font-semibold leading-6 text-[#6C6258]">{feature.text}</p>
    </motion.article>
  )
}

function HeroSection() {
  const navigate = useNavigate()

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,176,46,0.28),transparent_28%),radial-gradient(circle_at_92%_8%,rgba(35,68,232,0.18),transparent_28%),linear-gradient(180deg,#F7F1E7_0%,#F5EFE4_100%)]" />
      <div className="absolute left-0 right-0 top-24 h-px bg-black/5" />
      <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-4 pb-16 pt-12 sm:px-6 sm:pb-20 lg:grid-cols-[1fr_420px] lg:items-center lg:pt-[72px]">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <div className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white/[0.65] px-3 py-2 text-[12px] font-black text-[#4F453A] shadow-[0_12px_34px_rgba(39,31,20,0.08)] backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-[#1BB45E]" />
            для автошкол, которым надо меньше хаоса в записи
          </div>
          <h1 className="mt-7 max-w-[760px] text-[46px] font-black leading-[0.93] tracking-[-0.06em] text-[#111418] sm:text-[72px] lg:text-[82px]">
            Мобильный кабинет автошколы, который не бесит учеников
          </h1>
          <p className="mt-6 max-w-[650px] text-[18px] font-semibold leading-8 text-[#5F554C] sm:text-[20px]">
            Vroom собирает регистрацию, записи, задолженности, прогресс, экзамены и расписание в один спокойный продукт. Ученик начинает с кабинета, а не с огромного календаря.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              className="inline-flex min-h-[56px] items-center justify-center gap-3 rounded-full bg-[#2344E8] px-6 text-[16px] font-black text-white shadow-[0_18px_42px_rgba(35,68,232,0.24)] transition hover:-translate-y-0.5 active:scale-[0.97]"
              onClick={() => navigate('/school/virazh/register')}
            >
              Открыть демо ученика
              <ArrowRight size={20} />
            </button>
            <button
              className="inline-flex min-h-[56px] items-center justify-center gap-3 rounded-full border border-black/10 bg-white/[0.72] px-6 text-[16px] font-black text-[#111418] shadow-[0_14px_34px_rgba(39,31,20,0.08)] backdrop-blur transition hover:-translate-y-0.5 active:scale-[0.97]"
              onClick={() => {
                openSchoolCabinet()
                navigate('/workspace-admin')
              }}
            >
              Кабинет школы
              <Building size={20} />
            </button>
          </div>
          <div className="mt-9 grid max-w-[650px] grid-cols-3 gap-2">
            {[
              ['4990 ₽', 'в месяц'],
              ['1 неделя', 'слоты записи'],
              ['2 роли', 'ученик и школа'],
            ].map(([value, label]) => (
              <div key={label} className="rounded-[22px] border border-black/[0.06] bg-white/[0.55] p-4 backdrop-blur">
                <p className="text-[22px] font-black tracking-[-0.04em] text-[#111418]">{value}</p>
                <p className="mt-1 text-[12px] font-black uppercase tracking-[0.08em] text-[#8B8176]">{label}</p>
              </div>
            ))}
          </div>
        </motion.div>
        <StudentPhone />
      </div>
    </section>
  )
}

function ProductSection() {
  return (
    <section id="product" className="bg-[#F5EFE4] px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto w-full max-w-6xl">
        <div className="max-w-2xl">
          <p className="text-[13px] font-black uppercase tracking-[0.16em] text-[#2344E8]">что продаем</p>
          <h2 className="mt-3 text-[36px] font-black leading-[1.02] tracking-[-0.05em] text-[#111418] sm:text-[54px]">
            Не сайт автошколы. Операционная система для ученика и администратора.
          </h2>
        </div>
        <div className="mt-9 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}

function BookingSection() {
  return (
    <section id="booking" className="bg-[#101114] px-4 py-16 text-white sm:px-6 sm:py-20">
      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <div className="grid h-14 w-14 place-items-center rounded-[20px] bg-[#FFB02E] text-[#101114]">
            <Road size={28} />
          </div>
          <h2 className="mt-6 max-w-xl text-[36px] font-black leading-[1.02] tracking-[-0.05em] text-white sm:text-[54px]">
            Запись должна начинаться с доступных окон, а не с поиска по месяцу
          </h2>
          <p className="mt-5 max-w-xl text-[17px] font-semibold leading-8 text-white/[0.62]">
            В автошколе редко записываются на практику через три недели. Поэтому Vroom показывает ближайшие дни, свободные слоты, инструктора и статус оплаты без лишнего шума.
          </p>
        </div>
        <div className="rounded-[34px] bg-white p-4 text-[#111418] shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
          <div className="flex items-center justify-between gap-4 px-2 pt-1">
            <h3 className="text-[23px] font-black tracking-[-0.04em]">Ближайшие окна</h3>
            <span className="rounded-full bg-[#EAF8EF] px-3 py-1 text-[12px] font-black text-[#138143]">6 свободно</span>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            {['Сегодня', 'Завтра', 'Сб', 'Вс', 'Пн'].map((day, index) => (
              <button
                key={day}
                className={`shrink-0 rounded-[17px] px-4 py-3 text-[13px] font-black transition active:scale-[0.96] ${
                  index === 1 ? 'bg-[#2344E8] text-white shadow-[0_10px_26px_rgba(35,68,232,0.24)]' : 'bg-[#F4F2EE] text-[#5F554C]'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
          <div className="mt-2 grid gap-3">
            {[
              ['09:00-10:30', 'Основное вождение', 'Руденко Н. В.', '1 500 ₽', '#1BB45E'],
              ['12:00-13:30', 'Дополнительное', 'Новиков А. В.', '2 000 ₽', '#2344E8'],
              ['16:30-18:00', 'Основное вождение', 'Смирнова Н. П.', '1 500 ₽', '#1BB45E'],
            ].map(([time, type, name, price, color]) => (
              <div key={time} className="flex items-center gap-3 rounded-[24px] border border-black/[0.06] bg-[#FAF9F6] p-3">
                <span className="h-14 w-1 rounded-full" style={{ backgroundColor: color }} />
                <div className="min-w-0 flex-1">
                  <p className="text-[18px] font-black tracking-[-0.03em]">{time}</p>
                  <p className="mt-0.5 text-[13px] font-bold text-[#6C6258]">{type} · {name}</p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-black">{price}</p>
                  <button className="mt-2 rounded-full bg-[#2344E8] px-4 py-2 text-[12px] font-black text-white active:scale-[0.97]">Записаться</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function SchoolSection() {
  return (
    <section className="bg-[#F5EFE4] px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto grid w-full max-w-6xl gap-7 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <AdminPanelPreview />
        <div>
          <p className="text-[13px] font-black uppercase tracking-[0.16em] text-[#2344E8]">для школы</p>
          <h2 className="mt-3 text-[36px] font-black leading-[1.02] tracking-[-0.05em] text-[#111418] sm:text-[54px]">
            Админка должна отвечать на вопрос: что горит сегодня?
          </h2>
          <div className="mt-7 grid gap-3">
            {[
              ['Расписание', 'видно день, занятость инструкторов и свободные окна', Calendar],
              ['Ученики', 'долги, прогресс, документы и ближайшие занятия', User],
              ['Контроль', 'экзамены, заявки, оплаты и спорные места в одном контуре', Shield],
            ].map(([title, text, Icon]) => {
              const ItemIcon = Icon as IconComponent
              return (
                <div key={title as string} className="flex gap-4 rounded-[24px] bg-white p-4 shadow-[0_16px_36px_rgba(39,31,20,0.07)]">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[16px] bg-[#EEF5FF] text-[#2344E8]">
                    <ItemIcon size={22} />
                  </div>
                  <div>
                    <h3 className="text-[17px] font-black text-[#111418]">{title as string}</h3>
                    <p className="mt-1 text-[14px] font-semibold leading-5 text-[#6C6258]">{text as string}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

function PriceSection() {
  const navigate = useNavigate()

  return (
    <section id="price" className="bg-[#F5EFE4] px-4 pb-16 pt-4 sm:px-6 sm:pb-20">
      <div className="mx-auto grid w-full max-w-6xl gap-6 rounded-[36px] bg-[#2344E8] p-5 text-white shadow-[0_26px_80px_rgba(35,68,232,0.24)] sm:p-8 lg:grid-cols-[1fr_380px] lg:items-center">
        <div className="py-4">
          <h2 className="text-[38px] font-black leading-[0.98] tracking-[-0.05em] text-white sm:text-[58px]">4990 ₽ в месяц за школу</h2>
          <p className="mt-5 max-w-2xl text-[17px] font-semibold leading-8 text-white/[0.72]">
            Хорошая стартовая упаковка: кабинет ученика, запись на практику, базовые оплаты, прогресс, экзамены и рабочий кабинет администратора. Без “давайте потом в табличке”.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button
              className="inline-flex min-h-[56px] items-center justify-center gap-3 rounded-full bg-white px-6 text-[16px] font-black text-[#2344E8] shadow-[0_18px_44px_rgba(0,0,0,0.18)] transition active:scale-[0.97]"
              onClick={() => navigate('/school/virazh/register')}
            >
              Посмотреть как ученик
              <ArrowRight size={20} />
            </button>
            <button
              className="inline-flex min-h-[56px] items-center justify-center gap-3 rounded-full border border-white/[0.26] px-6 text-[16px] font-black text-white transition active:scale-[0.97]"
              onClick={() => {
                openSchoolCabinet()
                navigate('/workspace-admin')
              }}
            >
              Войти как школа
              <Building size={20} />
            </button>
          </div>
        </div>
        <div className="rounded-[28px] bg-[#101114] p-5">
          <p className="text-[13px] font-black uppercase tracking-[0.14em] text-white/[0.45]">что внутри</p>
          <div className="mt-5 grid gap-3">
            {[
              ['Кабинет ученика', User],
              ['Расписание и слоты', Calendar],
              ['Оплаты и долги', Wallet],
              ['Прогресс обучения', Chart],
              ['Экзамены и задачи', Task],
              ['Теория и материалы', Book],
            ].map(([label, Icon]) => {
              const RowIcon = Icon as IconComponent
              return (
                <div key={label as string} className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-[#FFB02E]">
                    <RowIcon size={18} />
                  </span>
                  <span className="text-[14px] font-black text-white/[0.82]">{label as string}</span>
                  <Check className="ml-auto text-[#1BB45E]" size={18} />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

export function LandingPage() {
  return (
    <div className="min-h-dvh bg-[#F5EFE4] text-[#111418]">
      <LandingHeader />
      <main>
        <HeroSection />
        <ProductSection />
        <BookingSection />
        <SchoolSection />
        <PriceSection />
      </main>
    </div>
  )
}
