import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, LogOut, MessageCircle, Pencil, Plus, Settings, UserRound } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { BottomNav } from '../components/ui/BottomNav'
import { Input } from '../components/ui/Input'
import { SegmentedTabs } from '../components/ui/SegmentedTabs'
import { StateView } from '../components/ui/StateView'
import { StudentBookingCard } from '../components/product/CompactCards'
import { db } from '../services/storage'
import { findAnyStudentProfile, loadStudentProfile, removeStudentProfile, saveStudentProfile, type StudentProfile } from '../services/studentProfile'
import { generateIcs, normalizePhone } from '../services/bookingService'
import type { Booking, Branch, Instructor, School, Slot } from '../types'
import { formatInstructorName, formatPhone } from '../lib/utils'
import { formatHumanDate, formatTimeRange, getRelativeLessonLabel } from '../utils/date'

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

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'У'
}

function downloadBookingCalendar(bookingId: string): void {
  const content = generateIcs(bookingId)
  if (!content) return
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${bookingId}.ics`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
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
    if (!nextProfile) navigate('/student/register', { replace: true })
  }, [navigate])

  const bookings = useMemo(() => school && profile ? resolveBookings(school.id, profile) : [], [school, profile])
  const now = Date.now()
  const upcoming = bookings.filter((item) => item.slot && new Date(`${item.slot.date}T${item.slot.time}:00`).getTime() >= now && item.booking.status === 'active')
  const past = bookings.filter((item) => !upcoming.some((future) => future.booking.id === item.booking.id))
  const next = upcoming[0] ?? null
  const branch = profile?.assignedBranchId ? db.branches.byId(profile.assignedBranchId) : next?.branch ?? null

  if (!school || !profile) {
    return (
      <div className="shell flex min-h-screen items-center justify-center px-4">
        <StateView
          kind="locked"
          title="Кабинет ещё не создан"
          description="Сначала зарегистрируйтесь по ФИО и телефону. После этого откроется личный кабинет ученика."
          action={<Button onClick={() => navigate('/student/register')}>Создать кабинет</Button>}
        />
      </div>
    )
  }

  function saveProfile() {
    if (!school) return
    const saved = saveStudentProfile(school.id, { ...form, avatarUrl: profile?.avatarUrl ?? '' }, { passwordSet: profile?.passwordSet, assignedBranchId: profile?.assignedBranchId })
    setProfile(saved)
    setView('dashboard')
  }

  function logout() {
    if (school) removeStudentProfile(school.id)
    setProfile(null)
    navigate(`/school/${school?.slug ?? 'virazh'}`)
  }

  return (
    <div className="shell">
      <main className="mx-auto w-full max-w-2xl overflow-x-hidden px-4 pb-28 pt-4">
        {view === 'dashboard' ? (
          <section className="space-y-3">
            {/* Profile header */}
            <div
              className="flex items-center gap-3.5 p-4"
              style={{
                background: 'white',
                border: '1px solid rgba(0,0,0,0.06)',
                borderRadius: '24px',
                boxShadow: '0 18px 45px rgba(15,20,25,0.10)',
                minHeight: '80px',
              }}
            >
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full font-extrabold text-[18px]"
                style={{ background: 'rgba(196,147,90,0.12)', color: '#9B7034' }}
              >
                {profile.avatarUrl ? <img src={profile.avatarUrl} alt={profile.name} className="h-full w-full object-cover" /> : initials(profile.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="t-micro">Кабинет ученика</p>
                <h1
                  className="truncate font-extrabold tracking-tight text-[#111418]"
                  style={{ fontSize: '20px', lineHeight: '1.2' }}
                >
                  {profile.name}
                </h1>
                <p className="mt-1 truncate text-[13px] font-medium" style={{ color: '#6F747A' }}>
                  {formatPhone(profile.phone)}
                  {branch ? ` · ${branch.name}` : ''}
                </p>
              </div>
              <button
                aria-label="Настройки"
                className="flex h-10 w-10 items-center justify-center rounded-full transition-all hover:-translate-y-0.5"
                style={{ background: '#F4F5F6', color: '#6F747A' }}
                onClick={() => setView('profile')}
              >
                <Settings size={16} />
              </button>
            </div>

            {/* Next lesson */}
            <section
              className="card p-5"
              style={{ borderRadius: '24px' }}
            >
              <p className="t-micro">Ближайшее занятие</p>
              {next?.slot ? (
                <>
                  <div className="mt-3 flex items-start justify-between gap-3">
                    <div>
                      <h2
                        className="font-extrabold tracking-tight text-[#111418]"
                        style={{ fontSize: '24px', lineHeight: '1.2' }}
                      >
                        {getRelativeLessonLabel(next.slot)}
                      </h2>
                      <p className="mt-1 font-extrabold tracking-tight text-[#111418]" style={{ fontSize: '16px' }}>
                        {formatTimeRange(next.slot)}
                      </p>
                      <p className="mt-1 text-[13px] font-semibold" style={{ color: '#6F747A' }}>
                        {formatHumanDate(next.slot.date, false)}
                      </p>
                    </div>
                    <span
                      className="inline-flex items-center rounded-sm px-2.5 py-1 text-[12px] font-semibold"
                      style={{ background: '#F0FDF4', color: '#15803D', border: '1px solid rgba(21,128,61,0.15)' }}
                    >
                      активна
                    </span>
                  </div>
                  <div
                    className="mt-4 p-3.5"
                    style={{ background: '#F4F5F6', borderRadius: '16px' }}
                  >
                    <p className="text-[14px] font-semibold text-[#111418]">
                      {next.instructor ? formatInstructorName(next.instructor.name) : 'Инструктор'}
                    </p>
                    <p className="mt-0.5 text-[13px] font-medium" style={{ color: '#6F747A' }}>
                      {next.instructor?.car ?? 'Учебный автомобиль'} · {next.branch?.name ?? 'Филиал'}
                    </p>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2.5">
                    <button className="btn-secondary py-3 text-[14px]" onClick={() => downloadBookingCalendar(next.booking.id)}>
                      В календарь
                    </button>
                    <button className="btn-ghost py-3 text-[14px]" onClick={() => setView('bookings')}>
                      Все записи
                    </button>
                  </div>
                </>
              ) : (
                <StateView
                  title="У вас пока нет записей"
                  description="Выберите инструктора и удобное время."
                  action={<Button onClick={() => navigate(`/school/${school.slug}/book`)}>Записаться</Button>}
                  className="mt-3"
                />
              )}
            </section>

            {/* Upcoming bookings */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[15px] font-extrabold tracking-tight text-[#111418]">Мои записи</p>
                {upcoming.length > 1 ? (
                  <button
                    className="text-[13px] font-bold transition-colors hover:opacity-80"
                    style={{ color: '#C4935A' }}
                    onClick={() => setView('bookings')}
                  >
                    Все
                  </button>
                ) : null}
              </div>
              {upcoming.length === 0 ? null : upcoming.slice(0, 3).map((item) => (
                <StudentBookingCard key={item.booking.id} {...item} />
              ))}
            </section>

            {/* Quick actions */}
            <section className="space-y-2.5">
              <p className="text-[15px] font-extrabold tracking-tight text-[#111418]">Быстрые действия</p>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { icon: Plus, label: 'Записаться ещё', onClick: () => navigate(`/school/${school.slug}/book`) },
                  { icon: CalendarDays, label: 'Страница школы', onClick: () => navigate(`/school/${school.slug}`) },
                  { icon: Pencil, label: 'Настройки', onClick: () => setView('profile') },
                  { icon: MessageCircle, label: 'Позвонить', href: `tel:${school.phone}` },
                ].map((action) => (
                  action.href ? (
                    <a
                      key={action.label}
                      href={action.href}
                      className="card flex flex-col items-start gap-2 p-4"
                      style={{ cursor: 'pointer' }}
                    >
                      <action.icon size={16} style={{ color: '#C4935A' }} />
                      <span className="text-[13px] font-semibold text-[#111418]">{action.label}</span>
                    </a>
                  ) : (
                    <button
                      key={action.label}
                      className="card flex flex-col items-start gap-2 p-4 text-left"
                      onClick={action.onClick}
                    >
                      <action.icon size={16} style={{ color: '#C4935A' }} />
                      <span className="text-[13px] font-semibold text-[#111418]">{action.label}</span>
                    </button>
                  )
                ))}
              </div>
            </section>
          </section>
        ) : null}

        {view === 'bookings' ? (
          <section>
            <h2
              className="font-extrabold tracking-tight"
              style={{ fontSize: 'clamp(20px, 5vw, 26px)', lineHeight: 1.15, color: '#111418' }}
            >
              Мои записи
            </h2>
            <p className="t-body mt-2">Только занятия, записанные на ваш номер.</p>
            <div className="mt-4">
              <SegmentedTabs
                value={bookingTab}
                onChange={setBookingTab}
                tabs={[{ value: 'upcoming', label: 'Будущие' }, { value: 'past', label: 'История' }]}
              />
            </div>
            <div className="mt-4 space-y-2.5">
              {(bookingTab === 'upcoming' ? upcoming : past).length === 0 ? (
                <StateView title="Записей нет" action={bookingTab === 'upcoming' ? <Button onClick={() => navigate(`/school/${school.slug}/book`)}>Записаться</Button> : undefined} />
              ) : (bookingTab === 'upcoming' ? upcoming : past).map((item) => (
                <StudentBookingCard key={item.booking.id} {...item} />
              ))}
            </div>
          </section>
        ) : null}

        {view === 'profile' ? (
          <section>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2
              className="font-extrabold tracking-tight"
              style={{ fontSize: 'clamp(20px, 5vw, 26px)', lineHeight: 1.15, color: '#111418' }}
            >
              Настройки
            </h2>
            <p className="t-body mt-2">
              Контакты для записи и входа.
            </p>
              </div>
              <button
                aria-label="Выйти"
                className="flex h-10 w-10 items-center justify-center rounded-full transition-all hover:-translate-y-0.5"
                style={{ background: '#FEF2F2', color: '#E5534B' }}
                onClick={logout}
              >
                <LogOut size={16} />
              </button>
            </div>
            <div className="mt-5 space-y-4">
              <Input label="Имя" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
              <Input label="Телефон" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
              <Input label="E-mail" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
              <button className="btn-primary w-full py-3.5 text-[15px]" onClick={saveProfile}>
                Сохранить
              </button>
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
