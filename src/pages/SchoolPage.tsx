import type { ReactNode } from 'react'
import React from 'react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft01Icon, Building03Icon, Location01Icon, Mail01Icon, SmartPhone01Icon, User03Icon } from '@hugeicons/core-free-icons'
import { StateView } from '../components/ui/StateView'
import { createHugeIcon } from '../components/ui/HugeIcon'
import { ThemeToggle } from '../components/ui/ThemeProvider'
import { loadPublicSchoolData } from '../services/publicSchoolData'
import type { Branch, Instructor, School } from '../types'

void React

const ArrowLeft = createHugeIcon(ArrowLeft01Icon)
const Building2 = createHugeIcon(Building03Icon)
const Mail = createHugeIcon(Mail01Icon)
const Location = createHugeIcon(Location01Icon)
const Phone = createHugeIcon(SmartPhone01Icon)
const UserRound = createHugeIcon(User03Icon)

const surface = 'bg-[var(--surface)] text-[var(--text)]'
const soft = 'bg-[var(--surface-soft)]'

function pluralizeRu(count: number, one: string, few: string, many: string) {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

export function SchoolPage() {
  const { slug = 'virazh' } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [school, setSchool] = useState<School | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    void loadPublicSchoolData(slug)
      .then((data) => {
        if (!data) return
        setSchool(data.school)
        setBranches(data.branches)
        setInstructors(data.instructors)
      })
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) return <div className="min-h-dvh bg-[var(--page-bg)]" />
  if (!school) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--page-bg)] px-4">
        <StateView
          kind="error"
          title="Автошкола не найдена"
          description="Проверьте ссылку или вернитесь в кабинет."
          action={<button className="btn btn-primary btn-md" onClick={() => navigate('/student')}>Вернуться в кабинет</button>}
        />
      </div>
    )
  }

  const categoryLabel = school.enabledCategoryCodes?.length ? school.enabledCategoryCodes.join(', ') : 'B'

  return (
    <div className="min-h-dvh bg-[var(--page-bg)] text-[var(--text)]">
      <main className="mx-auto w-full max-w-[430px] px-4 pb-8 pt-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <button className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--surface)] px-4 text-[14px] font-semibold text-[var(--accent)] active:scale-[0.98]" onClick={() => navigate('/student')}>
            <ArrowLeft size={17} />
            Вернуться в кабинет
          </button>
          <ThemeToggle compact />
        </div>

        <section className={`rounded-[28px] p-5 ${surface}`}>
          <div className="flex items-start gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-[22px] bg-[var(--accent-soft)] text-[var(--accent)]">
              {school.logoUrl ? <img src={school.logoUrl} alt={school.name} className="h-full w-full object-cover" /> : <Building2 size={28} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">Автошкола</p>
              <h1 className="mt-1 text-[28px] font-bold leading-tight tracking-[-0.03em] text-[var(--text)]">{school.name}</h1>
            </div>
          </div>
          <p className="mt-5 text-[16px] font-medium leading-6 text-[var(--text-muted)]">
            {school.description || 'Информация об автошколе, филиалах и контактах для учеников.'}
          </p>
          <div className="mt-5 grid gap-2">
            <button className="min-h-12 rounded-[18px] bg-[var(--accent)] px-4 text-[15px] font-extrabold text-white active:scale-[0.98]" onClick={() => navigate(`/school/${school.slug}/book`)}>Записаться на занятие</button>
            <div className="grid gap-2 text-[13px] font-semibold leading-5 text-[var(--text-muted)]">
              {school.phone ? <a className="inline-flex items-center gap-2 rounded-[16px] bg-[var(--surface-soft)] px-3 py-2 text-[var(--text)]" href={`tel:${school.phone}`}><Phone size={16} />{school.phone}</a> : null}
              {school.address ? <span className="inline-flex items-center gap-2 rounded-[16px] bg-[var(--surface-soft)] px-3 py-2"><Location size={16} />{school.address}</span> : null}
            </div>
          </div>
        </section>

        <section className="mt-4 grid grid-cols-3 gap-2.5">
          {[
            { value: String(branches.length), label: pluralizeRu(branches.length, 'филиал', 'филиала', 'филиалов') },
            { value: String(instructors.length), label: pluralizeRu(instructors.length, 'инструктор', 'инструктора', 'инструкторов') },
            { value: categoryLabel, label: school.enabledCategoryCodes && school.enabledCategoryCodes.length > 1 ? 'категории' : 'категория' },
          ].map((item) => (
            <div key={item.label} className={`rounded-[20px] p-3 text-center ${surface}`}>
              <p className="text-[20px] font-bold text-[var(--text)]">{item.value}</p>
              <p className="mt-0.5 text-[12px] font-semibold text-[var(--text-soft)]">{item.label}</p>
            </div>
          ))}
        </section>

        <section className={`mt-4 space-y-2.5 rounded-[24px] p-4 ${surface}`}>
          <h2 className="text-[20px] font-bold tracking-[-0.02em] text-[var(--text)]">Контакты</h2>
          {school.address ? <InfoRow icon={<Location size={18} />} label="Адрес" value={school.address} /> : null}
          {school.phone ? <InfoRow icon={<Phone size={18} />} label="Телефон" value={school.phone} /> : null}
          {school.email ? <InfoRow icon={<Mail size={18} />} label="Email" value={school.email} /> : null}
        </section>

        {branches.length > 0 ? (
          <section className={`mt-4 rounded-[24px] p-4 ${surface}`}>
            <h2 className="text-[20px] font-bold tracking-[-0.02em] text-[var(--text)]">Филиалы</h2>
            <div className="mt-3 space-y-3">
              {branches.map((branch) => <InfoRow key={branch.id} icon={<Location size={18} />} label={branch.name} value={branch.address} />)}
            </div>
          </section>
        ) : null}

        {instructors.length > 0 ? (
          <section className={`mt-4 rounded-[24px] p-4 ${surface}`}>
            <h2 className="text-[20px] font-bold tracking-[-0.02em] text-[var(--text)]">Инструкторы</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {instructors.map((instructor) => (
                <div key={instructor.id} className={`flex items-center gap-3 rounded-[18px] p-3 ${soft}`}>
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--surface)] text-[var(--accent)]"><UserRound size={20} /></div>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-bold leading-5 text-[var(--text)]">{instructor.name}</p>
                    <p className="mt-1 truncate text-[12px] font-semibold text-[var(--text-soft)]">{instructor.car ?? 'Учебный автомобиль'}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <button className="mt-4 min-h-12 w-full rounded-[18px] bg-[var(--accent)] px-4 text-[15px] font-extrabold text-white active:scale-[0.98]" onClick={() => navigate(`/school/${school.slug}/book`)}>Записаться на занятие</button>
      </main>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold text-[var(--text-soft)]">{label}</span>
        <span className="mt-0.5 block text-[15px] font-semibold leading-5 text-[var(--text)]">{value}</span>
      </span>
    </div>
  )
}
