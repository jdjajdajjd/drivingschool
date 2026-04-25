import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  CalendarDays,
  TrendingUp,
  Users,
  Clock,
  ArrowRight,
  Puzzle,
} from 'lucide-react'
import { db } from '../../services/storage'
import { getModuleById } from '../../services/modules'
import { Button } from '../../components/ui/Button'
import { StatusBadge, Badge } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Avatar'
import { formatDate } from '../../utils/date'
import type { Booking, Instructor, Branch } from '../../types'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  delay?: number
}

function StatCard({ label, value, sub, icon: Icon, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      className="bg-white rounded-2xl border border-stone-100 shadow-card p-6"
    >
      <div className="flex items-start justify-between mb-4">
        <p className="text-sm text-stone-500 font-medium">{label}</p>
        <div className="w-9 h-9 bg-forest-50 rounded-xl flex items-center justify-center">
          <Icon size={16} className="text-forest-700" />
        </div>
      </div>
      <p className="text-4xl font-semibold text-stone-900 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-stone-400 mt-1">{sub}</p>}
    </motion.div>
  )
}

export function AdminDashboard() {
  const navigate = useNavigate()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [activeModules, setActiveModules] = useState<string[]>([])

  useEffect(() => {
    const school = db.schools.bySlug('virazh')
    if (!school) return
    const bs = db.bookings.bySchool(school.id)
    setBookings(bs)
    setInstructors(db.instructors.bySchool(school.id))
    setBranches(db.branches.bySchool(school.id))
    setActiveModules(db.subModules.bySchool(school.id).map((sm) => sm.moduleId))
  }, [])

  const now = new Date()
  const thisMonthBookings = bookings.filter((b) => {
    const d = new Date(b.createdAt)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const confirmedBookings = bookings.filter((b) => b.status === 'active')
  const allSlots = db.slots.all()
  const bookedSlots = allSlots.filter((s) => s.status === 'booked')
  const utilization =
    allSlots.length > 0 ? Math.round((bookedSlots.length / allSlots.length) * 100) : 0

  const recentBookings = [...bookings]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8)

  return (
    <div className="p-8 max-w-7xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <p className="text-xs text-stone-400 uppercase tracking-wide font-medium mb-1">
          Автошкола «Вираж»
        </p>
        <h1 className="font-sans text-3xl font-medium text-stone-900">Обзор</h1>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Записей в этом месяце"
          value={thisMonthBookings.length}
          sub={`из ${bookings.length} всего`}
          icon={CalendarDays}
          delay={0}
        />
        <StatCard
          label="Подтверждено"
          value={confirmedBookings.length}
          sub="активных записей"
          icon={TrendingUp}
          delay={0.05}
        />
        <StatCard
          label="Заполненность"
          value={`${utilization}%`}
          sub={`${bookedSlots.length} из ${allSlots.length} слотов`}
          icon={Clock}
          delay={0.1}
        />
        <StatCard
          label="Инструкторов"
          value={instructors.filter((i) => i.isActive).length}
          sub={`${branches.length} филиала`}
          icon={Users}
          delay={0.15}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent bookings */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="bg-white rounded-2xl border border-stone-100 shadow-card overflow-hidden"
          >
            <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between">
              <h2 className="font-sans text-lg font-medium text-stone-900">Последние записи</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/bookings')}>
                Все записи
                <ArrowRight size={14} />
              </Button>
            </div>
            <div className="divide-y divide-stone-50">
              {recentBookings.map((booking) => {
                const instructor = db.instructors.byId(booking.instructorId)
                const slot = db.slots.byId(booking.slotId)
                return (
                  <div key={booking.id} className="px-6 py-4 flex items-center gap-4 hover:bg-stone-50 transition-colors">
                    {instructor && (
                      <Avatar
                        initials={instructor.avatarInitials}
                        color={instructor.avatarColor}
                        size="sm"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-900 truncate">{booking.studentName}</p>
                      <p className="text-xs text-stone-400">
                        {instructor?.name.split(' ')[0]} ·{' '}
                        {slot ? `${formatDate(slot.date)}, ${slot.time}` : '—'}
                      </p>
                    </div>
                    <StatusBadge status={booking.status} />
                  </div>
                )
              })}
            </div>
          </motion.div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* Instructors */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="bg-white rounded-2xl border border-stone-100 shadow-card overflow-hidden"
          >
            <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between">
              <h2 className="font-sans text-lg font-medium text-stone-900">Инструкторы</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/instructors')}>
                <ArrowRight size={14} />
              </Button>
            </div>
            <div className="p-4 space-y-2">
              {instructors.map((instructor) => {
                const count = bookings.filter((b) => b.instructorId === instructor.id).length
                return (
                  <div key={instructor.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-stone-50 transition-colors">
                    <Avatar initials={instructor.avatarInitials} color={instructor.avatarColor} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-stone-900 truncate">
                        {instructor.name.split(' ').slice(0, 2).join(' ')}
                      </p>
                    </div>
                    <span className="text-xs text-stone-400">{count} зап.</span>
                  </div>
                )
              })}
            </div>
          </motion.div>

          {/* Active modules */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="bg-white rounded-2xl border border-stone-100 shadow-card overflow-hidden"
          >
            <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between">
              <h2 className="font-sans text-lg font-medium text-stone-900">Модули</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/modules')}>
                <Puzzle size={14} />
                <ArrowRight size={14} />
              </Button>
            </div>
            <div className="p-4 space-y-2">
              {activeModules.map((mid) => {
                const m = getModuleById(mid)
                if (!m) return null
                return (
                  <div key={mid} className="flex items-center gap-2 px-2 py-1.5">
                    <div className="w-1.5 h-1.5 bg-forest-500 rounded-full" />
                    <span className="text-xs text-stone-700">{m.name}</span>
                    <Badge variant="forest" size="sm" className="ml-auto">Активен</Badge>
                  </div>
                )
              })}
              <button
                onClick={() => navigate('/admin/modules')}
                className="w-full text-center text-xs text-forest-700 font-medium py-2 hover:underline"
              >
                Подключить ещё
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
