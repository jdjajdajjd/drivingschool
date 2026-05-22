import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft } from '@/components/icons/lucide'
import { BrandMark } from '../components/layout/BrandMark'

void React


const content = {
  terms: {
    title: 'Пользовательское соглашение',
    lead: 'Условия использования vroom.today для автошкол, администраторов и учеников.',
    points: [
      'Сервис помогает автошколе вести учеников, расписание, записи, документы, оплаты и операционные статусы.',
      'Автошкола отвечает за законность загрузки данных учеников, корректность расписания, назначение сотрудников и подтверждение оплат.',
      'Ученик отвечает за корректность имени, телефона, email и выбранного времени занятия.',
      'Запись может быть отменена или перенесена по правилам конкретной автошколы, если занятие недоступно, есть долг или не хватает документов.',
      'Тариф 4 990 ₽ в месяц может оплачиваться вручную переводом. Доступ продлевается после подтверждения оплаты оператором сервиса.',
      'vroom.today может ограничить доступ при нарушении правил, попытках обхода прав доступа или загрузке заведомо некорректных данных.',
      'Поддержка и запуск пилота выполняются в ручном режиме: владелец школы получает помощь с импортом учеников, настройкой расписания и проверкой первой записи.',
    ],
  },
  privacy: {
    title: 'Политика конфиденциальности',
    lead: 'Как vroom.today обрабатывает персональные данные в кабинете автошколы и ученика.',
    points: [
      'Обрабатываются данные, которые нужны для обучения и записи: ФИО, телефон, email, категория, филиал, инструктор, расписание, история занятий, документы, статусы оплат и долги.',
      'Цели обработки: создание личного кабинета, запись на занятия, связь автошколы с учеником, учет прогресса, документов и финансовых статусов.',
      'Автошкола является источником и владельцем данных своих учеников. Перед загрузкой реальных данных автошкола должна получить необходимые согласия на обработку персональных данных.',
      'vroom.today выступает техническим сервисом обработки и хранения данных в рамках подключения школы и не продает данные третьим лицам.',
      'Доступ сотрудников ограничивается ролями школы. Данные одной автошколы не должны быть доступны другой автошколе.',
      'Данные могут храниться в Supabase и в локальном браузерном хранилище пользователя для работы кабинета и синхронизации.',
      'По запросу школы данные ученика могут быть выгружены, исправлены или удалены, если это не противоречит обязанностям автошколы по хранению учебных документов.',
      'Перед масштабным запуском с реальными персональными данными автошколе рекомендуется финально проверить документы и процессы с юристом по 152-ФЗ.',
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
