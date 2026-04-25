import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Car, School, Users, BarChart3, Puzzle, ArrowRight, RefreshCw } from 'lucide-react'
import { db } from '../services/storage'
import { seedIfNeeded } from '../services/seed'
import { Button } from '../components/ui/Button'
import { formatPrice } from '../lib/utils'
import { getModuleById } from '../services/modules'
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

  function load() {
    const allSchools = db.schools.all()
    const stats: SchoolStats[] = allSchools.map((school) => {
      const instructors = db.instructors.bySchool(school.id)
      const bookings = db.bookings.bySchool(school.id)
      const subModules = db.subModules.bySchool(school.id)
      const activeModules = subModules.map((sm) => sm.moduleId)

      const moduleRevenue = subModules
        .map((sm) => getModuleById(sm.moduleId))
        .filter(Boolean)
        .filter((m) => m!.priceType === 'monthly')
        .reduce((acc, m) => acc + m!.price, 0)

      return {
        school,
        instructorCount: instructors.length,
        bookingCount: bookings.length,
        activeModules,
        monthlyRevenue: 4990 + moduleRevenue,
      }
    })
    setSchools(stats)
  }

  useEffect(() => { load() }, [])

  function resetAndReseed() {
    db.reset()
    seedIfNeeded()
    load()
  }

  const totalRevenue = schools.reduce((acc, s) => acc + s.monthlyRevenue, 0)

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-100 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-forest-800 rounded-lg flex items-center justify-center">
                <Car size={15} className="text-white" />
              </div>
              <span className="font-display text-lg font-medium text-stone-900">DriveDesk</span>
            </button>
            <span className="text-stone-200">/</span>
            <span className="text-sm text-stone-500 font-medium">Суперадмин</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={resetAndReseed}>
              <RefreshCw size={14} />
              Пересоздать данные
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate('/admin')}>
              Демо-админка
              <ArrowRight size={14} />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <h1 className="font-display text-3xl font-medium text-stone-900 mb-1">
            Суперадминистратор
          </h1>
          <p className="text-stone-500 text-sm">Управление всеми автошколами на платформе</p>
        </motion.div>

        {/* Platform stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Школ', value: schools.length, icon: School },
            { label: 'Инструкторов', value: schools.reduce((a, s) => a + s.instructorCount, 0), icon: Users },
            { label: 'Записей', value: schools.reduce((a, s) => a + s.bookingCount, 0), icon: BarChart3 },
            { label: 'MRR', value: formatPrice(totalRevenue), icon: Puzzle },
          ].map(({ label, value, icon: Icon }, idx) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
              className="bg-white rounded-2xl border border-stone-100 shadow-card p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-stone-400 font-medium">{label}</p>
                <div className="w-8 h-8 bg-forest-50 rounded-lg flex items-center justify-center">
                  <Icon size={15} className="text-forest-700" />
                </div>
              </div>
              <p className="font-display text-3xl font-medium text-stone-900">{value}</p>
            </motion.div>
          ))}
        </div>

        {/* Schools table */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="bg-white rounded-2xl border border-stone-100 shadow-card overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-stone-100">
            <h2 className="font-display text-lg font-medium text-stone-900">Автошколы</h2>
          </div>
          <div className="divide-y divide-stone-50">
            {schools.map(({ school, instructorCount, bookingCount, activeModules, monthlyRevenue }) => (
              <div key={school.id} className="px-6 py-5 flex items-center gap-6 hover:bg-stone-50 transition-colors group">
                <div className="w-10 h-10 bg-forest-100 rounded-xl flex items-center justify-center shrink-0">
                  <span className="font-display text-sm font-semibold text-forest-800">
                    {school.name.charAt(school.name.search(/[А-ЯA-Z]/i))}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-stone-900">{school.name}</p>
                  <p className="text-xs text-stone-400">
                    /{school.slug} · {school.email}
                  </p>
                </div>

                <div className="hidden sm:flex items-center gap-6 text-sm text-stone-500">
                  <span>{instructorCount} инстр.</span>
                  <span>{bookingCount} записей</span>
                  <span>{activeModules.length} модулей</span>
                </div>

                <div className="text-right">
                  <p className="font-display text-lg font-medium text-stone-900">
                    {formatPrice(monthlyRevenue)}
                  </p>
                  <p className="text-xs text-stone-400">в месяц</p>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/admin')}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Открыть
                  <ArrowRight size={14} />
                </Button>
              </div>
            ))}

            {schools.length === 0 && (
              <div className="py-12 text-center">
                <School size={28} className="text-stone-200 mx-auto mb-3" />
                <p className="text-stone-400 text-sm">Нет школ на платформе</p>
                <Button variant="secondary" size="sm" className="mt-4" onClick={resetAndReseed}>
                  Создать демо-данные
                </Button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Dev tools */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="mt-6 bg-stone-100 rounded-2xl p-5 border border-stone-200"
        >
          <p className="text-xs font-medium text-stone-500 mb-3 uppercase tracking-wide">
            Инструменты разработки
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={resetAndReseed}>
              <RefreshCw size={13} />
              Сбросить и пересоздать данные
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/school/virazh')}>
              Страница «Вираж»
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/instructor/tok-petrov-2024')}>
              Расписание Петрова
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
