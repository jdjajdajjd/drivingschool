import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight01Icon, Building05Icon, User03Icon } from '@hugeicons/core-free-icons'
import { BrandMark } from '../components/layout/BrandMark'
import { createHugeIcon } from '../components/ui/HugeIcon'
import { setDataNamespace } from '../services/storage'

void React

const ArrowRight = createHugeIcon(ArrowRight01Icon)
const Building = createHugeIcon(Building05Icon)
const User = createHugeIcon(User03Icon)

export function LandingPage() {
  const navigate = useNavigate()

  function openSchoolCabinet() {
    setDataNamespace('workspace')
    navigate('/workspace-admin')
  }

  return (
    <div className="min-h-dvh bg-[#F6F7FA] text-[#050609]">
      <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-4 pb-6 pt-4">
        <header className="flex items-center justify-between rounded-[24px] border border-[#EBECF0] bg-white px-3 py-3 shadow-[0_12px_34px_rgba(15,20,25,0.06)]">
          <button className="flex min-w-0 items-center gap-2.5 text-left" onClick={() => navigate('/')}>
            <BrandMark size="md" alt="vroom" />
            <span className="min-w-0">
              <span className="block text-[17px] font-black leading-5 tracking-[-0.02em] text-[#050609]">vroom</span>
              <span className="block truncate text-[12px] font-bold leading-4 text-[#8B8D94]">кабинет ученика и школы</span>
            </span>
          </button>
          <button
            className="min-h-10 rounded-[14px] bg-[#EEF0FA] px-3 text-[13px] font-extrabold text-[#1F2BD8] active:scale-[0.97]"
            onClick={() => navigate('/school/virazh/login')}
          >
            Войти
          </button>
        </header>

        <section className="pb-6 pt-12 sm:pt-20">
          <div className="rounded-[28px] border border-[#EBECF0] bg-white p-5 shadow-[0_18px_48px_rgba(15,20,25,0.07)]">
            <div className="grid h-14 w-14 place-items-center rounded-[20px] bg-[#EEF0FA] text-[#1F2BD8]">
              <User size={26} />
            </div>
            <h1 className="mt-5 text-[38px] font-black leading-[0.98] tracking-[-0.04em] text-[#050609]">
              vroom
            </h1>
            <p className="mt-3 max-w-[320px] text-[15px] font-semibold leading-6 text-[#8B8D94]">
              Личный кабинет ученика и рабочий кабинет автошколы в одном месте.
            </p>

            <div className="mt-6 grid gap-3">
              <button
                className="flex min-h-[78px] w-full items-center gap-3 rounded-[22px] bg-[#1F2BD8] p-4 text-left text-white shadow-[0_16px_34px_rgba(31,43,216,0.20)] active:scale-[0.99]"
                onClick={() => navigate('/school/virazh/login')}
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[16px] bg-white/16">
                  <User size={22} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[17px] font-black leading-5">Я ученик</span>
                  <span className="mt-1 block text-[13px] font-semibold leading-4 text-white/78">занятия, документы, расписание</span>
                </span>
                <ArrowRight size={20} />
              </button>

              <button
                className="flex min-h-[78px] w-full items-center gap-3 rounded-[22px] border border-[#EBECF0] bg-white p-4 text-left active:scale-[0.99]"
                onClick={openSchoolCabinet}
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[16px] bg-[#F5F6FA] text-[#1F2BD8]">
                  <Building size={22} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[17px] font-black leading-5 text-[#050609]">Я школа</span>
                  <span className="mt-1 block text-[13px] font-semibold leading-4 text-[#8B8D94]">день, ученики, оплаты</span>
                </span>
                <ArrowRight className="text-[#B8BABF]" size={20} />
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
