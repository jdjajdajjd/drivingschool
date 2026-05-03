import React from 'react'
import { ListViewIcon, School01Icon } from '@hugeicons/core-free-icons'
import { Button } from '../../../components/ui/Button'
import { createHugeIcon } from '../../../components/ui/HugeIcon'
import { cn, formatInstructorName } from '../../../lib/utils'
import { getInstructorPhoto } from '../../../services/instructorPhotos'
import { loadLessonDescription } from '../../../services/studentProfile'
import type { Instructor, School, Slot } from '../../../types'
import type { ResolvedStudentBooking } from '../studentTypes'
import { initials, lessonTime, lessonTypeLabel, slotTimeRange } from '../studentUtils'

void React

const Building2 = createHugeIcon(School01Icon)
const ListChecks = createHugeIcon(ListViewIcon)

const card = 'rounded-[24px] bg-white border border-[#EBECF0]'

export function StudentAvatar({ name, src, size = 48 }: { name: string; src?: string; size?: number }) {
  return (
    <div className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-white text-[15px] font-bold text-[#1F2BD8]" style={{ width: size, height: size, border: '1px solid #E4E6EC' }}>
      {src ? <img src={src} alt={name} className="h-full w-full object-cover" style={{ width: '100%', height: '100%', maxWidth: '100%', objectFit: 'cover' }} /> : initials(name)}
    </div>
  )
}

export function SchoolLogo({ school }: { school: School }) {
  return (
    <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-white text-[#1F2BD8]" style={{ border: '1px solid #E4E6EC' }}>
      {school.logoUrl ? <img src={school.logoUrl} alt={school.name} className="h-full w-full object-cover" style={{ width: '100%', height: '100%', maxWidth: '100%', objectFit: 'cover' }} /> : <Building2 size={20} />}
    </div>
  )
}

export function StatusPill({ children, tone = 'green' }: { children: string; tone?: 'green' | 'blue' | 'gray' | 'red' }) {
  const styles = {
    green: 'bg-[#EEF9F2] text-[#14934A]',
    blue: 'bg-[#EEF0FA] text-[#1F2BD8]',
    gray: 'bg-[#F1F2F5] text-[#8B8D94]',
    red: 'bg-[#FFEDEF] text-[#FF3155]',
  }
  return <span className={cn('inline-flex min-h-7 items-center rounded-[14px] px-3 text-[12px] font-semibold', styles[tone])}>{children}</span>
}

export function BookingLessonCard({ item, onBook }: { item: ResolvedStudentBooking | null; onBook: () => void }) {
  if (!item?.slot) {
    return (
      <section className={cn(card, 'p-4')}>
        <div className="mb-3 h-1 w-12 rounded-full bg-[#35C45A]" />
        <h3 className="text-[22px] font-bold leading-tight tracking-[-0.02em] text-[#050609]">Вы пока не записаны</h3>
        <p className="mt-2 text-[15px] font-medium leading-5 text-[#8B8D94]">Выберите свободное окно ниже или откройте расписание</p>
        <Button size="lg" className="mt-4 w-full rounded-[18px] text-[16px]" onClick={onBook}>Записаться</Button>
      </section>
    )
  }

  return (
    <article className={cn(card, 'min-w-[300px] p-4')}>
      <div className="flex gap-3">
        <div className="w-1 self-stretch rounded-full bg-[#35C45A]" />
        <div className="min-w-0 flex-1">
          <p className="text-[22px] font-bold leading-7 tracking-[-0.02em] text-[#050609]">{lessonTime(item.slot)}</p>
          <p className="mt-1 text-[17px] font-semibold leading-6 text-[#050609]">{lessonTypeLabel(item.slot)}</p>
          <div className="mt-3 flex items-center gap-3">
            <StudentAvatar name={item.instructor?.name ?? 'Инструктор'} src={item.instructor ? getInstructorPhoto(item.instructor) : undefined} size={38} />
            <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-[#050609]">{item.instructor ? formatInstructorName(item.instructor.name) : 'Инструктор'}</p>
          </div>
        </div>
      </div>
    </article>
  )
}

export function AvailableSlotCard({ slot, instructor, onBook, compact = false }: { slot: Slot; instructor: Instructor | null; onBook: () => void; compact?: boolean }) {
  return (
    <article className={cn(card, compact ? 'min-w-[260px] p-3' : 'p-3.5')}>
      <div className="flex gap-3">
        <div className="w-1 self-stretch rounded-full bg-[#35C45A]" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[19px] font-bold leading-6 tracking-[-0.02em] text-[#050609]">{slotTimeRange(slot)}</p>
              <p className="mt-0.5 truncate text-[14px] font-semibold text-[#050609]">{lessonTypeLabel(slot)}</p>
            </div>
            <StatusPill>Свободно</StatusPill>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <StudentAvatar name={instructor?.name ?? 'Инструктор'} src={instructor ? getInstructorPhoto(instructor) : undefined} size={34} />
            <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-[#050609]">{instructor ? formatInstructorName(instructor.name) : 'Инструктор'}</p>
            <Button size="sm" className="rounded-full px-3 text-[13px]" onClick={onBook}>Записаться</Button>
          </div>
        </div>
      </div>
    </article>
  )
}

export function LessonDetailsCard({ title, item }: { title: string; item: ResolvedStudentBooking | null }) {
  const description = item?.slot ? loadLessonDescription(item.slot.id) : null
  if (!item?.slot) {
    return (
      <section className={cn(card, 'p-4')}>
        <h2 className="text-[18px] font-bold tracking-[-0.02em] text-[#050609]">{title}</h2>
        <p className="mt-2 text-[14px] font-semibold leading-5 text-[#8B8D94]">Запишитесь на занятие, и здесь появятся тема, цели и что взять с собой.</p>
      </section>
    )
  }
  return (
    <section className={cn(card, 'p-4')}>
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[17px] bg-[#EEF0FA] text-[#1F2BD8]"><ListChecks size={21} /></span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[18px] font-bold tracking-[-0.02em] text-[#050609]">{title}</h2>
          <p className="mt-1 text-[14px] font-semibold leading-5 text-[#8B8D94]">{lessonTime(item.slot)} · {item.instructor ? formatInstructorName(item.instructor.name) : 'Инструктор'}</p>
        </div>
      </div>
      <div className="mt-4 rounded-[18px] bg-[#F7F8FA] p-3">
        <p className="text-[15px] font-bold text-[#050609]">{description?.theme ?? 'Тему уточнит инструктор'}</p>
        <p className="mt-1 text-[13px] font-semibold leading-5 text-[#8B8D94]">{description?.goals?.length ? description.goals.join(' · ') : 'Цели занятия появятся после отметки автошколы.'}</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {(description?.whatToBring?.length ? description.whatToBring : ['Паспорт', 'Удобная обувь']).map((item) => <span key={item} className="rounded-full bg-[#EEF0FA] px-3 py-1.5 text-[12px] font-bold text-[#1F2BD8]">{item}</span>)}
      </div>
    </section>
  )
}
