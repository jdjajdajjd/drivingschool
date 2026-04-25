import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, BarChart3, Car, Puzzle, RefreshCw, School, Users } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { StatCard } from '../components/ui/StatCard'
import { formatPrice } from '../lib/utils'
import { getModuleById } from '../services/modules'
import { seedIfNeeded } from '../services/seed'
import { db } from '../services/storage'
import type { School as SchoolType } from '../types'

interface SchoolStats {
  school: SchoolType
  instructorCount: number
  bookingCount: number
  activeModules: string[]
  monthlyRevenue: number
}

export function SuperAdmin() {
  const navigate = useNavigate()
  const [schools, setSchools] = useState<SchoolStats[]>([])

  function load(): void {
    setSchools(
      db.schools.all().map((school) => {
        const instructors = db.instructors.bySchool(school.id)
        const bookings = db.bookings.bySchool(school.id)
        const subModules = db.subModules.bySchool(school.id)
        const activeModules = subModules.map((subscription) => subscription.moduleId)

        const moduleRevenue = subModules
          .map((subscription) => getModuleById(subscription.moduleId))
          .filter(Boolean)
          .filter((module) => module?.priceType === 'monthly')
          .reduce((sum, module) => sum + (module?.price ?? 0), 0)

        return {
          school,
          instructorCount: instructors.length,
          bookingCount: bookings.length,
          activeModules,
          monthlyRevenue: 4990 + moduleRevenue,
        }
      }),
    )
  }

  useEffect(() => {
    load()
  }, [])

  function resetAndReseed(): void {
    db.reset()
    seedIfNeeded()
    load()
  }

  const totalRevenue = schools.reduce((sum, school) => sum + school.monthlyRevenue, 0)

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/88 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <button onClick={() => navigate('/')} className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-forest-700 shadow-soft">
              <Car size={18} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-stone-900">DriveDesk</span>
          </button>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={resetAndReseed}>
              <RefreshCw size={14} />
              Пересоздать демо-данные
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate('/admin')}>
              Открыть админку
              <ArrowRight size={14} />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <PageHeader
          eyebrow="Superadmin"
          title="Платформа"
          description="Общий обзор по школам, инструкторам, бронированиям и демо-данным."
        />

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Школы" value={schools.length} icon={<School size={18} />} />
          <StatCard label="Инструкторы" value={schools.reduce((sum, school) => sum + school.instructorCount, 0)} icon={<Users size={18} />} />
          <StatCard label="Записи" value={schools.reduce((sum, school) => sum + school.bookingCount, 0)} icon={<BarChart3 size={18} />} />
          <StatCard label="MRR" value={formatPrice(totalRevenue)} icon={<Puzzle size={18} />} />
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="mt-8 overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-soft">
          <div className="hidden grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.9fr_0.9fr] gap-4 border-b border-stone-100 bg-stone-50 px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400 md:grid">
            <span>Школа</span>
            <span>Slug</span>
            <span>Инструкторы</span>
            <span>Записи</span>
            <span>Модули</span>
            <span>Доход</span>
          </div>

          {schools.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<School size={22} />}
                title="Школ пока нет"
                description="Можно заново засидить демо-данные и снова открыть панель."
                action={
                  <Button variant="secondary" onClick={resetAndReseed}>
                    Пересоздать данные
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {schools.map(({ school, instructorCount, bookingCount, activeModules, monthlyRevenue }) => (
                <div key={school.id} className="px-6 py-5">
                  <div className="hidden grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.9fr_0.9fr] items-center gap-4 md:grid">
                    <div>
                      <p className="font-medium text-stone-900">{school.name}</p>
                      <p className="mt-1 text-sm text-stone-500">{school.email}</p>
                    </div>
                    <div className="text-sm text-stone-500">/{school.slug}</div>
                    <div className="text-sm text-stone-500">{instructorCount}</div>
                    <div className="text-sm text-stone-500">{bookingCount}</div>
                    <div className="text-sm text-stone-500">{activeModules.length}</div>
                    <div className="text-sm font-medium text-stone-900">{formatPrice(monthlyRevenue)}</div>
                  </div>

                  <div className="space-y-3 md:hidden">
                    <div>
                      <p className="font-medium text-stone-900">{school.name}</p>
                      <p className="mt-1 text-sm text-stone-500">/{school.slug} · {school.email}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-stone-500">
                      <p>Инструкторы: {instructorCount}</p>
                      <p>Записи: {bookingCount}</p>
                      <p>Модули: {activeModules.length}</p>
                      <p>Доход: {formatPrice(monthlyRevenue)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  )
}
