import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Car03Icon, Menu01Icon } from '@hugeicons/core-free-icons'
import { AdminSidebar } from './AdminSidebar'
import { createHugeIcon } from '../ui/HugeIcon'
import { ADMIN_BASE_PATH } from '../../services/accessControl'
import { setDataNamespace } from '../../services/storage'
import { seedIfNeeded } from '../../services/seed'

const Menu = createHugeIcon(Menu01Icon)
const Car = createHugeIcon(Car03Icon)

export function AdminLayout() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let disposed = false
    setDataNamespace('workspace')
    seedIfNeeded({ mode: 'workspace' })
    if (!disposed) setReady(true)
    const fallback = window.setTimeout(() => setReady(true), 500)
    return () => {
      disposed = true
      window.clearTimeout(fallback)
    }
  }, [])

  if (!ready) return <div className="min-h-screen bg-[#F4F5F6]" />

  return (
    <div className="shell">
      <div className="md:hidden">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b rgba(0,0,0,0.06) bg-white/92 px-4 py-3 backdrop-blur-xl">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border rgba(0,0,0,0.06) bg-white #6F747A shadow-[0_20px_60px_rgba(15,20,25,0.08)]"
            aria-label="Открыть меню"
          >
            <Menu size={18} />
          </button>
          <button onClick={() => navigate(ADMIN_BASE_PATH)} className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-accent shadow-[0_20px_60px_rgba(15,20,25,0.08)]">
              <Car size={16} className="text-white" />
            </div>
            <span className="text-sm font-bold #111418">vroom</span>
          </button>
        </header>
      </div>

      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="min-h-screen md:ml-[280px]">
        <Outlet />
      </main>
    </div>
  )
}
