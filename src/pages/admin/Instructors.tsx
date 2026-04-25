import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ExternalLink, Star, Users } from 'lucide-react'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'
import { pluralize } from '../../lib/utils'
import { db } from '../../services/storage'
import type { Booking, Branch, Instructor } from '../../types'

export function AdminInstructors() {
  const navigate = useNavigate()
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [branches, setBranches] = useState<Map<string, Branch>>(new Map())
  const [bookingCounts, setBookingCounts] = useState<Map<string, number>>(new Map())

  useEffect(() => {
    const school = db.schools.bySlug('virazh')
    if (!school) {
      return
    }

    setInstructors(db.instructors.bySchool(school.id))

    const branchMap = new Map<string, Branch>()
    db.branches.bySchool(school.id).forEach((branch) => branchMap.set(branch.id, branch))
    setBranches(branchMap)

    const bookings: Booking[] = db.bookings.bySchool(school.id)
    const counts = new Map<string, number>()
    bookings.forEach((booking) => counts.set(booking.instructorId, (counts.get(booking.instructorId) ?? 0) + 1))
    setBookingCounts(counts)
  }, [])

  return (
    <div className="max-w-7xl p-6 md:p-8">
      <PageHeader
        eyebrow="Admin"
        title="Инструкторы"
        description="Состав команды, машины, филиалы и быстрые ссылки на личные страницы."
        actions={
          <Button>
            <Users size={16} />
            Добавить
          </Button>
        }
      />

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {instructors.map((instructor, index) => {
          const branch = branches.get(instructor.branchId)
          const bookingCount = bookingCounts.get(instructor.id) ?? 0
          const transmission = instructor.transmission === 'manual' ? 'Механика' : instructor.transmission === 'auto' ? 'Автомат' : 'Не указана'

          return (
            <motion.div key={instructor.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: index * 0.04 }}>
              <Card padding="md">
                <div className="flex items-start gap-4">
                  <Avatar initials={instructor.avatarInitials} color={instructor.avatarColor} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-stone-900">{instructor.name}</h3>
                      <Badge variant={instructor.isActive ? 'success' : 'default'}>
                        {instructor.isActive ? 'Активен' : 'Неактивен'}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-1 text-sm text-stone-500">
                      <Star size={12} className="fill-amber-400 text-amber-400" />
                      {pluralize(instructor.experience, 'год', 'года', 'лет')} опыта
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 text-sm text-stone-500">
                  <p>Машина: <span className="font-medium text-stone-800">{instructor.car ?? 'Не указана'}</span></p>
                  <p>Коробка: <span className="font-medium text-stone-800">{transmission}</span></p>
                  <p>Филиал: <span className="font-medium text-stone-800">{branch?.name ?? 'Не найден'}</span></p>
                  <p>Записей: <span className="font-medium text-stone-800">{bookingCount}</span></p>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {instructor.categories.map((category) => (
                    <Badge key={category} variant="outline">
                      кат. {category}
                    </Badge>
                  ))}
                </div>

                <p className="mt-5 text-sm leading-relaxed text-stone-500">{instructor.bio}</p>

                <div className="mt-6 flex gap-2 border-t border-stone-100 pt-4">
                  <Button variant="secondary" size="sm" className="flex-1">
                    Редактировать
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/instructor/${instructor.token}`)}>
                    <ExternalLink size={14} />
                    Ссылка
                  </Button>
                </div>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
