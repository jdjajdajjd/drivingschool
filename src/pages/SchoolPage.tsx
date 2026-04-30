import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Bus, CalendarDays, Car, Clock3, LogIn, ShieldCheck, Truck } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { BottomNav } from '../components/ui/BottomNav'
import { StateView } from '../components/ui/StateView'
import { BranchCompactCard, InstructorCompactCard } from '../components/product/CompactCards'
import { getTenantTheme } from '../services/tenantTheme'
import { getFutureAvailableSlots, loadPublicSchoolData } from '../services/publicSchoolData'
import { DRIVING_CATEGORIES } from '../services/drivingCategories'
import { loadStudentProfile } from '../services/studentProfile'
import type { Branch, Instructor, School, Slot } from '../types'
import { formatInstructorName } from '../lib/utils'
import { formatHumanDate, formatTimeRange, getRelativeLessonLabel } from '../utils/date'

type Section = 'instructors' | 'branches' | 'categories' | 'schedule'

function Logo({ school, color }: { school: School; color: string }) {
  return (
    <div
      className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-sm font-extrabold text-white"
      style={{ background: color, boxShadow: '0 12px 28px rgba(0,0,0,0.16)' }}
    >
      {school.logoUrl ? <img src={school.logoUrl} alt={school.name} className="h-full w-full object-cover" /> : school.name.slice(0, 2).toUpperCase()}
    </div>
  )
}

function getVisibleCategories(school: School, instructors: Instructor[]) {
  const supported = new Set(instructors.flatMap((instructor) => instructor.categories ?? []))
  const configured = school.enabledCategoryCodes?.length ? new Set(school.enabledCategoryCodes) : supported
  return DRIVING_CATEGORIES.filter((category) => configured.has(category.code) && supported.has(category.code))
}

function CategoryIcon({ code }: { code: string }) {
  const Icon = code === 'C' ? Truck : code === 'D' ? Bus : Car
  return <Icon size={20} />
}

const SECTIONS: { key: Section; label: string }[] = [
  { key: 'instructors', label: 'Инструкторы' },
  { key: 'branches', label: 'Филиалы' },
  { key: 'categories', label: 'Категории' },
  { key: 'schedule', label: 'Расписание' },
]

export function SchoolPage() {
  const { slug = 'virazh' } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [school, setSchool] = useState<School | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [slots, setSlots] = useState<Slot[]>([])
  const [section, setSection] = useState<Section>('instructors')
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

  const futureSlots = useMemo(() => school ? getFutureAvailableSlots(school.id) : [], [school, slots])
  const nearestSlot = futureSlots[0] ?? null
  const nearestInstructor = nearestSlot ? instructors.find((item) => item.id === nearestSlot.instructorId) ?? null : null
  const nearestBranch = nearestSlot ? branches.find((item) => item.id === nearestSlot.branchId) ?? null : null
  const theme = school ? getTenantTheme({ school, branchesCount: branches.length, instructorsCount: instructors.length, freeSlotsCount: futureSlots.length }) : null
  const profile = school ? loadStudentProfile(school.id) : null
  const categories = school ? getVisibleCategories(school, instructors) : []

  if (loading) return <div className="shell" />
  if (!school || !theme) {
    return (
      <div className="shell flex min-h-screen items-center justify-center px-4">
        <StateView kind="error" title="Автошкола не найдена" description="Проверьте ссылку или откройте демо-страницу." action={<Button onClick={() => navigate('/school/virazh')}>Открыть Вираж</Button>} />
      </div>
    )
  }

  const brandColor = theme.brandColors.primary
  const instructorCards = instructors.slice(0, 8).map((instructor) => ({
    instructor,
    branch: branches.find((branch) => branch.id === instructor.branchId) ?? null,
    nextSlot: futureSlots.find((slot) => slot.instructorId === instructor.id) ?? null,
  }))

  return (
    <div className="shell">
      <main className="mx-auto w-full max-w-2xl overflow-x-hidden px-4 pb-28 pt-4">

        {/* Header */}
        <header className="flex items-center gap-3.5">
          <Logo school={school} color={brandColor} />
          <div className="min-w-0 flex-1">
            <p className="caption">Онлайн-запись на вождение</p>
            <h1
              className="truncate font-extrabold tracking-tight text-[#111418]"
              style={{ fontSize: '18px', lineHeight: '1.3' }}
            >
              {school.name}
            </h1>
          </div>
        </header>

        {/* Hero CTA Card */}
        <section
          className="card mt-4 p-5"
          style={{ borderRadius: '24px' }}
        >
          <div className="flex items-start gap-3.5">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
              style={{ background: 'rgba(246,184,77,0.12)', color: '#C97F10' }}
            >
              <Car size={24} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-extrabold tracking-tight text-[#111418]" style={{ fontSize: '22px', lineHeight: '1.2' }}>
                Запись без звонков
              </h2>
              <p className="body mt-2" style={{ color: '#6F747A' }}>
                {school.description || 'Выберите инструктора и удобное время за пару минут.'}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2.5">
            {[
              { label: 'работаем', value: 'с 2008' },
              { label: 'филиалы', value: String(branches.length) },
              { label: 'инстр.', value: String(instructors.length) },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl px-3.5 py-3"
                style={{ background: '#F4F5F6' }}
              >
                <p className="caption" style={{ fontSize: '10px' }}>{stat.label}</p>
                <p className="font-extrabold tracking-tight text-[#111418]" style={{ fontSize: '16px', marginTop: '2px' }}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 space-y-2.5">
            <button
              className="btn-primary w-full py-3.5 text-[15px]"
              style={{ height: 'auto', display: 'flex' }}
              onClick={() => navigate(`/school/${school.slug}/book`)}
            >
              Записаться
            </button>
            <button
              className="btn-secondary w-full inline-flex items-center justify-center gap-2 py-3.5 text-[15px]"
              style={{ height: 'auto' }}
              onClick={() => setSection('schedule')}
            >
              <CalendarDays size={16} />
              Ближайшие окна
            </button>
          </div>
        </section>

        {/* Next slot quick card */}
        <section
          className="card mt-3 p-5"
          style={{ borderRadius: '24px' }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="caption">Ближайшее окно</p>
              {nearestSlot ? (
                <>
                  <p
                    className="mt-2 font-extrabold tracking-tight text-[#111418]"
                    style={{ fontSize: '24px', lineHeight: '1.2' }}
                  >
                    {formatTimeRange(nearestSlot)}
                  </p>
                  <p className="body mt-1" style={{ color: '#6F747A', fontSize: '13px' }}>
                    {getRelativeLessonLabel(nearestSlot)} · {formatHumanDate(nearestSlot.date, false)}
                  </p>
                </>
              ) : (
                <p className="body mt-2" style={{ color: '#6F747A', fontSize: '14px' }}>
                  Свободных окон пока нет
                </p>
              )}
            </div>
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
              style={{ background: '#F0FDF4', color: '#15803D' }}
            >
              <Clock3 size={18} />
            </div>
          </div>
          {nearestSlot ? (
            <div
              className="mt-3.5 rounded-2xl p-3.5"
              style={{ background: '#F4F5F6' }}
            >
              <p className="text-[13px] font-semibold text-[#111418]">
                {nearestInstructor ? formatInstructorName(nearestInstructor.name) : 'Инструктор'} · {nearestBranch?.name ?? 'Филиал'}
              </p>
            </div>
          ) : null}
          <button
            className="btn-primary mt-3 w-full py-3 text-[15px]"
            style={{ height: 'auto' }}
            onClick={() => nearestSlot ? navigate(`/school/${school.slug}/book?slot=${nearestSlot.id}`) : navigate(`/school/${school.slug}/book`)}
          >
            Выбрать
          </button>
        </section>

        {/* Tab navigation */}
        <nav
          className="mt-4 flex items-center gap-1 overflow-x-auto"
          style={{ borderBottom: '2px solid rgba(0,0,0,0.06)' }}
        >
          {SECTIONS.map(({ key, label }) => {
            const active = section === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSection(key)}
                className="shrink-0 px-4 pb-3 text-[14px] font-bold transition-all duration-150"
                style={{
                  color: active ? '#F6B84D' : '#6F747A',
                  borderBottom: active ? '2px solid #F6B84D' : '2px solid transparent',
                  marginBottom: '-2px',
                }}
              >
                {label}
              </button>
            )
          })}
        </nav>

        {/* Tab content */}
        <section className="mt-4 space-y-3">
          {section === 'instructors' ? (
            instructorCards.map(({ instructor, branch, nextSlot }) => (
              <InstructorCompactCard
                key={instructor.id}
                instructor={instructor}
                branch={branch}
                nextSlot={nextSlot}
                onSelect={() => navigate(`/school/${school.slug}/book?instructor=${instructor.id}`)}
              />
            ))
          ) : null}

          {section === 'branches' ? (
            branches.map((branch) => (
              <BranchCompactCard key={branch.id} branch={branch} onSelect={() => navigate(`/school/${school.slug}/book?branch=${branch.id}`)} />
            ))
          ) : null}

          {section === 'categories' ? (
            <div className="grid grid-cols-1 gap-2.5">
              {categories.map((category) => (
                <button
                  key={category.code}
                  onClick={() => navigate(`/school/${school.slug}/book?category=${category.code}`)}
                  className="flex items-center gap-3.5 p-4 text-left transition-all hover:-translate-y-1"
                  style={{
                    background: 'white',
                    border: '1px solid rgba(0,0,0,0.06)',
                    borderRadius: '24px',
                    boxShadow: '0 18px 45px rgba(15,20,25,0.10)',
                  }}
                >
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                    style={{ background: 'rgba(246,184,77,0.12)', color: '#C97F10' }}
                  >
                    <CategoryIcon code={category.code} />
                  </div>
                  <span className="min-w-0 flex-1">
                    <span
                      className="block font-extrabold tracking-tight text-[#111418]"
                      style={{ fontSize: '16px', lineHeight: '1.3' }}
                    >
                      Категория {category.code}
                    </span>
                    <span className="mt-0.5 block text-[13px] font-medium" style={{ color: '#6F747A' }}>
                      {category.title}
                    </span>
                  </span>
                </button>
              ))}
              {categories.length === 0 ? <StateView title="Категории пока не настроены" /> : null}
            </div>
          ) : null}

          {section === 'schedule' ? (
            <div className="space-y-2.5">
              {futureSlots.slice(0, 8).map((slot) => {
                const instructor = instructors.find((item) => item.id === slot.instructorId) ?? null
                const branch = branches.find((item) => item.id === slot.branchId) ?? null
                return (
                  <button
                    key={slot.id}
                    onClick={() => navigate(`/school/${school.slug}/book?slot=${slot.id}`)}
                    className="flex w-full items-center gap-3.5 p-4 text-left transition-all hover:-translate-y-1"
                    style={{
                      background: 'white',
                      border: '1px solid rgba(0,0,0,0.06)',
                      borderRadius: '24px',
                      boxShadow: '0 18px 45px rgba(15,20,25,0.10)',
                    }}
                  >
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                      style={{ background: '#F0FDF4', color: '#15803D' }}
                    >
                      <CalendarDays size={18} />
                    </div>
                    <span className="min-w-0 flex-1">
                      <span
                        className="block font-extrabold tracking-tight text-[#111418]"
                        style={{ fontSize: '15px', lineHeight: '1.3' }}
                      >
                        {getRelativeLessonLabel(slot)}, {formatTimeRange(slot)}
                      </span>
                      <span className="mt-0.5 block truncate text-[13px] font-medium" style={{ color: '#6F747A' }}>
                        {instructor ? formatInstructorName(instructor.name) : 'Инструктор'} · {branch?.name ?? 'Филиал'}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          ) : null}
        </section>
      </main>

      <BottomNav
        items={[
          { key: 'home', label: 'Главная', icon: <ShieldCheck size={20} />, active: true, onClick: () => undefined },
          { key: 'schedule', label: 'Окна', icon: <CalendarDays size={20} />, onClick: () => setSection('schedule') },
          { key: 'profile', label: profile ? 'Кабинет' : 'Войти', icon: <LogIn size={20} />, onClick: () => navigate('/student') },
        ]}
      />
    </div>
  )
}