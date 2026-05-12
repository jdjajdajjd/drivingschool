import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { addDays, format, isBefore, isSameDay, startOfDay } from 'date-fns'
import { ru } from 'date-fns/locale'
import { AlertTriangle, CalendarPlus, CheckCircle2, Clock3, ExternalLink, WalletCards } from 'lucide-react'
import { db } from '../../services/storage'
import { adminCars, adminDocuments, adminInternalExams, adminPayments, problemCases } from '../../services/adminStorage'
import { getSlotDateTime } from '../../services/bookingService'
import { ADMIN_BASE_PATH } from '../../services/accessControl'

function money(value: number) {
  return `${value.toLocaleString('ru-RU')} ₽`
}

function useTodayData(schoolId: string) {
  return useMemo(() => {
    const now = new Date()
    const today = format(now, 'yyyy-MM-dd')
    const slots = db.slots.bySchool(schoolId)
    const bookings = db.bookings.bySchool(schoolId)
    const instructors = db.instructors.bySchool(schoolId)
    const students = db.students.bySchool(schoolId)
    const branches = db.branches.bySchool(schoolId)
    const payments = adminPayments.all(schoolId)

    const todaySlots = slots.filter((slot) => slot.date === today)
    const todayBookings = bookings
      .map((booking) => ({ booking, slot: db.slots.byId(booking.slotId) }))
      .filter((entry) => entry.slot && isSameDay(getSlotDateTime(entry.slot), now))

    const activeToday = todayBookings.filter((entry) => entry.booking.status === 'active')
    const upcoming = bookings
      .map((booking) => ({ booking, slot: db.slots.byId(booking.slotId) }))
      .filter((entry): entry is { booking: typeof bookings[number]; slot: NonNullable<ReturnType<typeof db.slots.byId>> } =>
        Boolean(entry.slot && entry.booking.status === 'active' && getSlotDateTime(entry.slot) > now),
      )
      .sort((left, right) => getSlotDateTime(left.slot).getTime() - getSlotDateTime(right.slot).getTime())
      .slice(0, 7)

    const debtStudents = new Set<string>()
    payments.forEach((payment) => {
      if ((payment.status === 'overdue' || payment.status === 'partial' || payment.status === 'unpaid') && payment.remainingAmount > 0) {
        debtStudents.add(payment.studentId)
      }
    })

    const overdueAmount = payments.reduce((sum, payment) => {
      if (payment.status === 'overdue' || payment.status === 'partial' || payment.status === 'unpaid') return sum + payment.remainingAmount
      return sum
    }, 0)
    const paidToday = payments
      .filter((payment) => payment.paidAt && isSameDay(new Date(payment.paidAt), now))
      .reduce((sum, payment) => sum + payment.paidAmount, 0)

    const overdueBookings = bookings.filter((booking) => {
      const slot = db.slots.byId(booking.slotId)
      return Boolean(slot && booking.status === 'active' && isBefore(getSlotDateTime(slot), startOfDay(now)))
    }).length

    const instructorLoads = instructors.filter((instructor) => instructor.isActive).map((instructor) => {
      const ownSlots = todaySlots.filter((slot) => slot.instructorId === instructor.id)
      const booked = ownSlots.filter((slot) => slot.status === 'booked').length
      return { instructor, booked, total: ownSlots.length }
    })

    const next7Days = addDays(now, 7)
    const examsSoon = adminInternalExams.all(schoolId).filter((exam) => {
      if (!exam.scheduledDate || exam.status !== 'scheduled') return false
      const date = new Date(exam.scheduledDate)
      return date >= now && date <= next7Days
    }).length

    return {
      slots,
      bookings,
      instructors,
      students,
      branches,
      todaySlots,
      activeToday,
      upcoming,
      freeSlotsToday: todaySlots.filter((slot) => slot.status === 'available').length,
      cancelledToday: todayBookings.filter((entry) => entry.booking.status === 'cancelled').length,
      noShowsToday: todayBookings.filter((entry) => entry.booking.status === 'no_show').length,
      debtStudentsCount: debtStudents.size,
      overdueAmount,
      paidToday,
      overdueBookings,
      carsInRepair: adminCars.all(schoolId).filter((car) => car.status === 'repair' || car.status === 'maintenance').length,
      docsExpiring: adminDocuments.expiringSoon(schoolId, 14).length,
      openProblems: problemCases.open(schoolId).length,
      examsSoon,
      idleInstructors: instructorLoads.filter((load) => load.total > 0 && load.booked === 0).length,
      busyInstructors: instructorLoads.filter((load) => load.booked >= 5).length,
    }
  }, [schoolId])
}

function Stat({ label, value, tone = 'muted', to }: { label: string; value: string | number; tone?: 'muted' | 'ok' | 'danger' | 'warning' | 'info'; to: string }) {
  const toneClass = {
    muted: '',
    ok: 'border-[#BFE7CF] bg-[#F7FCF9]',
    danger: 'border-[#F2B8B5] bg-[#FFF8F7]',
    warning: 'border-[#F7D58B] bg-[#FFFDF7]',
    info: 'border-[#BFD1FF] bg-[#F8FAFF]',
  }[tone]

  return (
    <Link to={to} className={`v-admin-stat transition hover:-translate-y-0.5 hover:border-[#B8C2CC] ${toneClass}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </Link>
  )
}

function PriorityCard({ title, text, tone, to }: { title: string; text: string; tone: 'danger' | 'warning' | 'info'; to: string }) {
  const iconClass = tone === 'danger' ? 'text-[#B42318]' : tone === 'warning' ? 'text-[#A45A00]' : 'text-[#2457C5]'
  return (
    <Link to={to} className="flex items-start gap-3 rounded-[10px] border border-[#DCE2E8] bg-white p-4 transition hover:border-[#B8C2CC]">
      <AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${iconClass}`} />
      <span className="min-w-0">
        <span className="block text-[14px] font-black leading-5 text-[#111418]">{title}</span>
        <span className="mt-1 block text-[13px] font-bold leading-5 text-[#66717D]">{text}</span>
      </span>
    </Link>
  )
}

export function AdminToday() {
  const school = db.schools.all()[0]
  const navigate = useNavigate()

  if (!school) {
    return <div className="v-admin-empty m-4"><strong>Школа не найдена</strong><span>Проверьте рабочее пространство.</span></div>
  }

  const data = useTodayData(school.id)
  const priorities = [
    data.overdueBookings > 0 ? { title: 'Закрыть прошедшие занятия', text: `${data.overdueBookings} занятий уже прошли, но не отмечены`, tone: 'danger' as const, to: `${ADMIN_BASE_PATH}/schedule` } : null,
    data.debtStudentsCount > 0 ? { title: 'Разобрать долги учеников', text: `${data.debtStudentsCount} учеников должны ${money(data.overdueAmount)}`, tone: 'danger' as const, to: `${ADMIN_BASE_PATH}/payments` } : null,
    data.openProblems > 0 ? { title: 'Открытые проблемы', text: `${data.openProblems} ситуаций ждут решения`, tone: 'warning' as const, to: `${ADMIN_BASE_PATH}/reports` } : null,
    data.carsInRepair > 0 ? { title: 'Машины недоступны', text: `${data.carsInRepair} машин в ремонте или обслуживании`, tone: 'warning' as const, to: `${ADMIN_BASE_PATH}/cars` } : null,
    data.docsExpiring > 0 ? { title: 'Документы скоро истекут', text: `${data.docsExpiring} документов проверить за 14 дней`, tone: 'info' as const, to: `${ADMIN_BASE_PATH}/documents` } : null,
  ].filter(Boolean)

  return (
    <div className="v-admin-workspace">
      <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="v-admin-panel overflow-hidden border-[#194A44] bg-[linear-gradient(135deg,#10201F_0%,#123043_58%,#0E7C66_135%)] text-white">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 p-5">
            <div>
              <p className="text-[13px] font-black uppercase text-[#9FE0D0]">{school.name}</p>
              <h1 className="mt-2 text-[34px] font-black leading-none text-white md:text-[42px]">
                {format(new Date(), 'EEEE, d MMMM', { locale: ru })}
              </h1>
              <p className="mt-3 max-w-2xl text-[15px] font-bold leading-6 text-white/62">
                Операционный пульт: расписание, долги, свободные окна и проблемы на сегодня.
              </p>
            </div>
            <button className="min-h-10 inline-flex items-center justify-center gap-2 rounded-[9px] bg-white px-4 text-[13px] font-black text-[#10201F] shadow-[0_14px_28px_rgba(0,0,0,0.18)] transition hover:bg-[#E7F6F0]" onClick={() => navigate(`${ADMIN_BASE_PATH}/schedule`)}>
              <CalendarPlus size={16} />
              Создать окна
            </button>
          </div>
          <div className="grid grid-cols-2 divide-x divide-y divide-white/10 md:grid-cols-4 md:divide-y-0">
            {[
              ['занятий', data.activeToday.length],
              ['свободных окон', data.freeSlotsToday],
              ['отмен', data.cancelledToday],
              ['неявок', data.noShowsToday],
            ].map(([label, value]) => (
              <div key={label} className="p-5">
                <strong className="block text-[42px] font-black leading-none text-white">{value}</strong>
                <span className="mt-2 block text-[12px] font-black uppercase text-white/48">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <aside className="v-admin-panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[18px] font-black text-[#111418]">Деньги сегодня</h2>
              <p className="v-admin-note mt-1">Оплаты и общий риск по долгам</p>
            </div>
            <WalletCards className="h-6 w-6 text-[#157347]" />
          </div>
          <div className="mt-5 grid gap-3">
            <div className="rounded-[10px] bg-[#EAF7EF] p-4">
              <span className="text-[12px] font-black uppercase text-[#157347]">Оплачено сегодня</span>
              <strong className="mt-1 block text-[28px] font-black leading-none text-[#111418]">{money(data.paidToday)}</strong>
            </div>
            <div className="rounded-[10px] bg-[#FFF3F2] p-4">
              <span className="text-[12px] font-black uppercase text-[#B42318]">Долг учеников</span>
              <strong className="mt-1 block text-[28px] font-black leading-none text-[#111418]">{money(data.overdueAmount)}</strong>
            </div>
          </div>
        </aside>
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="учеников с долгом" value={data.debtStudentsCount} tone={data.debtStudentsCount ? 'danger' : 'muted'} to={`${ADMIN_BASE_PATH}/payments`} />
        <Stat label="проблем открыто" value={data.openProblems} tone={data.openProblems ? 'warning' : 'muted'} to={`${ADMIN_BASE_PATH}/reports`} />
        <Stat label="экзаменов за 7 дней" value={data.examsSoon} tone="info" to={`${ADMIN_BASE_PATH}/exams`} />
        <Stat label="инструкторов без загрузки" value={data.idleInstructors} tone={data.idleInstructors > 1 ? 'warning' : 'muted'} to={`${ADMIN_BASE_PATH}/instructors`} />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_390px]">
        <div className="v-admin-panel overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-[#DCE2E8] p-4">
            <div>
              <h2 className="text-[18px] font-black text-[#111418]">Ближайшие занятия</h2>
              <p className="v-admin-note mt-1">Кто, куда и во сколько едет дальше</p>
            </div>
            <Link to={`${ADMIN_BASE_PATH}/schedule`} className="v-admin-button-secondary">
              Все
              <ExternalLink size={15} />
            </Link>
          </div>
          {data.upcoming.length === 0 ? (
            <div className="v-admin-empty m-4">
              <CheckCircle2 className="mb-2 h-8 w-8 text-[#157347]" />
              <strong>Ближайших занятий нет</strong>
              <span>Создайте окна или запишите ученика из расписания.</span>
            </div>
          ) : (
            <div className="divide-y divide-[#EEF2F5]">
              {data.upcoming.map(({ booking, slot }) => {
                const instructor = data.instructors.find((item) => item.id === booking.instructorId)
                const branch = data.branches.find((item) => item.id === booking.branchId)
                return (
                  <button
                    key={booking.id}
                    onClick={() => navigate(`${ADMIN_BASE_PATH}/schedule`)}
                    className="grid w-full grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-4 p-4 text-left transition hover:bg-[#F8FAFC]"
                  >
                    <span className="rounded-[10px] bg-[#EEF2F5] px-3 py-2 text-center">
                      <span className="block text-[17px] font-black text-[#111418]">{format(getSlotDateTime(slot), 'HH:mm')}</span>
                      <span className="block text-[11px] font-black text-[#66717D]">{format(getSlotDateTime(slot), 'dd.MM')}</span>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-black text-[#111418]">{booking.studentName}</span>
                      <span className="mt-1 block truncate text-[13px] font-bold text-[#66717D]">{instructor?.name ?? 'Инструктор'} · {branch?.name ?? 'Филиал'}</span>
                    </span>
                    <span className="v-admin-pill v-tone-info hidden sm:inline-flex">{slot.duration} мин</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <aside className="grid gap-4">
          <div className="v-admin-panel p-4">
            <h2 className="text-[18px] font-black text-[#111418]">Требует внимания</h2>
            <div className="mt-3 grid gap-2">
              {priorities.length ? priorities.map((item) => (
                <PriorityCard key={item!.title} {...item!} />
              )) : (
                <div className="rounded-[10px] bg-[#EAF7EF] p-4">
                  <strong className="block text-[15px] font-black text-[#111418]">Критичных задач нет</strong>
                  <span className="mt-1 block text-[13px] font-bold text-[#157347]">День выглядит спокойно.</span>
                </div>
              )}
            </div>
          </div>

          <div className="v-admin-panel p-4">
            <h2 className="text-[18px] font-black text-[#111418]">Быстрые действия</h2>
            <div className="mt-3 grid gap-2">
              {[
                ['Записать ученика', `${ADMIN_BASE_PATH}/students`],
                ['Создать свободные окна', `${ADMIN_BASE_PATH}/schedule`],
                ['Принять оплату', `${ADMIN_BASE_PATH}/payments`],
                ['Открыть страницу школы', `/school/${school.slug}`],
              ].map(([label, to]) => (
                <Link key={label} to={to} className="v-admin-button-secondary justify-start">
                  <Clock3 size={15} />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </div>
  )
}
