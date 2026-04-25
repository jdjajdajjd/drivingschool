import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Building2, MapPin, Phone, Users } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'
import { formatPhone } from '../../lib/utils'
import { db } from '../../services/storage'
import type { Branch, Instructor } from '../../types'

export function AdminBranches() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [instructorCounts, setInstructorCounts] = useState<Map<string, number>>(new Map())

  useEffect(() => {
    const school = db.schools.bySlug('virazh')
    if (!school) {
      return
    }

    setBranches(db.branches.bySchool(school.id))

    const counts = new Map<string, number>()
    const instructors: Instructor[] = db.instructors.bySchool(school.id)
    instructors.forEach((instructor) => counts.set(instructor.branchId, (counts.get(instructor.branchId) ?? 0) + 1))
    setInstructorCounts(counts)
  }, [])

  return (
    <div className="max-w-7xl p-6 md:p-8">
      <PageHeader
        eyebrow="Admin"
        title="Филиалы"
        description="Читаемый список филиалов, адресов и нагрузки по инструкторам."
        actions={
          <Button>
            <Building2 size={16} />
            Добавить
          </Button>
        }
      />

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {branches.map((branch, index) => {
          const count = instructorCounts.get(branch.id) ?? 0
          return (
            <motion.div key={branch.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: index * 0.05 }}>
              <Card padding="md">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-100 text-forest-700">
                    <Building2 size={18} />
                  </div>
                  <Badge variant={branch.isActive ? 'success' : 'default'}>
                    {branch.isActive ? 'Активен' : 'Закрыт'}
                  </Badge>
                </div>

                <h3 className="mt-5 text-lg font-semibold text-stone-900">{branch.name}</h3>

                <div className="mt-5 space-y-3 text-sm text-stone-500">
                  <div className="flex items-start gap-2">
                    <MapPin size={14} className="mt-0.5 text-stone-400" />
                    <span>{branch.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-stone-400" />
                    <span>{formatPhone(branch.phone)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-stone-400" />
                    <span>{count} инструкторов</span>
                  </div>
                </div>

                <div className="mt-6 border-t border-stone-100 pt-4">
                  <Button variant="secondary" size="sm" className="w-full">
                    Редактировать
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
