import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Phone, Users, Building2 } from 'lucide-react'
import { db } from '../../services/storage'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { formatPhone } from '../../lib/utils'
import type { Branch, Instructor } from '../../types'

export function AdminBranches() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [instructorCounts, setInstructorCounts] = useState<Map<string, number>>(new Map())

  useEffect(() => {
    const school = db.schools.bySlug('virazh')
    if (!school) return
    setBranches(db.branches.bySchool(school.id))

    const instructors: Instructor[] = db.instructors.bySchool(school.id)
    const counts = new Map<string, number>()
    instructors.forEach((i) => counts.set(i.branchId, (counts.get(i.branchId) ?? 0) + 1))
    setInstructorCounts(counts)
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
          <h1 className="font-display text-3xl font-medium text-stone-900">Филиалы</h1>
        </div>
        <Button>
          <Building2 size={16} />
          Добавить
        </Button>
      </motion.div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.map((branch, idx) => {
          const count = instructorCounts.get(branch.id) ?? 0
          return (
            <motion.div
              key={branch.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
              className="bg-white rounded-2xl border border-stone-100 shadow-card p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-forest-50 rounded-xl flex items-center justify-center">
                  <Building2 size={18} className="text-forest-700" />
                </div>
                <Badge variant={branch.isActive ? 'success' : 'default'} size="sm">
                  {branch.isActive ? 'Активен' : 'Закрыт'}
                </Badge>
              </div>

              <h3 className="font-display text-lg font-medium text-stone-900 mb-3">
                {branch.name}
              </h3>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-stone-500">
                  <MapPin size={13} className="text-stone-400 shrink-0" />
                  {branch.address}
                </div>
                <div className="flex items-center gap-2 text-sm text-stone-500">
                  <Phone size={13} className="text-stone-400 shrink-0" />
                  {formatPhone(branch.phone)}
                </div>
                <div className="flex items-center gap-2 text-sm text-stone-500">
                  <Users size={13} className="text-stone-400 shrink-0" />
                  {count} инструктор{count === 1 ? '' : count < 5 ? 'а' : 'ов'}
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-stone-100">
                <Button variant="secondary" size="sm" className="flex-1">
                  Редактировать
                </Button>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
