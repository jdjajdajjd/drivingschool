import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CalendarDays, LogIn, ShieldCheck } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { BottomNav } from '../components/ui/BottomNav'
import { SegmentedTabs } from '../components/ui/SegmentedTabs'
import { StateView } from '../components/ui/StateView'
import { BranchCompactCard, InstructorCompactCard } from '../components/product/CompactCards'
import { getTenantTheme } from '../services/tenantTheme'
import { getFutureAvailableSlots, loadPublicSchoolData } from '../services/publicSchoolData'
import { DRIVING_CATEGORIES } from '../services/drivingCategories'
import { loadStudentProfile } from '../services/studentProfile'
import type { Branch, Instructor, School, Slot } from '../types'
import { formatDate, formatDayOfWeek } from '../utils/date'

type Tab = 'instructors' | 'branches' | 'categories'

function Logo({ school, color }: { school: School; color: string }) {
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[16px] text-base font-bold text-white shadow-soft" style={{ backgroundColor: color }}>
      {school.logoUrl ? <img src={school.logoUrl} alt={school.name} className="h-full w-full object-cover" /> : school.name.slice(0, 2).toUpperCase()}
    </div>
  )
}

function getVisibleCategories(school: School, instructors: Instructor[]) {
  const supported = new Set(instructors.flatMap((instructor) => instructor.categories ?? []))
  const configured = school.enabledCategoryCodes?.length ? new Set(school.enabledCategoryCodes) : supported
  return DRIVING_CATEGORIES.filter((category) => configured.has(category.code) && supported.has(category.code))
}

export function SchoolPage() {
  const { slug = 'virazh' } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [school, setSchool] = useState<School | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [instructors, setInstructors] = useState<Instructor[]>([])
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

  const futureSlots = useMemo(() => school ? getFutureAvailableSlots(school.id) : [], [school, slots])
  const nearestSlot = futureSlots[0] ?? null
  const nearestInstructor = nearestSlot ? instructors.find((item) => item.id === nearestSlot.instructorId) ?? null : null
  const nearestBranch = nearestSlot ? branches.find((item) => item.id === nearestSlot.branchId) ?? null : null
  const theme = school ? getTenantTheme({ school, branchesCount: branches.length, instructorsCount: instructors.length, freeSlotsCount: futureSlots.length }) : null
  const profile = school ? loadStudentProfile(school.id) : null
  const categories = school ? getVisibleCategories(school, instructors) : []

  if (loading) {
    return <div className="ui-shell" />
  }

  if (!school || !theme) {
    return (
      <div className="ui-shell flex min-h-screen items-center justify-center px-4">
        <StateView kind="error" title="Автошкола не найдена" description="Проверьте ссылку или откройте демо-страницу." action={<Button onClick={() => navigate('/school/virazh')}>Открыть Вираж</Button>} />
      </div>
    )
  }

  const brandColor = theme.brandColors.primary
  const instructorCards = instructors.slice(0, 12).map((instructor) => ({
    instructor,
    branch: branches.find((branch) => branch.id === instructor.branchId) ?? null,
    nextSlot: futureSlots.find((slot) => slot.instructorId === instructor.id) ?? null,
  }))

  return (
    <div className="ui-shell">
      <main className="mx-auto max-w-3xl px-4 pb-28 pt-4">
        <section className="rounded-[20px] border border-product-border bg-white p-4 shadow-soft">
          <div className="flex items-start gap-3">
            <Logo school={school} color={brandColor} />
            <div className="min-w-0 flex-1">
              <p className="ui-kicker">Автошкола</p>
              <h1 className="ui-h1 mt-1">{school.name}</h1>
              <p className="mt-2 text-base leading-[22px] text-product-secondary">{school.description || 'Запись на практические занятия без звонков и лишних шагов.'}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-[13px] font-semibold text-product-secondary">
            <span className="rounded-xl bg-product-alt px-3 py-2">с 2008 года</span>
            <span className="rounded-xl bg-product-alt px-3 py-2">{branches.length} филиала</span>
            <span className="rounded-xl bg-product-alt px-3 py-2">{instructors.length} инструкторов</span>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Button onClick={() => navigate(`/school/${school.slug}/book`)}>Записаться</Button>
            <Button variant="secondary" onClick={() => setTab('instructors')}>
              <CalendarDays size={18} />
              Расписание
            </Button>
          </div>
        </section>

        <section className="mt-3 rounded-[20px] border border-product-border bg-white p-4 shadow-soft">
          <p className="ui-section-title">Ближайшее свободное окно</p>
          {nearestSlot ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="font-display text-[28px] font-bold leading-[34px] text-product-main">{nearestSlot.time}</p>
                <p className="mt-1 text-sm font-semibold text-product-secondary">{formatDayOfWeek(nearestSlot.date)}, {formatDate(nearestSlot.date)}</p>
                <p className="mt-2 text-sm text-product-secondary">{nearestInstructor?.name ?? 'Инструктор'} · {nearestBranch?.name ?? 'Филиал'}</p>
              </div>
              <Button onClick={() => navigate(`/school/${school.slug}/book?slot=${nearestSlot.id}`)}>Выбрать</Button>
            </div>
          ) : (
            <p className="mt-2 text-base text-product-secondary">Свободных окон пока нет. Проверьте расписание позже.</p>
          )}
        </section>

        <div className="mt-3">
          <SegmentedTabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'instructors', label: 'Инструкторы' },
              { value: 'branches', label: 'Филиалы' },
              { value: 'categories', label: 'Категории' },
            ]}
          />
        </div>

        <section className="mt-3 space-y-2">
          {tab === 'instructors' && instructorCards.map(({ instructor, branch, nextSlot }) => (
            <InstructorCompactCard
              key={instructor.id}
              instructor={instructor}
              branch={branch}
              nextSlot={nextSlot}
              onSelect={() => navigate(`/school/${school.slug}/book?instructor=${instructor.id}`)}
            />
          ))}

          {tab === 'branches' && branches.map((branch) => (
            <BranchCompactCard key={branch.id} branch={branch} onSelect={() => navigate(`/school/${school.slug}/book?branch=${branch.id}`)} />
          ))}

          {tab === 'categories' && (
            <div className="grid grid-cols-2 gap-2">
              {categories.map((category) => (
                <button
                  key={category.code}
                  onClick={() => navigate(`/school/${school.slug}/book?category=${category.code}`)}
                  className="min-h-[92px] rounded-[20px] border border-product-border bg-white p-4 text-left shadow-soft transition hover:border-product-primary/35"
                >
                  <span className="block font-display text-[32px] font-bold leading-[38px] text-product-main">{category.code}</span>
                  <span className="mt-1 block text-sm font-medium leading-[18px] text-product-secondary">{category.title}</span>
                </button>
              ))}
              {categories.length === 0 ? <StateView title="Категории пока не настроены" /> : null}
            </div>
          )}
        </section>
      </main>

      <BottomNav
        items={[
          { key: 'home', label: 'Главная', icon: <ShieldCheck size={20} />, active: true, onClick: () => undefined },
          { key: 'schedule', label: 'Расписание', icon: <CalendarDays size={20} />, onClick: () => setTab('instructors') },
          { key: 'profile', label: profile ? 'Профиль' : 'Войти', icon: <LogIn size={20} />, onClick: () => navigate('/student') },
        ]}
      />
    </div>
  )
}
