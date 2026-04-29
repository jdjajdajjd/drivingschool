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
        transparent ? 'bg-transparent' : 'border-b border-product-border bg-white/95 backdrop-blur-xl'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-product-primary shadow-soft">
            <Car size={18} className="text-white" />
          </div>
          <span className="text-base font-semibold text-product-main">DriveDesk</span>
        </Link>

        <Button
          size="md"
          onClick={() => navigate('/school/virazh')}
          className="px-6 py-2.5 text-base font-semibold"
        >
          Записаться
        </Button>
      </div>
    </header>
  )
}
