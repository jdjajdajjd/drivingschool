import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ExternalLink, Star, Users } from 'lucide-react'
import { db } from '../../services/storage'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Avatar'
import { pluralize } from '../../lib/utils'
import type { Instructor, Branch, Booking } from '../../types'

export function AdminInstructors() {
  const navigate = useNavigate()
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [branches, setBranches] = useState<Map<string, Branch>>(new Map())
  const [bookingCounts, setBookingCounts] = useState<Map<string, number>>(new Map())

  useEffect(() => {
    const school = db.schools.bySlug('virazh')
    if (!school) return
    setInstructors(db.instructors.bySchool(school.id))

    const bMap = new Map<string, Branch>()
    db.branches.bySchool(school.id).forEach((b) => bMap.set(b.id, b))
    setBranches(bMap)

    const bookings: Booking[] = db.bookings.bySchool(school.id)
    const counts = new Map<string, number>()
    bookings.forEach((b) => counts.set(b.instructorId, (counts.get(b.instructorId) ?? 0) + 1))
    setBookingCounts(counts)
  }, [])

  return (
    <div className="p-8 max-w-7xl">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-start justify-between mb-8"
      >
        <div>
          <p className="text-xs text-stone-400 uppercase tracking-wide font-medium mb-1">
            Управление
          </p>
          <h1 className="font-sans text-3xl font-medium text-stone-900">Инструкторы</h1>
        </div>
        <Button>
          <Users size={16} />
          Добавить
        </Button>
      </motion.div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {instructors.map((instructor, idx) => {
          const branch = branches.get(instructor.branchId)
          const count = bookingCounts.get(instructor.id) ?? 0
          return (
            <motion.div
              key={instructor.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
              className="bg-white rounded-2xl border border-stone-100 shadow-card p-6 hover:shadow-card-hover transition-shadow duration-200"
            >
              <div className="flex items-start gap-4 mb-4">
                <Avatar
                  initials={instructor.avatarInitials}
                  color={instructor.avatarColor}
                  size="lg"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-sans text-base font-medium text-stone-900 leading-tight">
                    {instructor.name}
                  </h3>
                  <div className="flex items-center gap-1 mt-1">
                    <Star size={11} className="text-amber-400 fill-amber-400" />
                    <span className="text-xs text-stone-500">
                      {pluralize(instructor.experience, 'год', 'года', 'лет')} опыта
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {instructor.categories.map((cat) => (
                      <Badge key={cat} variant="outline" size="sm">
                        кат. {cat}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Badge variant={instructor.isActive ? 'success' : 'default'} size="sm">
                  {instructor.isActive ? 'Активен' : 'Неактивен'}
                </Badge>
              </div>

              <p className="text-xs text-stone-400 leading-relaxed mb-4 line-clamp-2">{instructor.bio}</p>

              <div className="flex items-center justify-between pt-4 border-t border-stone-100">
                <div>
                  {branch && (
                    <p className="text-xs text-stone-500">{branch.name}</p>
                  )}
                  <p className="text-xs text-stone-400">{count} записей</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/instructor/${instructor.token}`)}
                >
                  <ExternalLink size={14} />
                  Расписание
                </Button>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
