import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, CalendarDays, Clock3, Puzzle, TrendingUp, Users } from 'lucide-react'
import { Avatar } from '../../components/ui/Avatar'
import { Badge, StatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/PageHeader'
import { Section } from '../../components/ui/Section'
import { StatCard } from '../../components/ui/StatCard'
import { getModuleById } from '../../services/modules'
import { db } from '../../services/storage'
import type { Booking, Branch, Instructor } from '../../types'
import { formatDate } from '../../utils/date'

export function AdminDashboard() {
  const navigate = useNavigate()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [activeModules, setActiveModules] = useState<string[]>([])

  useEffect(() => {
    const school = db.schools.bySlug('virazh')
    if (!school) {
      return
    }

    setBookings(db.bookings.bySchool(school.id))
    setInstructors(db.instructors.bySchool(school.id))
    setBranches(db.branches.bySchool(school.id))
    setActiveModules(db.subModules.bySchool(school.id).map((subscription) => subscription.moduleId))
  }, [])

  const now = new Date()
  const thisMonthBookings = bookings.filter((booking) => {
    const createdAt = new Date(booking.createdAt)
    return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear()
  })
  const activeBookings = bookings.filter((booking) => booking.status === 'active')
  const allSlots = db.slots.all()
  const bookedSlots = allSlots.filter((slot) => slot.status === 'booked')
  const utilization = allSlots.length > 0 ? Math.round((bookedSlots.length / allSlots.length) * 100) : 0
  const recentBookings = [...bookings]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 8)

  return (
    <div className="max-w-7xl p-6 md:p-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <PageHeader
          eyebrow="Автошкола «Вираж»"
          title="Обзор"
          description="Ключевые показатели, последние записи и активные модули без визуального шума."
        />
      </motion.div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Записей в этом месяце"
          value={thisMonthBookings.length}
          meta={`из ${bookings.length} всего`}
          icon={<CalendarDays size={18} />}
        />
        <StatCard
          label="Активные записи"
          value={activeBookings.length}
          meta="Требуют внимания"
          icon={<TrendingUp size={18} />}
        />
        <StatCard
          label="Заполненность"
          value={`${utilization}%`}
          meta={`${bookedSlots.length} из ${allSlots.length} слотов`}
          icon={<Clock3 size={18} />}
        />
        <StatCard
          label="Инструкторы"
          value={instructors.filter((instructor) => instructor.isActive).length}
          meta={`${branches.length} филиала`}
          icon={<Users size={18} />}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }} className="lg:col-span-2">
          <Section
            title="Последние записи"
            description="Последние действия учеников и изменения статусов."
            actions={
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/bookings')}>
                Все записи
                <ArrowRight size={14} />
              </Button>
            }
          >
            <div className="divide-y divide-stone-100">
              {recentBookings.map((booking) => {
                const instructor = db.instructors.byId(booking.instructorId)
                const slot = db.slots.byId(booking.slotId)
                return (
                  <div key={booking.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                    {instructor ? (
                      <Avatar initials={instructor.avatarInitials} color={instructor.avatarColor} size="sm" />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-stone-900">{booking.studentName}</p>
                      <p className="text-sm text-stone-500">
                        {instructor?.name.split(' ')[0] ?? 'Инструктор'} · {slot ? `${formatDate(slot.date)}, ${slot.time}` : 'Без слота'}
                      </p>
                    </div>
                    <StatusBadge status={booking.status} />
                  </div>
                )
              })}
            </div>
          </Section>
        </motion.div>

        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}>
            <Section
              title="Инструкторы"
              actions={
                <Button variant="ghost" size="sm" onClick={() => navigate('/admin/instructors')}>
                  <ArrowRight size={14} />
                </Button>
              }
            >
              <div className="space-y-3">
                {instructors.map((instructor) => {
                  const count = bookings.filter((booking) => booking.instructorId === instructor.id).length
                  return (
                    <div key={instructor.id} className="flex items-center gap-3">
                      <Avatar initials={instructor.avatarInitials} color={instructor.avatarColor} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-stone-900">
                          {instructor.name.split(' ').slice(0, 2).join(' ')}
                        </p>
                      </div>
                      <span className="text-xs text-stone-400">{count} зап.</span>
                    </div>
                  )
                })}
              </div>
            </Section>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.15 }}>
            <Section
              title="Модули"
              actions={
                <Button variant="ghost" size="sm" onClick={() => navigate('/admin/modules')}>
                  <Puzzle size={14} />
                  <ArrowRight size={14} />
                </Button>
              }
            >
              <div className="space-y-2">
                {activeModules.map((moduleId) => {
                  const module = getModuleById(moduleId)
                  if (!module) {
                    return null
                  }

                  return (
                    <div key={moduleId} className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-forest-500" />
                      <span className="text-sm text-stone-700">{module.name}</span>
                      <Badge variant="forest" size="sm" className="ml-auto">
                        Активен
                      </Badge>
                    </div>
                  )
                })}

                {activeModules.length === 0 ? (
                  <p className="text-sm text-stone-500">Пока нет подключённых модулей.</p>
                ) : null}
              </div>
            </Section>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
