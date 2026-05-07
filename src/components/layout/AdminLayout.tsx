import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Car03Icon, Menu01Icon } from '@hugeicons/core-free-icons'
import { AdminSidebar } from './AdminSidebar'
import { createHugeIcon } from '../ui/HugeIcon'
import { ADMIN_BASE_PATH } from '../../services/accessControl'
import { setDataNamespace } from '../../services/storage'
import { seedIfNeeded } from '../../services/seed'
import { syncSupabaseSchoolToLocalDb } from '../../services/supabaseSync'

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
    syncSupabaseSchoolToLocalDb('workspace')
      .catch(() => undefined)
      .finally(() => {
        if (!disposed) setReady(true)
      })
    const fallback = window.setTimeout(() => setReady(true), 4000)
    return () => {
      disposed = true
      window.clearTimeout(fallback)
    }
  }, [])

  if (!ready) return <div className="min-h-screen bg-[#F4F5F6]" />

  return (
    <div className="shell">
      <div className="md:hidden">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b rgba(0,0,0,0.06) bg-white/92 px-2.5 py-2 backdrop-blur-xl">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-[#D8E0EC] bg-white text-[#334155]"
            aria-label="Открыть меню"
          >
            <Menu size={18} />
          </button>
          <button onClick={() => navigate(ADMIN_BASE_PATH)} className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[#15120E]">
              <Car size={16} className="text-white" />
            </div>
            <span className="text-sm font-black text-[#15120E]">vroom</span>
          </button>
        </header>
      </div>

      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="min-h-screen md:ml-[300px]">
        <Outlet />
      </main>
    </div>
  )
}
