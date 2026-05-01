import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Car, ShieldCheck, UserCog } from 'lucide-react'
import type { School } from '../types'
import { db } from '../services/storage'

const entryPoints = [
  {
    title: 'Записаться',
    description: 'Выберите инструктора, дату и время. Занятие уже сегодня.',
    icon: Car,
    path: '/school/virazh',
    accent: true,
  },
  {
    title: 'Кабинет ученика',
    description: 'Ваши записи, пройденные занятия, напоминания.',
    icon: ShieldCheck,
    path: '/student',
    accent: false,
  },
  {
    title: 'Для персонала',
    description: 'Админка автошколы. Расписание, записи, ученики.',
    icon: UserCog,
    path: '/admin',
    accent: false,
  },
]

function SchoolLogo({ school }: { school: School }) {
  return (
    <div
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl overflow-hidden"
      style={{
        background: '#050607',
        boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
      }}
    >
      {school.logoUrl ? (
        <img src={school.logoUrl} alt={school.name} className="h-full w-full object-cover" />
      ) : (
        <span className="text-white font-black text-lg">{school.name.slice(0, 2)}</span>
      )}
    </div>
  )
}

export function LandingPage() {
  const navigate = useNavigate()
  const [schools, setSchools] = useState<School[]>([])

  useEffect(() => {
    setSchools(db.schools.all().filter((s) => s.isActive))
  }, [])

  const defaultSchool = schools[0] ?? {
    id: 'school-virazh',
    name: 'Вираж',
    slug: 'virazh',
    description: 'Профессиональная подготовка водителей с 2008 года.',
    phone: '+7 (495) 123-45-67',
    email: '',
    address: '',
    createdAt: '',
    isActive: true,
  }

  return (
    <div className="shell">
      <main className="mx-auto w-full max-w-5xl px-5 py-6">

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
              <p className="font-black tracking-tight" style={{ fontSize: 17, color: '#111418' }}>vroom</p>
              <p className="font-semibold" style={{ fontSize: 12, color: '#9EA3A8' }}>Онлайн-запись на вождение</p>
            </div>
          </div>
        </motion.header>

        {/* Hero */}
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <h1 className="t-hero" style={{ maxWidth: 480 }}>
            Выберите<br />автошколу
          </h1>
          <p className="t-body mt-4" style={{ maxWidth: 420 }}>
            Запишитесь на практическое занятие за пару минут. Без звонков, без ожиданий.
          </p>
        </motion.section>

        {/* School entry cards */}
        <section className="space-y-3 mb-8">
          {entryPoints.map((item, i) => {
            const Icon = item.icon
            return (
              <motion.button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="w-full text-left card"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.08 + i * 0.07 }}
                whileHover={{ y: -3, transition: { duration: 0.18 } }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="card-body flex items-center gap-5">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                    style={{
                      background: item.accent ? '#050607' : '#F4F5F6',
                      boxShadow: item.accent ? '0 12px 28px rgba(0,0,0,0.16)' : 'none',
                    }}
                  >
                    <Icon size={20} strokeWidth={2.2} style={{ color: item.accent ? 'white' : '#6F747A' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="t-subheading">{item.title}</p>
                    <p className="t-small mt-0.5">{item.description}</p>
                  </div>
                  <ArrowRight size={18} style={{ color: '#C4C9CF', flexShrink: 0 }} />
                </div>
              </motion.button>
            )
          })}
        </section>

        {/* Default school quick card */}
        <motion.div
          className="card-section p-5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.22 }}
        >
          <div className="flex items-center gap-4 mb-5">
            <SchoolLogo school={defaultSchool} />
            <div className="flex-1 min-w-0">
              <p className="t-subheading">{defaultSchool.name}</p>
              <p className="t-small mt-0.5">{defaultSchool.description}</p>
            </div>
          </div>
          <button
            className="btn btn-primary btn-lg w-full"
            onClick={() => navigate(`/school/${defaultSchool.slug}`)}
          >
            Открыть
            <ArrowRight size={17} />
          </button>
        </motion.div>

        {/* Footer note */}
        <motion.p
          className="text-center mt-8 t-micro"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          Выберите школу на её странице, чтобы записаться
        </motion.p>

      </main>
    </div>
  )
}