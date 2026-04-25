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
      className={`fixed top-0 left-0 right-0 z-40 transition-colors duration-300 ${
        transparent ? 'bg-transparent' : 'bg-white/90 backdrop-blur-md border-b border-stone-100'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-forest-800 rounded-lg flex items-center justify-center">
            <Car size={15} className="text-white" />
          </div>
          <span className="font-sans text-lg font-medium text-stone-900">DriveDesk</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-stone-600 hover:text-stone-900 transition-colors">
            Возможности
          </a>
          <a href="#modules" className="text-sm text-stone-600 hover:text-stone-900 transition-colors">
            Модули
          </a>
          <a href="#pricing" className="text-sm text-stone-600 hover:text-stone-900 transition-colors">
            Цены
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
            Войти
          </Button>
          <Button size="sm" onClick={() => navigate('/admin')}>
            Попробовать бесплатно
          </Button>
        </div>
      </div>
    </header>
  )
}
