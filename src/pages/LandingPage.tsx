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
import { ADMIN_LOGIN_PATH, SUPERADMIN_LOGIN_PATH } from '../services/accessControl'

const primaryEntrances = [
  {
    title: 'Ученик',
    text: 'Запись на занятие, кабинет ученика, история записей.',
    path: '/school/virazh',
    icon: GraduationCap,
    accent: true,
  },
  {
    title: 'Администратор',
    text: 'Управление записями, расписанием и настройками автошколы.',
    path: ADMIN_LOGIN_PATH,
    icon: UserCog,
    accent: false,
  },
  {
    title: 'Супер-админ',
    text: 'Управление школами, модулями и витриной сервиса DriveDesk.',
    path: SUPERADMIN_LOGIN_PATH,
    icon: ShieldCheck,
    accent: false,
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
    <div className="shell">
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-6 sm:px-6">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          className="mb-6 flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: 'rgba(0,0,0,0.06)' }}
        >
          <div className="flex items-center gap-3.5">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
              style={{ background: '#050607', boxShadow: '0 12px 28px rgba(0,0,0,0.16)' }}
            >
              <Car size={20} className="text-white" />
            </div>
            <div>
              <p className="text-[17px] font-extrabold tracking-tight" style={{ color: '#111418' }}>DriveDesk</p>
              <p className="text-[13px] font-medium" style={{ color: '#9EA3A8' }}>Панель демонстрации продукта</p>
            </div>
          </div>

          <div
            className="inline-flex items-center rounded-full px-4 py-2 text-[13px] font-semibold"
            style={{ border: '1px solid rgba(0,0,0,0.06)', background: '#F7F8F9', color: '#6F747A' }}
          >
            Прод: drivingschool-6wy.pages.dev
          </div>
        </motion.header>

        {/* Hero */}
        <section className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.02 }}
          >
            <p className="caption mb-3">DriveDesk v2</p>
            <h1 className="display-lg" style={{ color: '#111418' }}>
              Быстрый вход
              <br />
              в продукт
            </h1>
            <p className="body-lg mt-3 max-w-xl" style={{ color: '#6F747A' }}>
              Рабочие экраны для демонстрации и ежедневной работы автошколы.
            </p>
          </motion.div>
        </section>

        {/* Primary entry cards */}
        <section className="mb-6 grid gap-4 lg:grid-cols-3">
          {primaryEntrances.map((item, i) => {
            const Icon = item.icon
            return (
              <motion.button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="card group cursor-pointer p-6 text-left"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.04 + i * 0.06 }}
                whileHover={{ y: -4 }}
              >
                <div
                  className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl"
                  style={{ background: item.accent ? '#F6B84D' : '#050607', boxShadow: '0 12px 28px rgba(0,0,0,0.14)' }}
                >
                  <Icon size={19} className="text-white" />
                </div>
                <h2 className="text-[18px] font-extrabold tracking-tight" style={{ color: '#111418' }}>{item.title}</h2>
                <p className="body mt-3" style={{ color: '#6F747A' }}>{item.text}</p>
                <div
                  className="mt-5 inline-flex items-center gap-2 text-[13px] font-extrabold"
                  style={{ color: item.accent ? '#F6B84D' : '#111418' }}
                >
                  Открыть
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                </div>
              </motion.button>
            )
          })}
        </section>

        {/* Quick start banner */}
        <motion.div
          className="card mb-6 p-5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.15 }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[16px] font-extrabold tracking-tight" style={{ color: '#111418' }}>Что показывать первым</h2>
              <p className="body mt-1.5" style={{ color: '#6F747A' }}>
                Ученик создаёт запись → запись в админке → админ переносит занятие.
              </p>
            </div>
            <button
              onClick={() => navigate('/school/virazh')}
              className="btn-primary shrink-0 inline-flex items-center gap-2 px-6 py-3 text-[15px]"
            >
              Начать с ученика
              <ArrowRight size={15} />
            </button>
          </div>
        </motion.div>

        {/* Quick links */}
        <motion.aside
          className="card p-5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.18 }}
        >
          <h2 className="text-[15px] font-extrabold tracking-tight" style={{ color: '#111418' }}>Быстрые разделы</h2>
          <p className="body mt-1.5" style={{ color: '#6F747A' }}>
            Прямые входы без поиска по меню.
          </p>

          <div className="mt-4 space-y-2.5">
            {quickLinks.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="flex w-full items-center gap-3 p-3.5 transition-all duration-150"
                  style={{
                    background: '#F7F8F9',
                    borderRadius: '14px',
                    border: '1px solid rgba(0,0,0,0.04)',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(15,20,25,0.08)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = ''
                    e.currentTarget.style.boxShadow = ''
                  }}
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: 'rgba(246,184,77,0.12)', color: '#F6B84D' }}
                  >
                    <Icon size={16} />
                  </div>
                  <p className="min-w-0 flex-1 text-[14px] font-semibold" style={{ color: '#111418' }}>{item.label}</p>
                  <ArrowRight size={14} style={{ color: '#9EA3A8' }} />
                </button>
              )
            })}
          </div>
        </motion.aside>
      </main>
    </div>
  )
}
