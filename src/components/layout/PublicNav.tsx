import { Link, useNavigate } from 'react-router-dom'
import { BrandMark } from './BrandMark'
import { Button } from '../ui/Button'
import { DEMO_SCHOOL_PATH } from '../../services/schoolRoutes'

interface PublicNavProps {
  transparent?: boolean
}

export function PublicNav({ transparent = false }: PublicNavProps) {
  const navigate = useNavigate()

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors ${
        transparent ? 'bg-transparent' : 'border-b rgba(0,0,0,0.06) bg-white/95 backdrop-blur-xl'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center">
          <BrandMark variant={transparent ? 'light' : 'dark'} size="md" />
        </Link>

        <Button
          size="md"
          onClick={() => navigate(DEMO_SCHOOL_PATH)}
          className="px-6 py-2.5 text-base font-semibold"
        >
          Записаться
        </Button>
      </div>
    </header>
  )
}
