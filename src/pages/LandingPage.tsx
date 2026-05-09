import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight01Icon, Building03Icon, CheckmarkCircle01Icon, Clock03Icon, SparklesIcon, UserGroup03Icon } from '@hugeicons/core-free-icons'
import { createHugeIcon } from '../components/ui/HugeIcon'
import { db, setDataNamespace } from '../services/storage'
import { WORKSPACE_ADMIN_LOGIN_PATH } from '../services/accessControl'

const ArrowRight = createHugeIcon(ArrowRight01Icon)
const Building = createHugeIcon(Building03Icon)
const Check = createHugeIcon(CheckmarkCircle01Icon)
const Clock = createHugeIcon(Clock03Icon)
const Star = createHugeIcon(SparklesIcon)
const Users = createHugeIcon(UserGroup03Icon)

const BENEFITS = [
  { icon: Clock, text: 'Ученики записываются онлайн — меньше звонков и сообщений' },
  { icon: Users, text: 'Расписание инструкторов, филиалов и учеников в одном кабинете' },
  { icon: Check, text: 'Подтверждение записи, напоминания — всё автоматически' },
  { icon: Star, text: 'Понятный интерфейс для учеников: телефон, категория, слот' },
]

export function LandingPage() {
  const navigate = useNavigate()
  const [demoSchool, setDemoSchool] = useState<{ name: string; slug: string; description: string } | null>(null)

  useEffect(() => {
    setDataNamespace('demo')
    const schools = db.schools.all().filter((s) => s.isActive)
    setDemoSchool(schools[0] ?? { name: 'Вираж', slug: 'virazh', description: 'Профессиональная подготовка водителей с 2008 года.' })
  }, [])

  return (
    <div className="shell">
      <main className="mx-auto flex w-full max-w-[440px] flex-col px-5 py-6">

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mb-8 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
              style={{ background: '#050607', boxShadow: '0 8px 24px rgba(0,0,0,0.14)' }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8" stroke="white" strokeWidth="1.5" />
                <path d="M7 10h6M10 7l3 3-3 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <p className="font-black tracking-tight" style={{ fontSize: 17, color: '#050609' }}>vroom</p>
              <p className="font-semibold" style={{ fontSize: 12, color: '#9EA3A8' }}>Онлайн-запись на вождение</p>
            </div>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate(WORKSPACE_ADMIN_LOGIN_PATH)}
          >
            Войти в кабинет
          </button>
        </motion.header>

        {/* Hero */}
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <h1 className="t-hero" style={{ maxWidth: 480 }}>
            Онлайн-запись<br /> для автошкол
          </h1>
          <p className="t-body mt-4" style={{ maxWidth: 440 }}>
            Ученики выбирают удобное время сами. Вы — управляете расписанием, инструкторами и записями в одном кабинете.
          </p>
        </motion.section>

        {/* What is it */}
        <motion.div
          className="mb-6 grid gap-3"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.15 }}
        >
          {BENEFITS.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-start gap-3 rounded-[18px] border border-[rgba(0,0,0,0.05)] bg-white px-4 py-3.5 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[#EEF2FF]">
                <Icon size={16} className="text-[#1F2BD8]" />
              </div>
              <p className="text-[14px] font-semibold leading-5 text-[#050609]">{text}</p>
            </div>
          ))}
        </motion.div>

        {/* Demo school card */}
        <motion.div
          className="card-section p-5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.25 }}
        >
          <div className="mb-4 flex items-center gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
              style={{ background: '#1F2BD8', boxShadow: '0 12px 32px rgba(68,85,196,0.25)' }}
            >
              <Building size={26} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="t-micro mb-1">Демо-автошкола</p>
              <p className="t-subheading">{demoSchool?.name ?? 'Вираж'}</p>
              <p className="t-small mt-0.5">{demoSchool?.description ?? 'Посмотрите, как это работает'}</p>
            </div>
          </div>
          <button
            className="btn btn-primary btn-lg w-full"
            onClick={() => navigate(`/school/${demoSchool?.slug ?? 'virazh'}`)}
          >
            Открыть демо автошколы
            <ArrowRight size={17} />
          </button>
        </motion.div>

        {/* Admin CTA */}
        <motion.div
          className="mt-3"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.3 }}
        >
          <button
            className="flex w-full items-center justify-between rounded-[22px] border border-[rgba(0,0,0,0.07)] bg-white px-5 py-4 text-left transition active:scale-[0.99]"
            style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}
            onClick={() => navigate(WORKSPACE_ADMIN_LOGIN_PATH)}
          >
            <div>
              <p className="text-[15px] font-black text-[#050609]">Попробовать админку</p>
              <p className="mt-0.5 text-[13px] font-semibold text-[#9EA3A8]">Настройте школу и посмотрите кабинет директора</p>
            </div>
            <ArrowRight size={18} className="shrink-0 text-[#9EA3A8]" />
          </button>
        </motion.div>

      </main>
    </div>
  )
}
