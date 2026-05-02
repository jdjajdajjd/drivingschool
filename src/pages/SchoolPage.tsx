import type { ReactNode } from 'react'
import React from 'react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Building2, Mail, MapPin, Phone, UserRound } from 'lucide-react'
import { StateView } from '../components/ui/StateView'
import { loadPublicSchoolData } from '../services/publicSchoolData'
import type { Branch, Instructor, School } from '../types'

void React

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

  if (loading) return <div className="min-h-dvh bg-[#F5F6F8]" />
  if (!school) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F5F6F8] px-4">
        <StateView
          kind="error"
          title="Автошкола не найдена"
          description="Проверьте ссылку или вернитесь в кабинет."
          action={<button className="btn btn-primary btn-md" onClick={() => navigate('/student')}>Вернуться в кабинет</button>}
        />
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-[#F5F6F8] text-[#050609]">
      <main className="mx-auto w-full max-w-[430px] px-4 pb-8 pt-5">
        <button className="mb-4 inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-4 text-[14px] font-semibold text-[#1F2BD8] active:scale-[0.98]" onClick={() => navigate('/student')}>
          <ArrowLeft size={17} />
          Вернуться в кабинет
        </button>

        <section className="rounded-[28px] bg-white p-5">
          <div className="flex items-start gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-[22px] bg-[#EEF0FA] text-[#1F2BD8]">
              {school.logoUrl ? <img src={school.logoUrl} alt={school.name} className="h-full w-full object-cover" /> : <Building2 size={28} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[#8B8D94]">Автошкола</p>
              <h1 className="mt-1 text-[28px] font-bold leading-tight tracking-[-0.03em] text-[#050609]">{school.name}</h1>
            </div>
          </div>
          <p className="mt-5 text-[16px] font-medium leading-6 text-[#5F636B]">
            {school.description || 'Информация об автошколе, филиалах и контактах для учеников.'}
          </p>
        </section>

        <section className="mt-4 grid grid-cols-3 gap-2.5">
          {[
            { value: String(branches.length), label: 'филиала' },
            { value: String(instructors.length), label: 'инструктора' },
            { value: 'B', label: 'категория' },
          ].map((item) => (
            <div key={item.label} className="rounded-[20px] bg-white p-3 text-center">
              <p className="text-[20px] font-bold text-[#050609]">{item.value}</p>
              <p className="mt-0.5 text-[12px] font-semibold text-[#8B8D94]">{item.label}</p>
            </div>
          ))}
        </section>

        <section className="mt-4 space-y-2.5 rounded-[24px] bg-white p-4">
          <h2 className="text-[20px] font-bold tracking-[-0.02em] text-[#050609]">Контакты</h2>
          {school.address ? <InfoRow icon={<MapPin size={18} />} label="Адрес" value={school.address} /> : null}
          {school.phone ? <InfoRow icon={<Phone size={18} />} label="Телефон" value={school.phone} /> : null}
          {school.email ? <InfoRow icon={<Mail size={18} />} label="Email" value={school.email} /> : null}
        </section>

        {branches.length > 0 ? (
          <section className="mt-4 rounded-[24px] bg-white p-4">
            <h2 className="text-[20px] font-bold tracking-[-0.02em] text-[#050609]">Филиалы</h2>
            <div className="mt-3 space-y-3">
              {branches.map((branch) => <InfoRow key={branch.id} icon={<MapPin size={18} />} label={branch.name} value={branch.address} />)}
            </div>
          </section>
        ) : null}

        {instructors.length > 0 ? (
          <section className="mt-4 rounded-[24px] bg-white p-4">
            <h2 className="text-[20px] font-bold tracking-[-0.02em] text-[#050609]">Инструкторы</h2>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {instructors.map((instructor) => (
                <div key={instructor.id} className="min-w-[150px] rounded-[18px] bg-[#F7F8FA] p-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#1F2BD8]"><UserRound size={20} /></div>
                  <p className="mt-3 text-[15px] font-bold leading-5 text-[#050609]">{instructor.name}</p>
                  <p className="mt-1 text-[12px] font-semibold text-[#8B8D94]">{instructor.car ?? 'Учебный автомобиль'}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#EEF0FA] text-[#1F2BD8]">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold text-[#8B8D94]">{label}</span>
        <span className="mt-0.5 block text-[15px] font-semibold leading-5 text-[#050609]">{value}</span>
      </span>
    </div>
  )
}
