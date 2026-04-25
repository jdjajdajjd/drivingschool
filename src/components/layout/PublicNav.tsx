import { Link, useNavigate } from 'react-router-dom'
import { Car } from 'lucide-react'
import { Button } from '../ui/Button'

interface PublicNavProps {
  transparent?: boolean
}

export function PublicNav({ transparent = false }: PublicNavProps) {
  const navigate = useNavigate()

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors ${
        transparent ? 'bg-transparent' : 'border-b border-stone-200 bg-white/88 backdrop-blur-xl'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-forest-700 shadow-soft">
            <Car size={16} className="text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-stone-900">DriveDesk</p>
            <p className="text-[11px] text-stone-400">SaaS для автошкол</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          <a href="#problems" className="text-sm text-stone-500 transition hover:text-stone-900">
            Проблемы
          </a>
          <a href="#solution" className="text-sm text-stone-500 transition hover:text-stone-900">
            Решение
          </a>
          <a href="#pricing" className="text-sm text-stone-500 transition hover:text-stone-900">
            Цена
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/school/virazh')}>
            Демо записи
          </Button>
          <Button size="sm" onClick={() => navigate('/admin')}>
            Админка
          </Button>
        </div>
      </div>
    </header>
  )
}
