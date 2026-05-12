import { useMemo, useState } from 'react'
import { db } from '../../services/storage'
import { adminUsers, createAuditEntry } from '../../services/adminStorage'
import { Modal } from '../../components/ui/Modal'
import type { User, UserRole } from '../../types'

const ROLE_LABELS: Record<UserRole, string> = {
  director: 'Директор', admin: 'Администратор', instructor: 'Инструктор',
  accountant: 'Бухгалтер', superadmin: 'Суперадмин',
}

export function AdminUsers() {
  const school = db.schools.all()[0]
  const [showAdd, setShowAdd] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  const users = useMemo(() => {
    if (!school) return []
    return adminUsers.all(school.id)
  }, [school?.id])

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 bg-white px-4 py-4 md:px-6">
        <div className="flex items-center gap-3">
          <h1 className="text-[24px] font-black text-gray-900">Пользователи</h1>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[12px] font-bold text-gray-500">{users.length}</span>
        </div>
        <button onClick={() => setShowAdd(true)} className="h-10 rounded-xl bg-gray-900 px-4 text-[13px] font-bold text-white">
          + Добавить сотрудника
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        {users.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-[15px] font-semibold text-gray-400">Сотрудников пока нет</p>
              <button onClick={() => setShowAdd(true)} className="mt-3 rounded-xl bg-gray-900 px-4 py-2 text-[13px] font-bold text-white">
                + Добавить
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <div key={user.id} className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 transition hover:border-gray-200">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-[14px] font-black text-gray-600">
                  {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">{user.name}</p>
                  <p className="text-[13px] font-semibold text-gray-400">{user.phone}</p>
                </div>
                <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-[12px] font-bold text-gray-600">
                  {ROLE_LABELS[user.role]}
                </span>
                <span className={`rounded-lg px-2.5 py-1 text-[12px] font-bold ${
                  user.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'
                }`}>
                  {user.isActive ? 'Активен' : 'Заблокирован'}
                </span>
                <button onClick={() => setEditingUser(user)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] font-semibold text-gray-500 transition hover:bg-gray-50">
                  Изменить
                </button>
              </div>
            ))}
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
          schoolId={school?.id ?? ''}
          user={editingUser}
          onClose={() => { setShowAdd(false); setEditingUser(null) }}
        />
      </Modal>
    </div>
  )
}

function UserForm({ schoolId, user, onClose }: { schoolId: string; user: User | null; onClose: () => void }) {
  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [role, setRole] = useState<UserRole>(user?.role ?? 'admin')

  const handleSubmit = () => {
    if (!name || !phone) return
    const nextUser: User = {
      id: user?.id ?? `user_${Date.now()}`,
      schoolId: user?.schoolId ?? schoolId,
      name, phone, email, role,
      isActive: user?.isActive ?? true,
      branchIds: user?.branchIds ?? [],
      canViewFinances: role === 'director' || role === 'accountant',
      canManageSettings: role === 'director',
      canDeleteData: role === 'director',
      canManageStaff: role === 'director',
      createdAt: user?.createdAt ?? new Date().toISOString(),
      updatedAt: user ? new Date().toISOString() : undefined,
    }
    adminUsers.upsert(nextUser)
    createAuditEntry(schoolId, 'admin', 'Администратор', user ? 'user_updated' : 'user_created', 'user', nextUser.id, `${user ? 'Обновлен' : 'Добавлен'} сотрудник ${nextUser.name} (${role})`)
    onClose()
  }

  return (
    <div className="space-y-4 p-5">
      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-gray-600">Имя</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Иванов Иван" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-[14px] font-semibold text-gray-900 placeholder-gray-300 transition focus:border-gray-900 focus:bg-white focus:outline-none" />
      </div>
      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-gray-600">Телефон</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 999 123-45-67" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-[14px] font-semibold text-gray-900 placeholder-gray-300 transition focus:border-gray-900 focus:bg-white focus:outline-none" />
      </div>
      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-gray-600">Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ivan@school.ru" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-[14px] font-semibold text-gray-900 placeholder-gray-300 transition focus:border-gray-900 focus:bg-white focus:outline-none" />
      </div>
      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-gray-600">Роль</label>
        <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-[14px] font-semibold text-gray-900 transition focus:border-gray-900 focus:bg-white focus:outline-none">
          <option value="director">Директор</option>
          <option value="admin">Администратор</option>
          <option value="accountant">Бухгалтер</option>
          <option value="instructor">Инструктор</option>
        </select>
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={onClose} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-[13px] font-bold text-gray-600 transition hover:bg-gray-50">Отмена</button>
        <button onClick={handleSubmit} className="flex-1 rounded-xl bg-gray-900 py-2.5 text-[13px] font-bold text-white transition hover:bg-gray-800">Сохранить</button>
      </div>
    </div>
  )
}
