import { ExternalLink, Link2, Plus, Power } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { StateView } from '../../components/ui/StateView'
import { DataRow } from '../../components/ui/DataList'
import { FormField } from '../../components/ui/FormField'
import { Input, Textarea } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/ui/PageHeader'
import { Section } from '../../components/ui/Section'
import { useToast } from '../../components/ui/Toast'
import { formatPhone } from '../../lib/utils'
import { getUpcomingBookings, validateRussianPhone } from '../../services/bookingService'
import { DRIVING_CATEGORIES } from '../../services/drivingCategories'
import { createInstructor, getInstructorsBySchool, toggleInstructorActive, updateInstructor } from '../../services/instructorService'
import { getInstructorPhoto } from '../../services/instructorPhotos'
import { db } from '../../services/storage'
import { getAvailableSlots } from '../../services/slotService'
import type { Instructor, Transmission } from '../../types'

const initialForm = {
  branchId: '',
  name: '',
  phone: '',
  email: '',
  bio: '',
  car: '',
  transmission: 'manual' as Transmission,
  categories: ['B'],
  isActive: true,
}

function selectClassName() {
  return 'h-11 w-full rounded-2xl border border-stone-200 bg-white px-3.5 text-[15px] text-stone-900 outline-none transition focus:border-forest-300 focus:ring-4 focus:ring-forest-100'
}

export function AdminInstructors() {
  const school = db.schools.bySlug('virazh')
  const { showToast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(initialForm)

  const branches = school ? db.branches.bySchool(school.id) : []
  const instructors = school ? getInstructorsBySchool(school.id) : []
  const upcomingBookings = school ? getUpcomingBookings(school.id) : []

  const rows = useMemo(
    () =>
      instructors.map((instructor) => ({
        instructor,
        futureLessons: upcomingBookings.filter(
          (entry) => entry.booking.status === 'active' && entry.booking.instructorId === instructor.id,
        ).length,
        freeSlots7d: getAvailableSlots(instructor.id).filter((slot) => {
          const startsAt = new Date(`${slot.date}T${slot.time}:00`)
          return startsAt.getTime() <= Date.now() + 7 * 24 * 60 * 60 * 1000
        }).length,
      })),
    [instructors, upcomingBookings],
  )

  function openCreate(): void {
    setEditingId(null)
    setForm({
      ...initialForm,
      branchId: branches[0]?.id ?? '',
    })
    setModalOpen(true)
  }

  function openEdit(instructor: Instructor): void {
    setEditingId(instructor.id)
    setForm({
      branchId: instructor.branchId,
      name: instructor.name,
      phone: instructor.phone,
      email: instructor.email,
      bio: instructor.bio,
      car: instructor.car ?? '',
      transmission: instructor.transmission ?? 'manual',
      categories: instructor.categories?.length ? instructor.categories : ['B'],
      isActive: instructor.isActive,
    })
    setModalOpen(true)
  }

  function handleSubmit(): void {
    if (!school) return

    if (form.phone && !validateRussianPhone(form.phone)) {
      showToast('Телефон инструктора указан в неверном формате.', 'error')
      return
    }

    const result = editingId
      ? updateInstructor(editingId, form)
      : createInstructor({
          schoolId: school.id,
          ...form,
        })

    if (!result.ok) {
      showToast(result.error ?? 'Не удалось сохранить инструктора.', 'error')
      return
    }

    setModalOpen(false)
    showToast(editingId ? 'Инструктор обновлён.' : 'Инструктор создан.', 'success')
  }

  function toggleCategory(code: string): void {
    setForm((current) => {
      const active = current.categories.includes(code)
      const nextCategories = active
        ? current.categories.filter((item) => item !== code)
        : [...current.categories, code]

      return {
        ...current,
        categories: nextCategories.length ? nextCategories : ['B'],
      }
    })
  }

  async function copyLink(instructor: Instructor): Promise<void> {
    const url = `${window.location.origin}/instructor/${instructor.token}`
    await navigator.clipboard.writeText(url)
    showToast('Ссылка скопирована.', 'success')
  }

  function toggle(instructor: Instructor): void {
    const result = toggleInstructorActive(instructor.id)
    if (!result.ok) {
      showToast(result.error ?? 'Не удалось изменить статус инструктора.', 'error')
      return
    }
    showToast(result.instructor?.isActive ? 'Инструктор включён.' : 'Инструктор выключен.', 'success')
  }

  if (!school) {
    return (
      <div className="max-w-7xl p-4 md:p-6">
        <StateView kind="error" title="Школа не найдена" description="Демо-данные не загружены." />
      </div>
    )
  }

  return (
    <div className="max-w-7xl p-4 md:p-6">
      <PageHeader
        eyebrow={school.name}
        title="Инструкторы"
        description="Управление карточками инструкторов, их доступностью и личными ссылками."
        actions={
          <Button onClick={openCreate}>
            <Plus size={16} />
            Создать инструктора
          </Button>
        }
      />

      <div className="mt-8">
        <Section title="Команда" description={`В школе ${rows.length} инструкторов.`}>
          {rows.length === 0 ? (
            <StateView title="Инструкторов пока нет" description="Создайте первого инструктора, чтобы он появился в записи и расписании." action={<Button onClick={openCreate}>Создать инструктора</Button>} />
          ) : (
            <div className="grid gap-3">
              {rows.map(({ instructor, futureLessons, freeSlots7d }) => (
                <DataRow key={instructor.id} className="p-4">
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)_250px] xl:items-center">
                  <div className="flex items-start gap-4">
                    <Avatar
                      initials={instructor.avatarInitials}
                      color={instructor.avatarColor}
                      src={getInstructorPhoto(instructor)}
                      alt={instructor.name}
                      size="xl"
                      className="rounded-2xl"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-black text-ink-900">{instructor.name}</p>
                        <Badge variant={instructor.isActive ? 'success' : 'default'}>
                          {instructor.isActive ? 'Активен' : 'Выключен'}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">{instructor.bio || 'Краткое описание пока не заполнено.'}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(instructor.categories?.length ? instructor.categories : ['B']).map((code) => (
                          <Badge key={code} variant="default">
                            {DRIVING_CATEGORIES.find((category) => category.code === code)?.title ?? code}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 px-3 py-3">
                      <p className="ui-kicker">Филиал</p>
                      <p className="mt-1 text-sm font-black text-ink-900">{branches.find((branch) => branch.id === instructor.branchId)?.name ?? 'Не найдено'}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-3">
                      <p className="ui-kicker">Телефон</p>
                      <p className="mt-1 text-sm font-black text-ink-900">{instructor.phone ? formatPhone(instructor.phone) : 'Не указан'}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-3">
                      <p className="ui-kicker">Машина</p>
                      <p className="mt-1 text-sm font-black text-ink-900">
                        {instructor.car ?? 'Не указана'}
                        {instructor.transmission ? ` · ${instructor.transmission === 'manual' ? 'Механика' : 'Автомат'}` : ''}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-3">
                      <p className="ui-kicker">Записи / слоты</p>
                      <p className="mt-1 text-sm font-black text-blue-700">{futureLessons} / {freeSlots7d}</p>
                    </div>
                  </div>

                  <div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-4">
                    <p className="ui-kicker">Личная ссылка</p>
                    <p className="mt-2 break-all text-sm font-medium text-slate-700">
                      {window.location.origin}/instructor/{instructor.token}
                    </p>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <Button variant="secondary" size="sm" onClick={() => openEdit(instructor)}>
                      Редактировать
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => void copyLink(instructor)}>
                      <Link2 size={14} />
                      Скопировать
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => window.open(`/instructor/${instructor.token}`, '_blank')}>
                      <ExternalLink size={14} />
                      Открыть
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => toggle(instructor)}>
                      <Power size={14} />
                      {instructor.isActive ? 'Выключить' : 'Включить'}
                    </Button>
                  </div>
                  </div>
                  </div>
                </DataRow>
              ))}
            </div>
          )}
        </Section>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Редактировать инструктора' : 'Новый инструктор'} size="lg">
        <div className="space-y-4 px-6 pb-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Имя" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            <FormField label="Филиал">
              <select value={form.branchId} onChange={(event) => setForm((current) => ({ ...current, branchId: event.target.value }))} className={selectClassName()}>
                <option value="">Выберите филиал</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </FormField>
            <Input label="Телефон" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
            <Input label="Email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
            <Input label="Машина" value={form.car} onChange={(event) => setForm((current) => ({ ...current, car: event.target.value }))} />
            <FormField label="Коробка">
              <select value={form.transmission} onChange={(event) => setForm((current) => ({ ...current, transmission: event.target.value as Transmission }))} className={selectClassName()}>
                <option value="manual">Механика</option>
                <option value="auto">Автомат</option>
              </select>
            </FormField>
          </div>

          <Textarea label="Описание" value={form.bio} onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))} rows={4} />

          <FormField label="Категории, по которым инструктор доступен для записи">
            <div className="grid gap-2 sm:grid-cols-2">
              {DRIVING_CATEGORIES.map((category) => {
                const active = form.categories.includes(category.code)
                return (
                  <button
                    key={category.code}
                    type="button"
                    onClick={() => toggleCategory(category.code)}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      active
                        ? 'border-forest-600 bg-forest-50 text-stone-950'
                        : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                    }`}
                  >
                    <span className="text-sm font-semibold">{category.title}</span>
                    <span className="mt-1 block text-xs text-stone-500">{category.description}</span>
                  </button>
                )
              })}
            </div>
          </FormField>

          <label className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
            />
            Инструктор активен и доступен в публичной записи
          </label>

          <div className="flex gap-3">
            <Button className="flex-1" onClick={handleSubmit}>
              {editingId ? 'Сохранить изменения' : 'Создать инструктора'}
            </Button>
            <Button variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>
              Закрыть
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
