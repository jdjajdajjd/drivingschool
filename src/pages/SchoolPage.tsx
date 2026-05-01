import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CalendarDays, Car, ChevronRight, Clock3, UserRound } from 'lucide-react'
import { BottomNav } from '../components/ui/BottomNav'
import { StateView } from '../components/ui/StateView'
import { InstructorCompactCard } from '../components/product/CompactCards'
import { getFutureAvailableSlots, loadPublicSchoolData } from '../services/publicSchoolData'
import { loadStudentProfile } from '../services/studentProfile'
import type { Branch, Instructor, School, Slot } from '../types'
import { formatInstructorName } from '../lib/utils'
import { formatHumanDate, formatTimeRange, getRelativeLessonLabel } from '../utils/date'

type Tab = 'instructors' | 'schedule'

const TABS: { key: Tab; label: string }[] = [
  { key: 'instructors', label: 'Инструкторы' },
  { key: 'schedule', label: 'Расписание' },
]

export function SchoolPage() {
  const { slug = 'virazh' } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [school, setSchool] = useState<School | null>(null)
  const [branches, setBranches] = useState<Branch[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [slots, setSlots] = useState<Slot[]>([])
  const [tab, setTab] = useState<Tab>('instructors')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    void loadPublicSchoolData(slug)
      .then((data) => {
        if (!data) return
        setSchool(data.school)
        setBranches(data.branches)
        setInstructors(data.instructors)
        setSlots(data.slots)
      })
      .finally(() => setLoading(false))
  }, [slug])

  const futureSlots = useMemo(
    () => (school ? getFutureAvailableSlots(school.id) : []),
    [school, slots],
  )
  const nearestSlot = futureSlots[0] ?? null
  const nearestInstructor = nearestSlot
    ? instructors.find((i) => i.id === nearestSlot.instructorId) ?? null
    : null
  const nearestBranch = nearestSlot
    ? branches.find((b) => b.id === nearestSlot.branchId) ?? null
    : null
  const profile = school ? loadStudentProfile(school.id) : null

  if (loading) return <div className="shell" />
  if (!school) {
    return (
      <div className="shell flex min-h-screen items-center justify-center px-4">
        <StateView
          kind="error"
          title="Автошкола не найдена"
          description="Проверьте ссылку или откройте демо-страницу."
          action={
            <button className="btn btn-primary btn-md" onClick={() => navigate('/school/virazh')}>
              Открыть Вираж
            </button>
          }
        />
      </div>
    )
  }

  return (
    <div className="shell">
      <main className="mx-auto w-full max-w-2xl overflow-x-hidden px-5 pb-28 pt-6">

        {/* Header */}
        <header className="mb-5">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl"
              style={{ background: '#050607', boxShadow: '0 8px 24px rgba(0,0,0,0.14)' }}
            >
              <Car size={20} style={{ color: 'white' }} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-extrabold tracking-tight" style={{ fontSize: 20, lineHeight: 1.2, color: '#111418' }}>
                {school.name}
              </h1>
              <p className="t-small mt-0.5">Онлайн-запись на вождение</p>
            </div>
          </div>
        </header>

        {/* Hero */}
        <motion.section
          className="mb-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="t-hero" style={{ maxWidth: 340, fontSize: 'clamp(40px, 9vw, 72px)' }}>
            Запишитесь<br />без звонков
          </h2>
          <p className="t-body mt-3" style={{ maxWidth: 360 }}>
            {school.description || 'Выберите инструктора и удобное время за пару минут.'}
          </p>

          {/* Stats */}
          <div className="mt-5 grid grid-cols-3 gap-2.5">
            {[
              { value: 'с 2008', label: 'работаем' },
              { value: String(branches.length), label: 'филиала' },
              { value: String(instructors.length), label: 'инструктора' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl px-3.5 py-3.5"
                style={{ background: '#F4F5F6' }}
              >
                <p className="font-extrabold tracking-tight" style={{ fontSize: 18, color: '#111418' }}>
                  {stat.value}
                </p>
                <p className="t-small mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Primary CTA */}
          <button
            className="btn btn-primary btn-lg mt-4 w-full"
            onClick={() => navigate(`/school/${school.slug}/book`)}
          >
            Записаться
            <ChevronRight size={17} />
          </button>
        </motion.section>

        {/* Nearest slot */}
        {nearestSlot ? (
          <motion.div
            className="mb-4 p-5"
            style={{
              background: 'white',
              borderRadius: 24,
              boxShadow: '0 18px 45px rgba(15,20,25,0.10), inset 0 0 0 1px rgba(0,0,0,0.04)',
            }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.1 }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="t-micro" style={{ fontWeight: 700 }}>Ближайшее окно</p>
                <p
                  className="font-extrabold tracking-tight"
                  style={{ fontSize: 26, lineHeight: 1.15, color: '#111418', marginTop: 4 }}
                >
                  {formatTimeRange(nearestSlot)}
                </p>
                <p className="t-small mt-1.5">
                  {getRelativeLessonLabel(nearestSlot)}, {formatHumanDate(nearestSlot.date, false)}
                </p>
              </div>
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                style={{ background: '#F0FDF4', color: '#15803D' }}
              >
                <Clock3 size={18} />
              </div>
            </div>
            <div
              className="mt-3 flex items-center gap-2 rounded-2xl p-3"
              style={{ background: '#F4F5F6' }}
            >
              <UserRound size={14} style={{ color: '#6F747A' }} />
              <p className="text-[13px] font-semibold" style={{ color: '#111418' }}>
                {nearestInstructor ? formatInstructorName(nearestInstructor.name) : 'Инструктор'}
              </p>
              <span style={{ color: '#9EA3A8' }}>·</span>
              <p className="text-[13px] font-medium" style={{ color: '#6F747A' }}>
                {nearestBranch?.name ?? 'Филиал'}
              </p>
            </div>
            <button
              className="btn btn-accent btn-md mt-3 w-full"
              onClick={() => navigate(`/school/${school.slug}/book?slot=${nearestSlot.id}`)}
            >
              Выбрать это время
            </button>
          </motion.div>
        ) : (
          <motion.div
            className="mb-4 p-5"
            style={{
              background: '#F4F5F6',
              borderRadius: 24,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="t-micro" style={{ fontWeight: 700 }}>Ближайшее окно</p>
            <p className="t-body mt-2" style={{ fontSize: 14 }}>Свободных окон пока нет</p>
          </motion.div>
        )}

        {/* Tab navigation */}
        <nav className="mb-4 flex gap-1">
          {TABS.map(({ key, label }) => {
            const active = tab === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={[
                  'btn',
                  active ? 'btn-primary' : 'btn-secondary',
                  'btn-sm',
                ].join(' ')}
              >
                {label}
              </button>
            )
          })}
        </nav>

        {/* Instructor grid */}
        {tab === 'instructors' && (
          <div className="space-y-2.5">
            {instructors.slice(0, 8).map((instructor) => {
              const branch = branches.find((b) => b.id === instructor.branchId) ?? null
              const nextSlot = futureSlots.find((s) => s.instructorId === instructor.id) ?? null
              return (
                <InstructorCompactCard
                  key={instructor.id}
                  instructor={instructor}
                  branch={branch}
                  nextSlot={nextSlot}
                  onSelect={() => navigate(`/school/${school.slug}/book?instructor=${instructor.id}`)}
                />
              )
            })}
          </div>
        )}

        {/* Schedule */}
        {tab === 'schedule' && (
          <div className="space-y-2.5">
            {futureSlots.slice(0, 12).map((slot) => {
              const instructor = instructors.find((i) => i.id === slot.instructorId) ?? null
              const branch = branches.find((b) => b.id === slot.branchId) ?? null
              return (
                <motion.button
                  key={slot.id}
                  type="button"
                  onClick={() => navigate(`/school/${school.slug}/book?slot=${slot.id}`)}
                  className="w-full p-4 text-left transition-all"
                  whileTap={{ scale: 0.98 }}
                  style={{
                    background: 'white',
                    borderRadius: 20,
                    boxShadow: '0 18px 45px rgba(15,20,25,0.10), inset 0 0 0 1px rgba(0,0,0,0.04)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
                      style={{ background: '#F0FDF4', color: '#15803D' }}
                    >
                      <CalendarDays size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold tracking-tight" style={{ fontSize: 16, color: '#111418' }}>
                        {getRelativeLessonLabel(slot)}, {formatTimeRange(slot)}
                      </p>
                      <p className="t-small mt-0.5">
                        {instructor ? formatInstructorName(instructor.name) : 'Инструктор'} · {branch?.name ?? 'Филиал'}
                      </p>
                    </div>
                    <ChevronRight size={16} style={{ color: '#9EA3A8', flexShrink: 0 }} />
                  </div>
                </motion.button>
              )
            })}
            {futureSlots.length === 0 && (
              <p className="t-body text-center py-8">Нет доступных окон</p>
            )}
          </div>
        )}
      </main>

      <BottomNav
        items={[
          {
            key: 'home',
            label: 'Главная',
            icon: <Car size={20} />,
            active: true,
            onClick: () => undefined,
          },
          {
            key: 'schedule',
            label: 'Расписание',
            icon: <CalendarDays size={20} />,
            onClick: () => setTab('schedule'),
          },
          {
            key: 'profile',
            label: profile ? 'Кабинет' : 'Войти',
            icon: <UserRound size={20} />,
            onClick: () => navigate('/student'),
          },
        ]}
      />
    </div>
  )
}
