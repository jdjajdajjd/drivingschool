import { Compass, Home, LayoutDashboard } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PublicNav } from '../components/layout/PublicNav'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <PublicNav />

      <main className="px-6 pb-20 pt-28">
        <div className="mx-auto max-w-3xl">
          <Card padding="lg" className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-stone-100 text-stone-500">
              <Compass size={28} />
            </div>
            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-stone-400">404</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">Страница не найдена</h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-stone-500">
              Возможно, ссылка устарела или в демо-режиме эта страница была сброшена вместе с локальными данными.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button onClick={() => navigate('/')}>
                <Home size={16} />
                На главную
              </Button>
              <Button variant="secondary" onClick={() => navigate('/school/virazh')}>
                Открыть демо записи
              </Button>
              <Button variant="ghost" onClick={() => navigate('/admin')}>
                <LayoutDashboard size={16} />
                Открыть админку
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}
