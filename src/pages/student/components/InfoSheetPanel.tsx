import React from 'react'
import { BellDotIcon, BookOpen01Icon, Calendar03Icon, Car04Icon, File02Icon, GraduationScrollIcon, School01Icon, Settings02Icon, User03Icon } from '@hugeicons/core-free-icons'
import { createHugeIcon } from '../../../components/ui/HugeIcon'
import { db } from '../../../services/storage'
import { normalizePhone } from '../../../services/bookingService'
import { loadStudentProgress, type StudentProfile } from '../../../services/studentProfile'
import type { Instructor, School } from '../../../types'
import { cn, formatInstructorName } from '../../../lib/utils'
import type { InfoSheet } from '../studentTypes'
import { formatDateValue, trainingStageLabels } from '../studentUtils'

void React

const Bell = createHugeIcon(BellDotIcon)
const BookOpen = createHugeIcon(BookOpen01Icon)
const Building2 = createHugeIcon(School01Icon)
const CalendarDays = createHugeIcon(Calendar03Icon)
const CarFront = createHugeIcon(Car04Icon)
const FileText = createHugeIcon(File02Icon)
const GraduationCap = createHugeIcon(GraduationScrollIcon)
const Settings = createHugeIcon(Settings02Icon)
const UserRound = createHugeIcon(User03Icon)

const card = 'rounded-[24px] bg-white border border-[#EBECF0]'

function InfoRow({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
  return (
    <div className="flex min-h-[64px] items-center gap-3 border-b border-[#EEF0F2] py-2 last:border-b-0">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[16px] bg-[#F0F1FB] text-[#1F2BD8]"><Icon size={21} /></span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-[#8B8D94]">{label}</p>
        <p className="mt-0.5 truncate text-[17px] font-bold text-[#050609]">{value}</p>
      </div>
    </div>
  )
}

export function InfoSheetPanel({ type, school, profile, progress, student, selectedInstructor, onClose }: { type: InfoSheet; school: School; profile: StudentProfile; progress: ReturnType<typeof loadStudentProgress>; student: ReturnType<typeof db.students.byId> | null; selectedInstructor: Instructor | null; onClose: () => void }) {
  if (!type) return null

  const title = type === 'student' ? 'Инфо ученика' : type === 'profileData' ? 'Данные ученика' : type === 'tips' ? 'Советы' : 'Настройки'

  return (
    <div className="fixed inset-0 z-[80] flex items-end bg-black/30 px-3 pb-3" onClick={onClose}>
      <section className="mx-auto max-h-[76vh] w-full max-w-[430px] overflow-y-auto rounded-[28px] bg-white p-4 shadow-[0_18px_60px_rgba(0,0,0,0.18)]" onClick={(event) => event.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-[#D6D8DD]" />
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-[21px] font-bold tracking-[-0.02em] text-[#050609]">{title}</h2>
          <button className="rounded-full px-3 py-2 text-[14px] font-semibold text-[#8B8D94]" onClick={onClose}>Закрыть</button>
        </div>

        {type === 'student' ? (
          <div className="space-y-4">
            <section className="rounded-[22px] bg-[#D7EBFF] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[16px] font-bold text-[#050609]">Внутренний экзамен</p>
                  <p className="mt-2 text-[24px] font-bold tracking-[-0.03em] text-[#050609]">{formatDateValue(progress?.internalExamDate)}</p>
                  <p className="mt-1 text-[13px] font-semibold text-[#6F747A]">{progress?.internalExamDate ? 'Примерная дата' : 'Назначит автошкола'}</p>
                </div>
                <span className="grid h-16 w-16 place-items-center rounded-full border-[6px] border-[#4A9DFF] bg-white text-center text-[18px] font-bold text-[#050609]">B</span>
              </div>
            </section>
            <section className={cn(card, 'px-4 py-2')}>
              <InfoRow icon={CarFront} label="Категория обучения" value={student?.categoryCodes?.join(', ') || 'B'} />
              <InfoRow icon={GraduationCap} label="Учебная группа" value={student?.groupName || 'Пока не назначено'} />
              <InfoRow icon={BookOpen} label="Этап обучения" value={student?.trainingStage ? trainingStageLabels[student.trainingStage] : 'Пока не назначено'} />
              <InfoRow icon={CalendarDays} label="Начало обучения" value={formatDateValue(student?.trainingStartDate)} />
              <InfoRow icon={CarFront} label="Начало вождения" value={formatDateValue(student?.drivingStartDate)} />
              <InfoRow icon={FileText} label="Окончание обучения" value={formatDateValue(student?.trainingEndDate)} />
              <InfoRow icon={Building2} label="Автошкола" value={school.name} />
            </section>
          </div>
        ) : null}

        {type === 'profileData' ? (
          <section className={cn(card, 'p-4')}>
            <h3 className="text-[18px] font-bold text-[#050609]">Основные данные профиля</h3>
            <p className="mt-2 text-[14px] font-semibold leading-5 text-[#8B8D94]">Эти данные автошкола может использовать для связи, документов и обучения.</p>
            <div className="mt-4 space-y-2 rounded-[18px] bg-[#F5F6FA] p-3 text-[14px] font-semibold text-[#050609]">
              <p>{profile.name}</p>
              <p>+{normalizePhone(profile.phone)}</p>
              <p>{profile.email || 'Email не указан'}</p>
            </div>
          </section>
        ) : null}

        {type === 'tips' ? (
          <section className="space-y-3">
            <article className="rounded-[22px] bg-[#EEF0FA] p-4">
              <h3 className="text-[18px] font-bold text-[#050609]">Планируйте занятия заранее</h3>
              <p className="mt-2 text-[14px] font-semibold leading-5 text-[#6F747A]">Если у инструктора мало свободных окон, лучше выбирать время на неделю вперёд.</p>
            </article>
            <article className="rounded-[22px] bg-[#EAF6F0] p-4">
              <h3 className="text-[18px] font-bold text-[#050609]">Инструктор закреплён</h3>
              <p className="mt-2 text-[14px] font-semibold leading-5 text-[#6F747A]">{selectedInstructor ? formatInstructorName(selectedInstructor.name) : 'Выберите инструктора'} будет первым в расписании на этом устройстве.</p>
            </article>
          </section>
        ) : null}

        {type === 'settings' ? (
          <section className={cn(card, 'px-4 py-2')}>
            <InfoRow icon={UserRound} label="Профиль" value="Локально + синхронизация при сохранении" />
            <InfoRow icon={CalendarDays} label="Расписание" value="Инструктор закрепляется автоматически" />
            <InfoRow icon={Bell} label="Уведомления" value="Пока не подключены" />
            <InfoRow icon={Settings} label="Настройки" value="Базовые параметры кабинета" />
          </section>
        ) : null}
      </section>
    </div>
  )
}
