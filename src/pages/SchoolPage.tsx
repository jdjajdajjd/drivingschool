import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, BuildingOffice as Building, MapPin as Location, Phone, Student as User } from '@phosphor-icons/react'
import { LoadingScreen } from '../components/ui/loader'
import { StateView } from '../components/ui/StateView'
import { findSchoolNamespaceBySlug } from '../services/storage'
import { loadPublicSchoolData, type PublicSchoolData } from '../services/publicSchoolData'
import { ADMIN_BASE_PATH, hasWorkspaceAdminAccessForSchool } from '../services/accessControl'
import type { School } from '../types'

void React


export function SchoolPage() {
  const { slug = 'virazh' } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<PublicSchoolData | null>(null)
  const [loading, setLoading] = useState(true)

  const school = data?.school ?? null
  const categories = school?.enabledCategoryCodes?.length ? school.enabledCategoryCodes : ['B']
  const hasAdminSession = school ? hasWorkspaceAdminAccessForSchool(school.id) : false

  useEffect(() => {
    const isLocalSchool = Boolean(findSchoolNamespaceBySlug(slug))
    setLoading(true)
    void loadPublicSchoolData(slug, { preferLocal: isLocalSchool })
      .then((loaded) => setData(loaded))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) return <LoadingScreen tone="student" />

  if (!school) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--page-bg)] px-4">
        <StateView
          kind="error"
          title="Автошкола не найдена"
          description="Проверьте ссылку в автошколе."
          action={<button className="btn btn-primary btn-md" onClick={() => navigate('/')}>На главную</button>}
        />
      </div>
    )
  }

  return (
    <div className="student-lite min-h-dvh bg-[var(--page-bg)] text-[var(--text)]">
      <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-4 pb-6 pt-4">
        <header className="flex items-center justify-between rounded-[24px] border border-white/55 bg-[rgba(255,255,255,0.7)] px-3 py-3 shadow-[var(--shadow-card)] backdrop-blur-2xl">
          <button className="flex min-w-0 items-center gap-2.5 text-left" onClick={() => navigate('/')}>
            <SchoolLogo school={school} />
            <span className="min-w-0">
              <span className="block max-w-[190px] truncate text-[15px] font-semibold leading-4 text-[var(--text)]">{school.name}</span>
              <span className="block text-[12px] font-medium leading-4 text-[var(--text-muted)]">vroom.today</span>
            </span>
          </button>
          <button
            className="min-h-10 rounded-full border border-white/60 bg-[rgba(255,255,255,0.66)] px-4 text-[13px] font-semibold text-[var(--text)] shadow-[0_6px_20px_rgba(20,24,32,0.04)] backdrop-blur-xl active:scale-[0.97]"
            onClick={() => navigate(hasAdminSession ? ADMIN_BASE_PATH : `/school/${school.slug}/login`)}
          >
            {hasAdminSession ? 'В админку' : 'Войти'}
          </button>
        </header>

        <section className="flex flex-1 flex-col justify-center py-6">
          <article className="rounded-[28px] border border-white/60 bg-[rgba(255,255,255,0.76)] p-5 shadow-[var(--shadow-card)] backdrop-blur-2xl">
            <SchoolLogo school={school} large />
            <p className="mt-5 text-[11px] font-semibold uppercase leading-4 tracking-[0.08em] text-[var(--text-soft)]">автошкола</p>
            <h1 className="mt-1 text-[29px] font-semibold leading-[1.04] text-[var(--text)]">{school.name}</h1>
            {school.description ? (
              <p className="mt-3 max-w-[32ch] text-[15px] font-medium leading-6 text-[var(--text-muted)]">{school.description}</p>
            ) : (
              <p className="mt-3 max-w-[32ch] text-[15px] font-medium leading-6 text-[var(--text-muted)]">Личный кабинет ученика, занятия и документы.</p>
            )}

            <div className="mt-5 grid grid-cols-3 gap-2">
              {categories.slice(0, 3).map((category) => (
                <div key={category} className="rounded-[18px] border border-white/60 bg-[rgba(255,255,255,0.56)] px-3 py-3 backdrop-blur-xl">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-soft)]">категория</p>
                  <p className="mt-1 text-[20px] font-semibold leading-none text-[var(--text)]">{category}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-2.5">
              <button
                className="flex min-h-[60px] w-full items-center gap-3 rounded-full bg-[var(--accent)] px-4 text-left text-white shadow-[var(--shadow-btn)] active:scale-[0.99]"
                onClick={() => navigate(`/school/${school.slug}/login`)}
              >
                <User size={22} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold leading-5">Открыть личный кабинет</span>
                  <span className="mt-0.5 block text-[12px] font-medium text-white/72">расписание и занятия внутри</span>
                </span>
                <ArrowRight size={19} />
              </button>
            </div>
          </article>

          <section className="mt-3 space-y-2">
            {school.phone ? (
              <a href={`tel:${school.phone.replace(/\D/g, '')}`} className="flex min-h-[58px] items-center gap-3 rounded-[22px] border border-white/60 bg-[rgba(255,255,255,0.72)] px-4 text-left shadow-[0_6px_20px_rgba(20,24,32,0.03)] backdrop-blur-xl">
                <Phone className="text-[var(--text)]" size={21} />
                <span className="min-w-0">
                  <span className="block text-[12px] font-medium leading-4 text-[var(--text-muted)]">телефон</span>
                  <span className="block text-[15px] font-semibold leading-5 text-[var(--text)]">{school.phone}</span>
                </span>
              </a>
            ) : null}
            {school.address ? (
              <div className="flex min-h-[58px] items-center gap-3 rounded-[22px] border border-white/60 bg-[rgba(255,255,255,0.72)] px-4 text-left shadow-[0_6px_20px_rgba(20,24,32,0.03)] backdrop-blur-xl">
                <Location className="text-[var(--text)]" size={21} />
                <span className="min-w-0">
                  <span className="block text-[12px] font-medium leading-4 text-[var(--text-muted)]">адрес</span>
                  <span className="block truncate text-[15px] font-semibold leading-5 text-[var(--text)]">{school.address}</span>
                </span>
              </div>
            ) : null}
          </section>
        </section>
      </main>
    </div>
  )
}

function SchoolLogo({ school, large = false }: { school: School; large?: boolean }) {
  const size = large ? 'h-14 w-14 rounded-[18px]' : 'h-11 w-11 rounded-[15px]'

  return (
    <span className={`${size} grid shrink-0 place-items-center overflow-hidden bg-[linear-gradient(180deg,#1A1E23_0%,#101215_100%)] text-white shadow-[0_10px_28px_rgba(17,19,21,0.18)]`}>
      {school.logoUrl ? <img src={school.logoUrl} alt={school.name} className="h-full w-full object-cover" /> : <Building size={large ? 28 : 22} />}
    </span>
  )
}
