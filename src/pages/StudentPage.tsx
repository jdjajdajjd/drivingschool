import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, MessageCircle, Pencil, Plus, Settings, UserRound } from 'lucide-react'
import { BottomNav } from '../components/ui/BottomNav'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { SegmentedTabs } from '../components/ui/SegmentedTabs'
import { StateView } from '../components/ui/StateView'
import { NearestLessonCard, StudentBookingCard, StudentProfileHeader } from '../components/product/CompactCards'
import { db } from '../services/storage'
import { findAnyStudentProfile, loadStudentProfile, removeStudentProfile, saveStudentProfile, type StudentProfile } from '../services/studentProfile'
import { normalizePhone } from '../services/bookingService'
import type { Booking, Branch, Instructor, School, Slot } from '../types'

type View = 'dashboard' | 'bookings' | 'profile'
type BookingTab = 'upcoming' | 'past'

interface ResolvedStudentBooking {
  booking: Booking
  slot: Slot | null
  instructor: Instructor | null
  branch: Branch | null
}

function resolveBookings(schoolId: string, profile: StudentProfile): ResolvedStudentBooking[] {
  const phone = normalizePhone(profile.phone)
  return db.bookings.bySchool(schoolId)
    .filter((booking) => booking.studentPhone === phone)
    .map((booking) => ({
      booking,
      slot: db.slots.byId(booking.slotId),
      instructor: db.instructors.byId(booking.instructorId),
      branch: db.branches.byId(booking.branchId),
    }))
    .sort((left, right) => {
      const l = left.slot ? new Date(`${left.slot.date}T${left.slot.time}:00`).getTime() : 0
      const r = right.slot ? new Date(`${right.slot.date}T${right.slot.time}:00`).getTime() : 0
      return l - r
    })
}

export function StudentPage() {
  const navigate = useNavigate()
  const [school, setSchool] = useState<School | null>(null)
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [view, setView] = useState<View>('dashboard')
  const [bookingTab, setBookingTab] = useState<BookingTab>('upcoming')
  const [form, setForm] = useState({ name: '', phone: '', email: '' })

  useEffect(() => {
    const found = findAnyStudentProfile()
    const nextSchool = found ? db.schools.byId(found.schoolId) : db.schools.bySlug('virazh')
    setSchool(nextSchool)
    const nextProfile = found?.profile ?? (nextSchool ? loadStudentProfile(nextSchool.id) : null)
    setProfile(nextProfile)
    if (nextProfile) setForm({ name: nextProfile.name, phone: nextProfile.phone, email: nextProfile.email })
  }, [])

  const bookings = useMemo(() => school && profile ? resolveBookings(school.id, profile) : [], [school, profile])
  const now = Date.now()
  const upcoming = bookings.filter((item) => item.slot && new Date(`${item.slot.date}T${item.slot.time}:00`).getTime() >= now && item.booking.status === 'active')
  const past = bookings.filter((item) => !upcoming.some((future) => future.booking.id === item.booking.id))
  const next = upcoming[0] ?? null
  const branch = profile?.assignedBranchId ? db.branches.byId(profile.assignedBranchId) : next?.branch ?? null

  if (!school || !profile) {
    return (
      <div className="ui-shell flex min-h-screen items-center justify-center px-4">
        <StateView
          kind="locked"
          title="Кабинет ещё не создан"
          description="После записи можно создать кабинет и видеть все занятия здесь."
          action={<Button onClick={() => navigate('/school/virazh')}>Открыть автошколу</Button>}
        />
      </div>
    )
  }

  function saveProfile() {
    if (!school) return
    const saved = saveStudentProfile(school.id, { ...form, avatarUrl: profile?.avatarUrl ?? '' }, { passwordSet: profile?.passwordSet })
    setProfile(saved)
    setView('dashboard')
  }

  function logout() {
    if (school) removeStudentProfile(school.id)
    setProfile(null)
    navigate(`/school/${school?.slug ?? 'virazh'}`)
  }

  return (
    <div className="ui-shell">
      <main className="mx-auto max-w-2xl px-4 pb-28 pt-4">
        {view === 'dashboard' ? (
          <section className="space-y-3">
            <StudentProfileHeader profile={profile} school={school} branch={branch} onSettings={() => setView('profile')} onLogout={logout} />

            <NearestLessonCard
              booking={next?.booking ?? null}
              slot={next?.slot ?? null}
              instructor={next?.instructor ?? null}
              branch={next?.branch ?? null}
              onBook={() => navigate(`/school/${school.slug}/book`)}
              onAll={() => setView('bookings')}
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="ui-section-title">Мои записи</p>
                {upcoming.length > 3 ? <button className="text-sm font-semibold text-product-primary" onClick={() => setView('bookings')}>Смотреть все</button> : null}
              </div>
              {upcoming.length === 0 ? <StateView title="Будущих записей нет" action={<Button onClick={() => navigate(`/school/${school.slug}/book`)}>Записаться</Button>} /> : upcoming.slice(0, 3).map((item) => (
                <StudentBookingCard key={item.booking.id} {...item} />
              ))}
            </div>

            <div className="space-y-2">
              <p className="ui-section-title">Быстрые действия</p>
              <div className="grid grid-cols-2 gap-2">
                <button className="rounded-[20px] border border-product-border bg-white p-3 text-left shadow-soft transition hover:border-product-primary/35" onClick={() => navigate(`/school/${school.slug}/book`)}>
                  <Plus size={18} className="text-product-primary" />
                  <span className="mt-2 block text-sm font-semibold text-product-main">Записаться ещё</span>
                </button>
                <button className="rounded-[20px] border border-product-border bg-white p-3 text-left shadow-soft transition hover:border-product-primary/35" onClick={() => setView('profile')}>
                  <Pencil size={18} className="text-product-primary" />
                  <span className="mt-2 block text-sm font-semibold text-product-main">Изменить профиль</span>
                </button>
                <button className="rounded-[20px] border border-product-border bg-white p-3 text-left shadow-soft transition hover:border-product-primary/35" onClick={() => setView('bookings')}>
                  <CalendarDays size={18} className="text-product-primary" />
                  <span className="mt-2 block text-sm font-semibold text-product-main">Все записи</span>
                </button>
                <a className="rounded-[20px] border border-product-border bg-white p-3 text-left shadow-soft transition hover:border-product-primary/35" href={`tel:${school.phone}`}>
                  <MessageCircle size={18} className="text-product-primary" />
                  <span className="mt-2 block text-sm font-semibold text-product-main">Связаться</span>
                </a>
              </div>
            </div>
          </section>
        ) : null}

        {view === 'bookings' ? (
          <section>
            <h1 className="ui-h1">Записи</h1>
            <div className="mt-3">
              <SegmentedTabs value={bookingTab} onChange={setBookingTab} tabs={[{ value: 'upcoming', label: 'Будущие' }, { value: 'past', label: 'Прошлые' }]} />
            </div>
            <div className="mt-3 space-y-2">
              {(bookingTab === 'upcoming' ? upcoming : past).length === 0 ? <StateView title="Записей нет" /> : (bookingTab === 'upcoming' ? upcoming : past).map((item) => (
                <StudentBookingCard key={item.booking.id} {...item} />
              ))}
            </div>
          </section>
        ) : null}

        {view === 'profile' ? (
          <section>
            <h1 className="ui-h1">Профиль</h1>
            <p className="mt-1 text-base text-product-secondary">Данные используются для записи и входа в кабинет.</p>
            <div className="mt-4 space-y-3">
              <Input label="Имя" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
              <Input label="Телефон" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
              <Input label="E-mail" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
              <Button className="w-full" onClick={saveProfile}>Сохранить</Button>
            </div>
          </section>
        ) : null}
      </main>

      <BottomNav
        items={[
          { key: 'dashboard', label: 'Кабинет', icon: <UserRound size={20} />, active: view === 'dashboard', onClick: () => setView('dashboard') },
          { key: 'bookings', label: 'Записи', icon: <CalendarDays size={20} />, active: view === 'bookings', onClick: () => setView('bookings') },
          { key: 'profile', label: 'Профиль', icon: <Settings size={20} />, active: view === 'profile', onClick: () => setView('profile') },
        ]}
      />
    </div>
  )
}
