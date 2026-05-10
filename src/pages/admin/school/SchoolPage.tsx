import { useMemo, useState } from 'react'
import { StatusPill } from '../../../components/admin/core/StatusPill'
import { getSchoolById, updateSchoolConfirmed } from '../../../services/schoolService'
import { getBranchesBySchool } from '../../../services/branchService'
import { getInstructorsBySchool } from '../../../services/instructorService'
import { DRIVING_CATEGORIES } from '../../../services/drivingCategories'
import { useToast } from '../../../components/ui/Toast'
import { db } from '../../../services/storage'

type SchoolTab = 'main' | 'branches' | 'categories' | 'rules' | 'public'

const ALL_CATEGORIES = ['B', 'A', 'A1', 'C', 'D', 'BE', 'CE', 'D1', 'Tm', 'Tb']

export function AdminSchoolSettings() {
  const school = db.schools.all()[0] ?? null
  const { showToast } = useToast()
  const [tab, setTab] = useState<SchoolTab>('main')
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(school?.name ?? '')
  const [phone, setPhone] = useState(school?.phone ?? '')
  const [email, setEmail] = useState(school?.email ?? '')
  const [address, setAddress] = useState(school?.address ?? '')
  const [description, setDescription] = useState(school?.description ?? '')
  const [bookingLimit, setBookingLimit] = useState(school?.bookingLimitEnabled ?? true)
  const [maxActive, setMaxActive] = useState(school?.maxActiveBookingsPerStudent ?? 2)
  const [maxSlots, setMaxSlots] = useState(school?.maxSlotsPerBooking ?? 1)
  const [lessonDuration, setLessonDuration] = useState(school?.defaultLessonDuration ?? 90)
  const [branchMode, setBranchMode] = useState<'student_choice' | 'fixed_first'>(school?.branchSelectionMode ?? 'student_choice')
  const [enabledCategories, setEnabledCategories] = useState<string[]>(school?.enabledCategoryCodes ?? ['B'])
  const [refreshKey, setRefreshKey] = useState(0)

  const branches = useMemo(() => school ? getBranchesBySchool(school.id) : [], [school, refreshKey])
  const instructors = useMemo(() => school ? getInstructorsBySchool(school.id) : [], [school, refreshKey])

  const schoolData = school ? getSchoolById(school.id) : null
  const publicUrl = school ? `${window.location.origin}/school/${school.slug}` : ''

  async function handleSave() {
    if (!school) return
    try {
      const r = await updateSchoolConfirmed(school.id, {
        name: name.trim(),
        phone,
        email,
        address,
        description: description.trim(),
        bookingLimitEnabled: bookingLimit,
        maxActiveBookingsPerStudent: maxActive,
        maxSlotsPerBooking: maxSlots,
        defaultLessonDuration: lessonDuration,
        branchSelectionMode: branchMode,
        enabledCategoryCodes: enabledCategories,
      })
      if (!r.ok) { showToast(r.error ?? 'Ошибка', 'error'); return }
      showToast('Настройки сохранены', 'success')
      setEditing(false)
      setRefreshKey((k) => k + 1)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Ошибка', 'error')
    }
  }

  function toggleCategory(code: string) {
    setEnabledCategories((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    )
  }

  if (!school) return <div className="p-4"><p className="text-sm text-[#6F747A]">Загрузка…</p></div>

  return (
    <div className="min-h-dvh bg-bg pb-20">
      <div className="sticky top-0 z-20 border-b border-border bg-surface px-3 pt-3">
        <h1 className="text-[20px] font-black tracking-[-0.03em] text-ink">Школа</h1>
        <div className="-mx-3 mt-3 flex gap-0 overflow-x-auto border-b border-border px-3">
          {([
            ['main', 'Основное'],
            ['branches', 'Филиалы'],
            ['categories', 'Категории'],
            ['rules', 'Правила'],
            ['public', 'Страница'],
          ] as [SchoolTab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`shrink-0 border-b-2 px-3 pb-2.5 text-[12px] font-black transition-colors ${
                tab === key ? 'border-ink text-ink' : 'border-transparent text-[#9EA3A8]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN */}
      {tab === 'main' && (
        <div className="space-y-0 divide-y divide-border">
          <div className="bg-surface px-3 py-3">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[15px] font-black text-ink">Информация об автошколе</h2>
              {!editing ? (
                <button onClick={() => setEditing(true)} className="text-[12px] font-black text-info">Редактировать</button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => { setEditing(false); setName(school?.name ?? ''); setPhone(school?.phone ?? ''); setEmail(school?.email ?? ''); setAddress(school?.address ?? ''); setDescription(school?.description ?? '') }} className="text-[12px] font-bold text-[#9EA3A8]">Отмена</button>
                  <button onClick={() => void handleSave()} className="text-[12px] font-black text-success">Сохранить</button>
                </div>
              )}
            </div>
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-[#6F747A]">Название</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} className="min-h-10 w-full rounded-lg border border-border bg-surface px-3 text-[14px] font-semibold text-ink outline-none focus:border-[#9EA3A8]" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-[#6F747A]">Телефон</label>
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} className="min-h-10 w-full rounded-lg border border-border bg-surface px-3 text-[14px] font-semibold text-ink outline-none focus:border-[#9EA3A8]" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-[#6F747A]">Email</label>
                    <input value={email} onChange={(e) => setEmail(e.target.value)} className="min-h-10 w-full rounded-lg border border-border bg-surface px-3 text-[14px] font-semibold text-ink outline-none focus:border-[#9EA3A8]" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-[#6F747A]">Адрес</label>
                  <input value={address} onChange={(e) => setAddress(e.target.value)} className="min-h-10 w-full rounded-lg border border-border bg-surface px-3 text-[14px] font-semibold text-ink outline-none focus:border-[#9EA3A8]" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-[#6F747A]">Описание</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="min-h-16 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[14px] font-semibold text-ink outline-none focus:border-[#9EA3A8]" />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-[12px] font-semibold text-[#6F747A]">Название</span>
                  <span className="text-[13px] font-black text-ink">{schoolData?.name}</span>
                </div>
                {schoolData?.phone && (
                  <div className="flex justify-between">
                    <span className="text-[12px] font-semibold text-[#6F747A]">Телефон</span>
                    <a href={`tel:${schoolData.phone}`} className="text-[13px] font-black text-info">{schoolData.phone}</a>
                  </div>
                )}
                {schoolData?.email && (
                  <div className="flex justify-between">
                    <span className="text-[12px] font-semibold text-[#6F747A]">Email</span>
                    <span className="text-[13px] font-semibold text-ink">{schoolData.email}</span>
                  </div>
                )}
                {schoolData?.address && (
                  <div className="flex justify-between">
                    <span className="text-[12px] font-semibold text-[#6F747A]">Адрес</span>
                    <span className="max-w-[60%] text-right text-[13px] font-semibold text-ink">{schoolData.address}</span>
                  </div>
                )}
                {schoolData?.description && (
                  <div className="mt-2 rounded-lg border border-border bg-surface-soft p-2.5">
                    <p className="text-[12px] font-semibold text-[#6F747A]">Описание</p>
                    <p className="mt-1 text-[13px] font-semibold text-ink">{schoolData.description}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-px bg-border">
            {[
              { label: 'Учеников', value: db.students.bySchool(school.id).length },
              { label: 'Инструкторов', value: instructors.length },
              { label: 'Филиалов', value: branches.length },
            ].map((s) => (
              <div key={s.label} className="bg-surface px-3 py-3 text-center">
                <p className="text-[22px] font-black text-ink">{s.value}</p>
                <p className="text-[10px] font-semibold text-[#9EA3A8]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BRANCHES */}
      {tab === 'branches' && (
        <div>
          <div className="bg-surface px-3 py-2">
            <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-[#9EA3A8]">Филиалы ({branches.length})</p>
            {branches.length === 0 ? (
              <p className="py-4 text-center text-[13px] font-semibold text-[#9EA3A8]">Нет филиалов</p>
            ) : (
              <div className="space-y-1">
                {branches.map((b) => (
                  <div key={b.id} className="flex items-center justify-between rounded-lg border border-border bg-surface-soft px-3 py-2.5">
                    <div>
                      <p className="text-[13px] font-black text-ink">{b.name}</p>
                      <p className="text-[11px] font-semibold text-[#9EA3A8]">{b.address || 'Адрес не указан'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-[#9EA3A8]">
                        {instructors.filter((i) => i.branchId === b.id).length} инстр.
                      </span>
                      <StatusPill label={b.isActive ? 'Активен' : 'Выключен'} status={b.isActive ? 'success' : 'error'} size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CATEGORIES */}
      {tab === 'categories' && (
        <div className="bg-surface px-3 py-4">
          <p className="mb-3 text-[11px] font-black uppercase tracking-wide text-[#9EA3A8]">Активные категории</p>
          <div className="flex flex-wrap gap-2">
            {ALL_CATEGORIES.map((code) => {
              const active = enabledCategories.includes(code)
              return (
                <button
                  key={code}
                  onClick={() => toggleCategory(code)}
                  className={`min-h-10 rounded-xl border px-4 text-[14px] font-black transition ${
                    active
                      ? 'border-ink bg-ink text-white'
                      : 'border-border bg-surface text-[#9EA3A8]'
                  }`}
                >
                  {code}
                </button>
              )
            })}
          </div>
          <div className="mt-4 rounded-lg border border-border bg-surface-soft p-3">
            {enabledCategories.map((code) => {
              const info = DRIVING_CATEGORIES.find((c) => c.code === code)
              return (
                <div key={code} className="flex items-center justify-between py-1.5">
                  <div>
                    <span className="text-[13px] font-black text-ink">{code}</span>
                    <span className="ml-2 text-[12px] font-semibold text-[#9EA3A8]">{info?.title}</span>
                  </div>
                </div>
              )
            })}
          </div>
          <button onClick={() => void handleSave()} className="mt-4 w-full rounded-xl border border-success bg-success-soft py-3 text-[14px] font-black text-success">
            Сохранить категории
          </button>
        </div>
      )}

      {/* RULES */}
      {tab === 'rules' && (
        <div className="space-y-0 divide-y divide-border">
          <div className="bg-surface px-3 py-3">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[15px] font-black text-ink">Лимиты записей</h2>
              <button onClick={() => void handleSave()} className="text-[12px] font-black text-success">Сохранить</button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-black text-ink">Лимит активных записей</p>
                  <p className="text-[11px] font-semibold text-[#9EA3A8]">Максимум будущих записей на ученика</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input type="checkbox" checked={bookingLimit} onChange={(e) => setBookingLimit(e.target.checked)} className="peer sr-only" />
                  <div className="peer h-6 w-11 rounded-full bg-border transition peer-checked:bg-success peer-focus:outline-none" />
                  <div className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
                </label>
              </div>
              {bookingLimit && (
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-[#6F747A]">Максимум записей</label>
                  <select value={maxActive} onChange={(e) => setMaxActive(Number(e.target.value))} className="min-h-10 w-full rounded-lg border border-border bg-surface px-3 text-[14px] font-semibold text-ink outline-none focus:border-[#9EA3A8]">
                    {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="mb-1 block text-[11px] font-bold text-[#6F747A]">Слотов в бронировании</label>
                <select value={maxSlots} onChange={(e) => setMaxSlots(Number(e.target.value))} className="min-h-10 w-full rounded-lg border border-border bg-surface px-3 text-[14px] font-semibold text-ink outline-none focus:border-[#9EA3A8]">
                  {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold text-[#6F747A]">Длительность занятия по умолчанию</label>
                <select value={lessonDuration} onChange={(e) => setLessonDuration(Number(e.target.value))} className="min-h-10 w-full rounded-lg border border-border bg-surface px-3 text-[14px] font-semibold text-ink outline-none focus:border-[#9EA3A8]">
                  {[45, 60, 90, 120, 180].map((n) => <option key={n} value={n}>{n} мин</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold text-[#6F747A]">Выбор филиала</label>
                <select value={branchMode} onChange={(e) => setBranchMode(e.target.value as 'student_choice' | 'fixed_first')} className="min-h-10 w-full rounded-lg border border-border bg-surface px-3 text-[14px] font-semibold text-ink outline-none focus:border-[#9EA3A8]">
                  <option value="student_choice">Ученик выбирает</option>
                  <option value="fixed_first">Первый доступный</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PUBLIC PAGE */}
      {tab === 'public' && (
        <div className="space-y-0 divide-y divide-border">
          <div className="bg-surface px-3 py-4">
            <p className="mb-1 text-[11px] font-black uppercase tracking-wide text-[#9EA3A8]">Публичная ссылка</p>
            <div className="flex items-center gap-2">
              <input readOnly value={publicUrl} className="min-h-10 flex-1 rounded-lg border border-border bg-surface-soft px-3 text-[12px] font-semibold text-[#6F747A] outline-none" />
              <button
                onClick={() => { navigator.clipboard.writeText(publicUrl); showToast('Ссылка скопирована', 'success') }}
                className="shrink-0 rounded-lg border border-border bg-surface px-3 py-2 text-[12px] font-black text-ink"
              >
                Копировать
              </button>
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-lg border border-info/30 bg-info-soft px-3 py-2 text-[12px] font-black text-info"
              >
                Открыть
              </a>
            </div>
          </div>
          <div className="bg-surface px-3 py-4">
            <p className="mb-3 text-[13px] font-black text-ink">Превью</p>
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded-xl border border-border"
            >
              <div className="h-40 bg-gradient-to-br from-[#1f5b43] to-[#0d3322] p-4">
                <p className="text-xl font-black text-white">{school.name}</p>
                {school.description && <p className="mt-1 text-sm font-semibold text-white/70">{school.description}</p>}
              </div>
              <div className="bg-surface p-3">
                <p className="text-xs font-semibold text-[#6F747A]">Нажмите, чтобы открыть</p>
              </div>
            </a>
          </div>
          <div className="bg-surface px-3 py-4">
            <p className="mb-2 text-[13px] font-black text-ink">Шаг записи</p>
            <a
              href={`${publicUrl}/book`}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg border border-border bg-surface-soft px-4 py-3 text-[13px] font-semibold text-info"
            >
              {publicUrl}/book →
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
