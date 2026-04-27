import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Menu, Car } from 'lucide-react'
import { AdminSidebar } from './AdminSidebar'
import { ADMIN_BASE_PATH } from '../../services/accessControl'

export function AdminLayout() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="md:hidden">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-stone-200 bg-white/90 px-4 py-3 backdrop-blur-xl">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-stone-200 bg-white text-stone-700"
          >
            <Menu size={18} />
          </button>
          <button onClick={() => navigate(ADMIN_BASE_PATH)} className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-forest-700 shadow-soft">
              <Car size={16} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-stone-900">DriveDesk</span>
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
