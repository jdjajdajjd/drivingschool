import { useMemo, useState } from 'react'
import { db } from '../../services/storage'
import { Modal } from '../../components/ui/Modal'
import { SCHOOL_STAFF_ROLES, getRoleDefinition } from '../../services/schoolStaff'
import { listSchoolStaff, saveSchoolStaffMemberConfirmed } from '../../services/schoolStaffService'
import type { User, UserRole } from '../../types'
import { formatRussianPhoneInput } from '../../lib/phoneFormat'
import { useToast } from '../../components/ui/Toast'
import { isWorkspaceSupabaseReady } from '../../lib/supabase'

const roleOptions = SCHOOL_STAFF_ROLES.filter((role) => role.id !== 'superadmin')

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

function suggestStaffLogin(phone: string, name: string): string {
  const digits = digitsOnly(phone)
  if (digits.length >= 10) return digits.slice(-10)
  return name.trim().toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '.').replace(/^\.+|\.+$/g, '').slice(0, 32)
}

function generateStaffPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  let value = 'vr-'
  for (let index = 0; index < 10; index += 1) value += alphabet[Math.floor(Math.random() * alphabet.length)]
  return value
}

export function AdminUsers() {
  const school = db.schools.currentAdmin()
  const { showToast } = useToast()
  const [showAdd, setShowAdd] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  const users = useMemo(() => (school ? listSchoolStaff(school.id) : []), [school?.id])
  const branches = useMemo(() => (school ? db.branches.bySchool(school.id) : []), [school?.id])

  const activeCount = users.filter((user) => user.isActive).length
  const branchScopedCount = users.filter((user) => user.role === 'branch_admin' || user.role === 'instructor').length

  if (!school) {
    return <div className="p-4 text-sm font-semibold text-gray-500">Школа не выбрана.</div>
  }

  return (
    <div className="flex h-full flex-col">
      <div className="v-admin-toolbar">
        <div>
          <p className="v-admin-note">{school.name}</p>
          <h1 className="v-admin-heading">Команда школы</h1>
        </div>
        <div className="ml-auto grid w-full gap-2 sm:w-auto sm:grid-cols-[110px_110px_130px_auto]">
          {[
            ['Всего', users.length],
            ['Активны', activeCount],
            ['С филиалами', branchScopedCount],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[14px] bg-[#F8FAFC] px-3 py-2">
              <p className="text-[11px] font-semibold uppercase text-[#667085]">{label}</p>
              <p className="text-[20px] font-semibold text-[#111827]">{value}</p>
            </div>
          ))}
          <button onClick={() => setShowAdd(true)} className="v-admin-button">
            + Сотрудник
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 md:p-5">
        {users.length === 0 ? (
          <div className="v-admin-empty">
            <div>
              <strong>Сотрудников пока нет</strong>
              <span>Добавьте администратора, бухгалтера или ответственного за филиал.</span>
              <button onClick={() => setShowAdd(true)} className="v-admin-button mt-3">
                + Добавить
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {users.map((user) => {
              const role = getRoleDefinition(user.role)
              const assignedBranches = branches.filter((branch) => user.branchIds.includes(branch.id))
              return (
                <div key={user.id} className="v-human-card p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-[#EEF6FF] text-[14px] font-semibold text-[#075EBC]">
                      {user.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-black text-gray-900">{user.name}</p>
                        <span className={`v-admin-pill ${user.isActive ? 'v-tone-ok' : 'v-tone-muted'}`}>
                          {user.isActive ? 'Активен' : 'Отключен'}
                        </span>
                      </div>
                      <p className="mt-1 text-[13px] font-semibold text-gray-500">{[user.phone, user.email].filter(Boolean).join(' · ')}</p>
                      <p className="mt-2 text-[13px] font-semibold text-[#344054]">{role.label}</p>
                      {user.login ? <p className="mt-1 text-[12px] font-bold text-[#667085]">Логин: {user.login}</p> : null}
                      <p className="mt-1 max-w-[70ch] text-[12px] leading-5 text-[#667085]">{role.description}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {(assignedBranches.length ? assignedBranches.map((branch) => branch.name) : ['Все филиалы']).map((label) => (
                          <span key={label} className="rounded-md bg-[#F2F4F7] px-2 py-1 text-[11px] font-bold text-[#475467]">{label}</span>
                        ))}
                      </div>
                    </div>
                    <button onClick={() => setEditingUser(user)} className="v-admin-button-secondary">
                      Изменить
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Modal
        open={showAdd || Boolean(editingUser)}
        onClose={() => { setShowAdd(false); setEditingUser(null) }}
        title={editingUser ? 'Изменить сотрудника' : 'Добавить сотрудника'}
        size="md"
      >
        <UserForm
          schoolId={school.id}
          branches={branches}
          user={editingUser}
          onClose={() => { setShowAdd(false); setEditingUser(null) }}
          onSaved={(message) => showToast(message, 'success')}
          onError={(message) => showToast(message, 'error')}
        />
      </Modal>
    </div>
  )
}

function UserForm({
  schoolId,
  branches,
  user,
  onClose,
  onSaved,
  onError,
}: {
  schoolId: string
  branches: Array<{ id: string; name: string }>
  user: User | null
  onClose: () => void
  onSaved: (message: string) => void
  onError: (message: string) => void
}) {
  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [role, setRole] = useState<UserRole>(user?.role ?? 'admin')
  const [branchIds, setBranchIds] = useState<string[]>(user?.branchIds ?? [])
  const [isActive, setIsActive] = useState(user?.isActive ?? true)
  const [login, setLogin] = useState(user?.login ?? suggestStaffLogin(user?.phone ?? '', user?.name ?? ''))
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const roleDefinition = getRoleDefinition(role)
  const workspaceReady = isWorkspaceSupabaseReady()

  const toggleBranch = (branchId: string) => {
    setBranchIds((current) => current.includes(branchId) ? current.filter((id) => id !== branchId) : [...current, branchId])
  }

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) { onError('Укажите имя и телефон сотрудника.'); return }
    if (roleDefinition.branchScoped && branchIds.length === 0) { onError('Для этой роли выберите хотя бы один филиал.'); return }
    if (workspaceReady && !login.trim()) { onError('Укажите логин для входа сотрудника.'); return }
    if (workspaceReady && !user && password.trim().length < 8) { onError('Для нового сотрудника нужен пароль от 8 символов.'); return }

    setPending(true)
    const result = await saveSchoolStaffMemberConfirmed({
      existing: user,
      schoolId: user?.schoolId ?? schoolId,
      role,
      name,
      phone,
      email,
      branchIds,
      branches,
      login,
      password,
      isActive,
    })
    setPending(false)
    if (!result.ok) { onError(result.error ?? 'Не удалось сохранить сотрудника.'); return }

    if (result.login && password.trim()) {
      const message = [
        'Доступ в vroom',
        `Логин: ${result.login}`,
        `Пароль: ${password.trim()}`,
        `${window.location.origin}/admin-login`,
      ].join('\n')
      void navigator.clipboard?.writeText(message).catch(() => undefined)
      onSaved('Сотрудник сохранен, доступ скопирован.')
    } else {
      onSaved('Сотрудник сохранен.')
    }
    onClose()
  }

  return (
    <div className="space-y-4 p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold text-gray-600">Имя</span>
          <input value={name} onChange={(e) => { setName(e.target.value); if (!login) setLogin(suggestStaffLogin(phone, e.target.value)) }} placeholder="Иванов Иван" className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-[14px] font-semibold text-gray-900 outline-none focus:border-gray-900 focus:bg-white" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold text-gray-600">Телефон</span>
          <input value={phone} onChange={(e) => { setPhone(e.target.value); if (!login) setLogin(suggestStaffLogin(e.target.value, name)) }} onBlur={() => setPhone((value) => formatRussianPhoneInput(value))} placeholder="+7 999 123-45-67" className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-[14px] font-semibold text-gray-900 outline-none focus:border-gray-900 focus:bg-white" />
        </label>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-semibold text-gray-600">Email</span>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ivan@school.ru" className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-[14px] font-semibold text-gray-900 outline-none focus:border-gray-900 focus:bg-white" />
      </label>
      <div className="rounded-[14px] border border-[#E4E7EC] bg-[#F8FAFC] p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[13px] font-black text-gray-900">Доступ в кабинет</p>
            <p className="mt-0.5 text-[12px] leading-5 text-gray-500">Логин и роль сохраняются в Supabase. Пароль нужен при создании или смене доступа.</p>
          </div>
          <label className="flex shrink-0 items-center gap-2 text-[12px] font-bold text-gray-600">
            <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
            Активен
          </label>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-gray-600">Логин</span>
            <input value={login} onChange={(e) => setLogin(e.target.value)} onFocus={() => { if (!login) setLogin(suggestStaffLogin(phone, name)) }} placeholder="79991234567" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[14px] font-semibold text-gray-900 outline-none focus:border-gray-900" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-gray-600">Пароль</span>
            <div className="flex gap-2">
              <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder={user ? 'Не менять' : 'от 8 символов'} className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[14px] font-semibold text-gray-900 outline-none focus:border-gray-900" />
              <button type="button" onClick={() => { if (!login) setLogin(suggestStaffLogin(phone, name)); setPassword(generateStaffPassword()) }} className="rounded-lg border border-gray-200 bg-white px-3 text-[12px] font-black text-gray-700">Сген.</button>
            </div>
          </label>
        </div>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-semibold text-gray-600">Роль</span>
        <select value={role} onChange={(e) => { const nextRole = e.target.value as UserRole; setRole(nextRole); if (!getRoleDefinition(nextRole).branchScoped) setBranchIds([]) }} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-[14px] font-semibold text-gray-900 outline-none focus:border-gray-900 focus:bg-white">
          {roleOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
        <span className="mt-1.5 block text-[12px] leading-5 text-gray-500">{roleDefinition.description}</span>
      </label>
      {roleDefinition.branchScoped ? (
        <div>
          <p className="mb-2 text-[13px] font-semibold text-gray-600">Филиалы</p>
          <div className="grid gap-2">
            {branches.map((branch) => (
              <label key={branch.id} className="flex min-h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-[13px] font-bold text-gray-700">
                <input type="checkbox" checked={branchIds.includes(branch.id)} onChange={() => toggleBranch(branch.id)} />
                {branch.name}
              </label>
            ))}
          </div>
        </div>
      ) : null}
      <div className="v-modal-actions">
        <button onClick={onClose} className="flex-1 rounded-lg border border-gray-200 py-2.5 text-[13px] font-bold text-gray-600 transition hover:bg-gray-50">Отмена</button>
        <button onClick={() => void handleSubmit()} disabled={pending} className="v-admin-button flex-1">{pending ? 'Сохраняем...' : 'Сохранить'}</button>
      </div>
    </div>
  )
}
