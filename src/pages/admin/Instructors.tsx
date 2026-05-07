import { Add01Icon, PowerOffIcon } from '@hugeicons/core-free-icons'
import { useMemo, useState } from 'react'
import { Avatar } from '../../components/ui/Avatar'
import { createHugeIcon } from '../../components/ui/HugeIcon'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { StateView } from '../../components/ui/StateView'
import { CompactDataRow, SmallEmptyState } from '../../components/ui/CompactAdmin'
import { FormField } from '../../components/ui/FormField'
import { Input, Textarea } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/ui/PageHeader'
import { Section } from '../../components/ui/Section'
import { useToast } from '../../components/ui/Toast'

const Plus = createHugeIcon(Add01Icon)
const Power = createHugeIcon(PowerOffIcon)
import { formatPhone } from '../../lib/utils'
import { getUpcomingBookings, validateRussianPhone } from '../../services/bookingService'
import { DRIVING_CATEGORIES } from '../../services/drivingCategories'
import { createInstructorConfirmed, getInstructorsBySchool, toggleInstructorActiveConfirmed, updateInstructorConfirmed } from '../../services/instructorService'
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
  return 'h-11 w-full rounded-[16px] border border-[#D8E0EC] bg-white px-3.5 text-[15px] text-[text-[#111827]] outline-none transition focus:border-accent focus:ring-3 focus:ring-accent/10'
}

export function AdminInstructors() {
  const school = db.schools.all()[0] ?? null
  const { showToast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

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

  async function handleSubmit(): Promise<void> {
    if (!school || saving) return

    if (form.phone && !validateRussianPhone(form.phone)) {
      showToast('Телефон инструктора указан в неверном формате.', 'error')
      return
    }

    try {
      setSaving(true)
      const result = editingId
        ? await updateInstructorConfirmed(editingId, form)
        : await createInstructorConfirmed({
            schoolId: school.id,
            ...form,
          })

      if (!result.ok) {
        showToast(result.error ?? 'Не удалось сохранить инструктора.', 'error')
        return
      }

      setModalOpen(false)
      showToast(editingId ? 'Инструктор обновлён.' : 'Инструктор создан.', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось сохранить инструктора.', 'error')
    } finally {
      setSaving(false)
    }
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

  async function toggle(instructor: Instructor): Promise<void> {
    if (togglingId) return
    try {
      setTogglingId(instructor.id)
      const result = await toggleInstructorActiveConfirmed(instructor.id)
      if (!result.ok) {
        showToast(result.error ?? 'Не удалось изменить статус инструктора.', 'error')
        return
      }
      showToast(result.instructor?.isActive ? 'Инструктор включён.' : 'Инструктор выключен и скрыт из публичной записи.', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось изменить статус инструктора.', 'error')
    } finally {
      setTogglingId(null)
    }
  }

  if (!school) {
    return (
      <div className="max-w-7xl bg-[#E9EEF7] p-2.5 md:p-5">
        <StateView kind="error" title="Школа не найдена" description="Данные школы не загружены." />
      </div>
    )
  }

  return (
    <div className="max-w-7xl bg-[#E9EEF7] p-2.5 md:p-5">
      <PageHeader
        eyebrow={school.name}
        title="Инструкторы"
        description="Команда, филиалы и доступность."
        actions={
          <Button onClick={openCreate} disabled={saving || Boolean(togglingId)}>
            <Plus size={16} />
            Создать инструктора
          </Button>
        }
      />

      <div className="mt-3">
        <Section title="Инструкторы" description={`${rows.length} человек`}>
          {rows.length === 0 ? (
            <SmallEmptyState
              title="Инструкторов пока нет"
              description="Создайте первого инструктора."
                          />
          ) : (
            <div className="grid gap-2">
              {rows.map(({ instructor, futureLessons, freeSlots7d }) => (
                <CompactDataRow key={instructor.id}>
                  <div className="grid gap-1.5 md:grid-cols-[minmax(0,1fr)_260px_auto] md:items-center">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar initials={instructor.avatarInitials} color={instructor.avatarColor} src={getInstructorPhoto(instructor)} alt={instructor.name} size="md" className="rounded-[12px]" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-[15px] font-black text-[#111827]">{instructor.name}</p>
                          <Badge variant={instructor.isActive ? 'success' : 'default'}>{instructor.isActive ? 'Активен' : 'Выключен'}</Badge>
                        </div>
                        <p className="truncate text-[13px] font-medium text-[#4B5A70]">{branches.find((branch) => branch.id === instructor.branchId)?.name ?? 'Филиал не найден'}</p>
                        <p className="truncate text-[12px] font-semibold text-[#667085]">{instructor.phone ? formatPhone(instructor.phone) : 'Телефон не указан'} · {instructor.car ?? 'Машина не указана'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-center">
                      <div className="rounded-[10px] bg-[#F8FAFC] px-2 py-1.5">
                        <p className="text-[11px] font-bold text-[#667085]">Записи</p>
                        <p className="text-[15px] font-black text-[#111827]">{futureLessons}</p>
                      </div>
                      <div className="rounded-[10px] bg-[#F8FAFC] px-2 py-1.5">
                        <p className="text-[11px] font-bold text-[#667085]">Окна</p>
                        <p className="text-[15px] font-black text-[#2436D9]">{freeSlots7d}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1 md:w-[190px]">
                      <Button variant="secondary" size="sm" onClick={() => openEdit(instructor)} disabled={saving || Boolean(togglingId)}>
                        Редактировать
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => void toggle(instructor)} disabled={saving || Boolean(togglingId)}>
                        <Power size={14} />
                        {togglingId === instructor.id ? '...' : instructor.isActive ? 'Выкл.' : 'Вкл.'}
                      </Button>
                    </div>
                  </div>
                </CompactDataRow>
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
                    className={`rounded-[16px] border px-3 py-2.5 text-left transition ${
                      active
                        ? 'border-accent rgba(246,184,77,0.12) text-[#111827]'
                        : 'border-[#D8E0EC] bg-white text-[#4B5A70] hover:rgba(246,184,77,0.20)'
                    }`}
                  >
                    <span className="text-sm font-semibold">{category.title}</span>
                    <span className="mt-1 block text-xs text-[#667085]">{category.description}</span>
                  </button>
                )
              })}
            </div>
          </FormField>

          <label className="flex items-center gap-3 rounded-[16px] border border-[#D8E0EC] bg-[#F8FAFE] px-4 py-3 text-sm text-[#4B5A70]">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
            />
            Инструктор активен и доступен в публичной записи
          </label>

          <p className="rounded-[16px] bg-[#FFF7E6] px-4 py-3 text-sm font-semibold text-[#8A5A00]">
            При выключении инструктора будущее свободное время будут скрыты из публичной записи. Занятые занятия сохраняются.
          </p>

          <div className="flex gap-3">
            <Button className="flex-1" onClick={() => void handleSubmit()} disabled={saving || Boolean(togglingId)}>
              {saving ? 'Сохраняем...' : editingId ? 'Сохранить изменения' : 'Создать инструктора'}
            </Button>
            <Button variant="secondary" className="flex-1" onClick={() => setModalOpen(false)} disabled={saving}>
              Закрыть
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
