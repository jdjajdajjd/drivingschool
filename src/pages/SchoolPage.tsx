import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight01Icon, Building05Icon, Location01Icon, SmartPhone01Icon, User03Icon } from '@hugeicons/core-free-icons'
import { createHugeIcon } from '../components/ui/HugeIcon'
import { StateView } from '../components/ui/StateView'
import { findSchoolNamespaceBySlug } from '../services/storage'
import { loadPublicSchoolData, type PublicSchoolData } from '../services/publicSchoolData'
import type { School } from '../types'

void React

const ArrowRight = createHugeIcon(ArrowRight01Icon)
const Building = createHugeIcon(Building05Icon)
const Location = createHugeIcon(Location01Icon)
const Phone = createHugeIcon(SmartPhone01Icon)
const User = createHugeIcon(User03Icon)

export function SchoolPage() {
  const { slug = 'virazh' } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<PublicSchoolData | null>(null)
  const [loading, setLoading] = useState(true)

  const school = data?.school ?? null
  const categories = school?.enabledCategoryCodes?.length ? school.enabledCategoryCodes : ['B']

  useEffect(() => {
    const isLocalSchool = Boolean(findSchoolNamespaceBySlug(slug)) || slug === 'virazh' || slug === 'workspace'
    setLoading(true)
    void loadPublicSchoolData(slug, { preferLocal: isLocalSchool })
      .then((loaded) => setData(loaded))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) return <div className="min-h-dvh bg-[#F6F7FA]" />

  if (!school) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F6F7FA] px-4">
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
    <div className="min-h-dvh bg-[#F6F7FA] text-[#050609]">
      <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-4 pb-6 pt-4">
        <header className="flex items-center justify-between rounded-[24px] border border-[#EBECF0] bg-white px-3 py-3 shadow-[0_12px_34px_rgba(15,20,25,0.06)]">
          <button className="flex min-w-0 items-center gap-2.5 text-left" onClick={() => navigate('/')}>
            <SchoolLogo school={school} />
            <span className="min-w-0">
              <span className="block max-w-[190px] truncate text-[15px] font-black leading-4 text-[#050609]">{school.name}</span>
              <span className="block text-[12px] font-bold leading-4 text-[#8B8D94]">vroom.today</span>
            </span>
          </button>
          <button
            className="min-h-10 rounded-[14px] bg-[#EEF0FA] px-3 text-[13px] font-extrabold text-[#1F2BD8] active:scale-[0.97]"
            onClick={() => navigate(`/school/${school.slug}/login`)}
          >
            Войти
          </button>
        </header>

        <section className="flex flex-1 flex-col justify-center py-6">
          <article className="rounded-[28px] border border-[#EBECF0] bg-white p-5 shadow-[0_18px_48px_rgba(15,20,25,0.07)]">
            <SchoolLogo school={school} large />
            <p className="mt-5 text-[12px] font-extrabold uppercase leading-4 text-[#B8BABF]">автошкола</p>
            <h1 className="mt-1 text-[32px] font-black leading-[1.02] tracking-[-0.04em] text-[#050609]">{school.name}</h1>
            {school.description ? (
              <p className="mt-3 text-[15px] font-semibold leading-6 text-[#8B8D94]">{school.description}</p>
            ) : (
              <p className="mt-3 text-[15px] font-semibold leading-6 text-[#8B8D94]">Личный кабинет ученика, занятия и документы.</p>
            )}

            <div className="mt-5 grid grid-cols-3 gap-2">
              {categories.slice(0, 3).map((category) => (
                <div key={category} className="rounded-[18px] bg-[#F5F6FA] px-3 py-3">
                  <p className="text-[11px] font-bold uppercase text-[#8B8D94]">категория</p>
                  <p className="mt-1 text-[22px] font-black leading-none text-[#050609]">{category}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-2.5">
              <button
                className="flex min-h-[62px] w-full items-center gap-3 rounded-[20px] bg-[#1F2BD8] px-4 text-left text-white shadow-[0_14px_30px_rgba(31,43,216,0.20)] active:scale-[0.99]"
                onClick={() => navigate(`/school/${school.slug}/login`)}
              >
                <User size={22} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-black leading-5">Открыть личный кабинет</span>
                  <span className="mt-0.5 block text-[12px] font-semibold text-white/76">расписание и занятия внутри</span>
                </span>
                <ArrowRight size={19} />
              </button>
              <button
                className="flex min-h-[54px] w-full items-center justify-center rounded-[18px] bg-[#EEF0FA] px-4 text-[14px] font-extrabold text-[#1F2BD8] active:scale-[0.99]"
                onClick={() => navigate(`/school/${school.slug}/register`)}
              >
                Создать доступ
              </button>
            </div>
          </article>

          <section className="mt-3 space-y-2">
            {school.phone ? (
              <a href={`tel:${school.phone.replace(/\D/g, '')}`} className="flex min-h-[58px] items-center gap-3 rounded-[22px] border border-[#EBECF0] bg-white px-4 text-left">
                <Phone className="text-[#1F2BD8]" size={21} />
                <span className="min-w-0">
                  <span className="block text-[13px] font-bold leading-4 text-[#8B8D94]">телефон</span>
                  <span className="block text-[15px] font-black leading-5 text-[#050609]">{school.phone}</span>
                </span>
              </a>
            ) : null}
            {school.address ? (
              <div className="flex min-h-[58px] items-center gap-3 rounded-[22px] border border-[#EBECF0] bg-white px-4 text-left">
                <Location className="text-[#1F2BD8]" size={21} />
                <span className="min-w-0">
                  <span className="block text-[13px] font-bold leading-4 text-[#8B8D94]">адрес</span>
                  <span className="block truncate text-[15px] font-black leading-5 text-[#050609]">{school.address}</span>
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
  const size = large ? 'h-16 w-16 rounded-[20px]' : 'h-11 w-11 rounded-[15px]'

  return (
    <span className={`${size} grid shrink-0 place-items-center overflow-hidden bg-[#050609] text-white`}>
      {school.logoUrl ? <img src={school.logoUrl} alt={school.name} className="h-full w-full object-cover" /> : <Building size={large ? 28 : 22} />}
    </span>
  )
}
