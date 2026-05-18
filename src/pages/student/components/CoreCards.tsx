import React from 'react'
import { Cancel01Icon, ListViewIcon, Male02Icon, School01Icon } from '@hugeicons/core-free-icons'
import { Button } from '../../../components/ui/Button'
import { createHugeIcon } from '../../../components/ui/HugeIcon'
import { cn, formatInstructorName } from '../../../lib/utils'
import { getInstructorPhoto } from '../../../services/instructorPhotos'
import { loadLessonDescription } from '../../../services/studentProfile'
import type { Instructor, School, Slot } from '../../../types'
import type { ResolvedStudentBooking } from '../studentTypes'
import { initials, lessonTime, lessonTypeLabel, slotTimeRange } from '../studentUtils'

void React

const X = createHugeIcon(Cancel01Icon)
const Building2 = createHugeIcon(School01Icon)
const ListChecks = createHugeIcon(ListViewIcon)
const Male = createHugeIcon(Male02Icon)

const card = 'rounded-[24px] border border-white/70 bg-[rgba(255,255,255,0.72)] shadow-[var(--shadow-card)] backdrop-blur-2xl'

export function StudentAvatar({ name, src, size = 48, fallback = 'initials' }: { name: string; src?: string; size?: number; fallback?: 'initials' | 'male' }) {
  return (
    <div className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-[rgba(255,255,255,0.72)] text-[15px] font-semibold text-[var(--accent)] shadow-[0_6px_18px_rgba(20,24,32,0.03)]" style={{ width: size, height: size, border: '1px solid var(--border)' }}>
      {src ? <img src={src} alt={name} className="h-full w-full object-cover" style={{ width: '100%', height: '100%', maxWidth: '100%', objectFit: 'cover' }} /> : fallback === 'male' ? <Male size={Math.max(18, Math.round(size * 0.54))} /> : initials(name)}
    </div>
  )
}

export function SchoolLogo({ school }: { school: School }) {
  return (
    <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-[var(--surface)] text-[var(--accent)]" style={{ border: '1px solid var(--border)' }}>
      {school.logoUrl ? <img src={school.logoUrl} alt={school.name} className="h-full w-full object-cover" style={{ width: '100%', height: '100%', maxWidth: '100%', objectFit: 'cover' }} /> : <Building2 size={20} />}
    </div>
  )
}

export function StatusPill({ children, tone = 'green' }: { children: string; tone?: 'green' | 'blue' | 'gray' | 'red' }) {
  const styles = {
    green: 'bg-[var(--green-soft)] text-[var(--green)]',
    blue: 'bg-[var(--blue-soft)] text-[#315A7C]',
    gray: 'bg-[var(--surface-muted)] text-[var(--text-soft)]',
    red: 'bg-[var(--red-soft)] text-[var(--red)]',
  }
  return <span className={cn('inline-flex min-h-7 items-center rounded-[14px] px-3 text-[12px] font-semibold', styles[tone])}>{children}</span>
}

export function BookingLessonCard({ item, onBook, onCancel }: { item: ResolvedStudentBooking | null; onBook: () => void; onCancel?: () => void }) {
  if (!item?.slot) {
    return (
      <section className={cn(card, 'p-4')}>
        <div className="mb-3 h-1 w-12 rounded-full bg-[#7AA8C9]" />
        <h3 className="text-[20px] font-semibold leading-tight text-[var(--text)]">Вы пока не записаны</h3>
        <p className="mt-2 text-[15px] font-medium leading-5 text-[var(--text-muted)]">Выберите свободное окно ниже или откройте расписание</p>
        <Button size="lg" className="mt-4 w-full rounded-[18px] text-[16px]" onClick={onBook}>Записаться</Button>
      </section>
    )
  }

  return (
    <article className={cn(card, 'relative min-w-[300px] p-4')}>
      {onCancel ? (
        <button
          type="button"
          className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-[#FEF2F2] text-[#E5534B] active:scale-[0.94]"
          onClick={(event) => { event.stopPropagation(); onCancel() }}
          aria-label="Отменить занятие"
        >
          <X size={14} strokeWidth={2.2} />
        </button>
      ) : null}
      <div className="flex gap-3 pr-7">
        <div className="w-1 self-stretch rounded-full bg-[#7AA8C9]" />
        <div className="min-w-0 flex-1">
          <p className="text-[21px] font-semibold leading-7 text-[var(--text)]">{lessonTime(item.slot)}</p>
          <p className="mt-1 text-[17px] font-semibold leading-6 text-[var(--text)]">{lessonTypeLabel(item.slot)}</p>
          <div className="mt-3 flex items-center gap-3">
            <StudentAvatar name={item.instructor?.name ?? 'Инструктор'} src={item.instructor ? getInstructorPhoto(item.instructor) : undefined} size={38} fallback="male" />
            <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-[var(--text)]">{item.instructor ? formatInstructorName(item.instructor.name) : 'Инструктор'}</p>
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
        <div className="w-1 self-stretch rounded-full bg-[#7AA8C9]" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[18px] font-semibold leading-6 text-[var(--text)]">{slotTimeRange(slot)}</p>
              <p className="mt-0.5 truncate text-[14px] font-semibold text-[var(--text)]">{lessonTypeLabel(slot)}</p>
            </div>
            <StatusPill>Свободно</StatusPill>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <StudentAvatar name={instructor?.name ?? 'Инструктор'} src={instructor ? getInstructorPhoto(instructor) : undefined} size={34} fallback="male" />
            <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-[var(--text)]">{instructor ? formatInstructorName(instructor.name) : 'Инструктор'}</p>
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
        <h2 className="text-[17px] font-semibold text-[var(--text)]">{title}</h2>
        <p className="mt-2 text-[14px] font-semibold leading-5 text-[var(--text-soft)]">Запишитесь на занятие, и здесь появятся тема, цели и что взять с собой.</p>
      </section>
    )
  }
  return (
    <section className={cn(card, 'p-4')}>
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[17px] bg-[var(--accent-soft)] text-[var(--accent)]"><ListChecks size={21} /></span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[17px] font-semibold text-[var(--text)]">{title}</h2>
          <p className="mt-1 text-[14px] font-semibold leading-5 text-[var(--text-soft)]">{lessonTime(item.slot)} · {item.instructor ? formatInstructorName(item.instructor.name) : 'Инструктор'}</p>
        </div>
      </div>
      <div className="mt-4 rounded-[18px] bg-[var(--surface-soft)] p-3">
        <p className="text-[15px] font-semibold text-[var(--text)]">{description?.theme ?? 'Тему уточнит инструктор'}</p>
        <p className="mt-1 text-[13px] font-semibold leading-5 text-[var(--text-soft)]">{description?.goals?.length ? description.goals.join(' · ') : 'Цели занятия появятся после отметки автошколы.'}</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {(description?.whatToBring?.length ? description.whatToBring : ['Паспорт', 'Удобная обувь']).map((item) => <span key={item} className="rounded-full bg-[var(--accent-soft)] px-3 py-1.5 text-[12px] font-medium text-[var(--accent)]">{item}</span>)}
      </div>
    </section>
  )
}
