import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons'
import { BrandMark } from '../components/layout/BrandMark'
import { createHugeIcon } from '../components/ui/HugeIcon'

void React

const ArrowLeft = createHugeIcon(ArrowLeft01Icon)

const content = {
  terms: {
    title: 'Пользовательское соглашение',
    lead: 'Условия использования кабинета ученика и онлайн-записи на занятия.',
    points: [
      'Сервис помогает ученику хранить контактные данные и записываться на занятия в автошколе.',
      'Пользователь отвечает за корректность имени, телефона и выбранного времени занятия.',
      'Автошкола может связаться с учеником для подтверждения записи или уточнения деталей.',
      'Кабинет хранит данные ученика и открывает доступ к расписанию, профилю и истории записей.',
    ],
  },
  privacy: {
    title: 'Политика конфиденциальности',
    lead: 'Как vroom обрабатывает данные ученика в личном кабинете.',
    points: [
      'Имя, телефон и email используются для записи на занятия и связи с автошколой.',
      'При подключённом Supabase данные ученика синхронизируются только через публичный anon-доступ.',
      'SMS-коды не используются в текущей версии. Вход выполняется по телефону и паролю.',
      'Данные можно удалить из кабинета ученика через выход и очистку локального профиля.',
    ],
  },
} as const

export function LegalPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const page = location.pathname.includes('privacy') ? 'privacy' : 'terms'
  const data = content[page] ?? content.terms

  return (
    <div className="min-h-dvh bg-[var(--page-bg)] text-[var(--text)]">
      <main className="mx-auto w-full max-w-[430px] px-5 py-5">
        <header className="mb-5 flex items-center justify-between">
          <button className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--surface)] px-4 text-[13px] font-extrabold text-[var(--accent)] shadow-[var(--shadow-card)]" onClick={() => navigate(-1)}>
            <ArrowLeft size={15} /> Назад
          </button>
          <BrandMark size="sm" />
        </header>
        <section className="rounded-[30px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
          <BrandMark size="sm" />
          <h1 className="mt-3 text-[30px] font-black leading-[1.05] tracking-[-0.03em] text-[var(--text)]">{data.title}</h1>
          <p className="mt-3 text-[15px] font-semibold leading-6 text-[var(--text-muted)]">{data.lead}</p>
          <div className="mt-5 space-y-3">
            {data.points.map((point) => (
              <p key={point} className="rounded-[18px] bg-[var(--surface-soft)] px-4 py-3 text-[14px] font-semibold leading-5 text-[var(--text)]">
                {point}
              </p>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
