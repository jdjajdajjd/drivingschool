import React from 'react'
import { BellRinging as Bell, BookOpenText as BookOpen, Buildings as Building2, CalendarCheck as CalendarDays, CarProfile as CarFront, FileText, GraduationCap, Certificate as License, GearSix as Settings, Note as StickyNote, Student as UserRound } from '@phosphor-icons/react'
import { db } from '../../../services/storage'
import { normalizePhone } from '../../../services/bookingService'
import { loadStudentProgress, type StudentProfile } from '../../../services/studentProfile'
import type { Instructor, School } from '../../../types'
import { cn, formatInstructorName } from '../../../lib/utils'
import type { InfoSheet } from '../studentTypes'
import { formatDateValue, trainingStageLabels } from '../studentUtils'

void React


const card = 'rounded-[24px] border border-[var(--border)] bg-[var(--surface)]'

function InfoRow({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
  return (
    <div className="flex min-h-[64px] items-center gap-3 border-b border-[var(--border)] py-2 last:border-b-0">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[16px] bg-[var(--accent-soft)] text-[var(--accent)]"><Icon size={21} /></span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-[var(--text-soft)]">{label}</p>
        <p className="mt-0.5 truncate text-[17px] font-bold text-[var(--text)]">{value}</p>
      </div>
    </div>
  )
}

export function InfoSheetPanel({ type, school, profile, progress, student, selectedInstructor, onClose }: { type: InfoSheet; school: School; profile: StudentProfile; progress: ReturnType<typeof loadStudentProgress>; student: ReturnType<typeof db.students.byId> | null; selectedInstructor: Instructor | null; onClose: () => void }) {
  if (!type) return null

  const theorySheet = type === 'theoryTickets' || type === 'theoryMistakes' || type === 'theoryRules' || type === 'theoryExam'
  const title = type === 'student' ? 'Инфо ученика' : type === 'profileData' ? 'Данные ученика' : type === 'tips' ? 'Советы' : theorySheet ? 'Теория' : 'Настройки'

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 px-3 py-5" onClick={onClose}>
      <section className="mx-auto max-h-[82vh] w-full max-w-[430px] overflow-y-auto rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)]" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-[21px] font-bold tracking-[-0.02em] text-[var(--text)]">{title}</h2>
          <button className="rounded-full px-3 py-2 text-[14px] font-semibold text-[var(--text-soft)]" onClick={onClose}>Закрыть</button>
        </div>

        {type === 'student' ? (
          <div className="space-y-4">
            <section className="rounded-[22px] bg-[var(--blue-soft)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[16px] font-bold text-[var(--text)]">Внутренний экзамен</p>
                  <p className="mt-2 text-[24px] font-bold tracking-[-0.03em] text-[var(--text)]">{formatDateValue(progress?.internalExamDate)}</p>
                  <p className="mt-1 text-[13px] font-semibold text-[var(--text-muted)]">{progress?.internalExamDate ? 'Примерная дата' : 'Назначит автошкола'}</p>
                </div>
                <span className="grid h-16 w-16 place-items-center rounded-full border-[6px] border-[#4A9DFF] bg-[var(--surface)] text-center text-[18px] font-bold text-[var(--text)]">B</span>
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
            <h3 className="text-[18px] font-bold text-[var(--text)]">Основные данные профиля</h3>
            <p className="mt-2 text-[14px] font-semibold leading-5 text-[var(--text-soft)]">Эти данные автошкола может использовать для связи, документов и обучения.</p>
            <div className="mt-4 space-y-2 rounded-[18px] bg-[var(--surface-soft)] p-3 text-[14px] font-semibold text-[var(--text)]">
              <p>{profile.name}</p>
              <p>+{normalizePhone(profile.phone)}</p>
              <p>{profile.email || 'Email не указан'}</p>
            </div>
          </section>
        ) : null}

        {type === 'tips' ? (
          <section className="space-y-3">
            <article className="rounded-[22px] bg-[var(--accent-soft)] p-4">
              <h3 className="text-[18px] font-bold text-[var(--text)]">Планируйте занятия заранее</h3>
              <p className="mt-2 text-[14px] font-semibold leading-5 text-[var(--text-muted)]">Если у инструктора мало свободных окон, лучше выбирать время на неделю вперёд.</p>
            </article>
            <article className="rounded-[22px] bg-[var(--green-soft)] p-4">
              <h3 className="text-[18px] font-bold text-[var(--text)]">Инструктор закреплён</h3>
              <p className="mt-2 text-[14px] font-semibold leading-5 text-[var(--text-muted)]">{selectedInstructor ? formatInstructorName(selectedInstructor.name) : 'Выберите инструктора'} будет первым в расписании на этом устройстве.</p>
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

        {theorySheet ? (
          <section className="space-y-3">
            {type === 'theoryTickets' ? (
              <article className={cn(card, 'p-4')}>
                <div className="flex items-start gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[18px] bg-[var(--accent-soft)] text-[var(--accent)]"><StickyNote size={23} /></span>
                  <div>
                    <h3 className="text-[18px] font-bold text-[var(--text)]">Быстрая тренировка</h3>
                    <p className="mt-1 text-[14px] font-semibold leading-5 text-[var(--text-soft)]">10 вопросов по текущим темам. Результат можно показать преподавателю на занятии.</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {['ПДД', 'Знаки', 'Манёвры'].map((item) => <span key={item} className="rounded-[16px] bg-[var(--surface-soft)] px-2 py-3 text-[13px] font-bold text-[var(--text)]">{item}</span>)}
                </div>
              </article>
            ) : null}

            {type === 'theoryMistakes' ? (
              <article className={cn(card, 'p-4')}>
                <div className="flex items-start gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[18px] bg-[var(--red-soft)] text-[var(--accent)]"><BookOpen size={23} /></span>
                  <div>
                    <h3 className="text-[18px] font-bold text-[var(--text)]">Работа над ошибками</h3>
                    <p className="mt-1 text-[14px] font-semibold leading-5 text-[var(--text-soft)]">Здесь собираются вопросы, которые ученик чаще всего пропускает. Пока ошибок нет, блок предлагает повторить сложные темы.</p>
                  </div>
                </div>
              </article>
            ) : null}

            {type === 'theoryRules' ? (
              <article className={cn(card, 'p-4')}>
                <h3 className="text-[18px] font-bold text-[var(--text)]">Темы курса</h3>
                <div className="mt-3 space-y-2">
                  {['Общие положения', 'Дорожные знаки', 'Проезд перекрёстков', 'Остановка и стоянка', 'Безопасность движения'].map((item) => <div key={item} className="rounded-[16px] bg-[var(--surface-soft)] px-3 py-3 text-[14px] font-bold text-[var(--text)]">{item}</div>)}
                </div>
              </article>
            ) : null}

            {type === 'theoryExam' ? (
              <article className={cn(card, 'p-4')}>
                <div className="flex items-start gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[18px] bg-[var(--surface-muted)] text-[var(--accent)]"><License size={23} /></span>
                  <div>
                    <h3 className="text-[18px] font-bold text-[var(--text)]">Зачёты и экзамены</h3>
                    <p className="mt-1 text-[14px] font-semibold leading-5 text-[var(--text-soft)]">Автошкола отметит внутренний зачёт в карточке ученика. Ученик видит дату и статус без лишних процентов готовности.</p>
                  </div>
                </div>
              </article>
            ) : null}
          </section>
        ) : null}
      </section>
    </div>
  )
}
