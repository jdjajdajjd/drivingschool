import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const failures = []

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (entry === 'node_modules' || entry === 'dist') return []
    if (statSync(path).isDirectory()) return walk(path)
    return path
  })
}

function read(path) {
  return readFileSync(join(root, path), 'utf8')
}

const adminFiles = walk(join(root, 'src/pages/admin')).concat([
  join(root, 'src/components/layout/AdminLayout.tsx'),
  join(root, 'src/components/layout/AdminSidebar.tsx'),
])

for (const file of adminFiles) {
  const source = readFileSync(file, 'utf8')
  if (source.includes('db.schools.all()[0]')) {
    failures.push(`${file}: uses first school instead of current admin school`)
  }
}

const storage = read('src/services/storage.ts')
if (!storage.includes('dd:staff_context:workspace') || !storage.includes('currentAdmin')) {
  failures.push('src/services/storage.ts: current admin school resolver is missing')
}

const roles = read('src/services/schoolStaff.ts')
for (const role of ['director', 'admin', 'branch_admin', 'accountant', 'instructor']) {
  if (!roles.includes(`id: '${role}'`)) failures.push(`src/services/schoolStaff.ts: missing role ${role}`)
}

const usersPage = read('src/pages/admin/Users.tsx')
for (const marker of ['listSchoolStaff', 'saveSchoolStaffMember', 'branchIds']) {
  if (!usersPage.includes(marker)) failures.push(`src/pages/admin/Users.tsx: missing ${marker}`)
}

const adminLayout = read('src/components/layout/AdminLayout.tsx')
for (const marker of ['AdminAccessDenied', 'currentRouteItem', 'roleHasPermission', 'AdminMenuSettingsModal', 'getEnabledAdminNavIds']) {
  if (!adminLayout.includes(marker)) failures.push(`src/components/layout/AdminLayout.tsx: missing ${marker}`)
}
for (const marker of ['quickSearch', 'filterStudents(db.students.bySchool', 'filterInstructors(db.instructors.bySchool']) {
  if (!adminLayout.includes(marker)) failures.push(`src/components/layout/AdminLayout.tsx: missing quick search marker ${marker}`)
}

const guardedAdminPages = [
  ['src/pages/admin/Students.tsx', 'students.manage'],
  ['src/pages/admin/Schedule.tsx', 'schedule.manage'],
  ['src/pages/admin/Settings.tsx', 'settings.manage'],
  ['src/pages/admin/InstructorDetail.tsx', 'branches.manage'],
]

for (const [file, permission] of guardedAdminPages) {
  const source = read(file)
  if (!source.includes('assertAdminPermission')) failures.push(`${file}: missing admin permission guard`)
  if (!source.includes(permission)) failures.push(`${file}: missing ${permission} guard`)
}

const dashboard = read('src/pages/admin/Dashboard.tsx')
for (const marker of ['validateDataIntegrity', 'Проверка данных', 'Ошибка в данных школы', 'auditLog.all', 'Последние действия', 'DashboardBlocksModal', 'Блоки главной', 'getEnabledDashboardBlockIds']) {
  if (!dashboard.includes(marker)) failures.push(`src/pages/admin/Dashboard.tsx: missing ${marker}`)
}

for (const [file, marker] of [
  ['src/pages/admin/Students.tsx', 'student_created'],
  ['src/pages/admin/InstructorDetail.tsx', 'instructor_updated'],
]) {
  if (!read(file).includes(marker)) failures.push(`${file}: missing ${marker} audit entry`)
}

for (const [file, marker] of [
  ['src/pages/admin/StudentDetail.tsx', 'filterStudents([student])'],
  ['src/pages/admin/StudentDetail.tsx', 'student.schoolId !== school.id'],
  ['src/pages/admin/InstructorDetail.tsx', 'filterInstructors([instructor])'],
  ['src/pages/admin/InstructorDetail.tsx', 'instructor.schoolId !== school.id'],
]) {
  if (!read(file).includes(marker)) failures.push(`${file}: missing detail scope guard ${marker}`)
}

const studentsPage = read('src/pages/admin/Students.tsx')
for (const marker of ['selectedIds', "'problem'", 'updateSelectedStudents', 'Перенесены в архив', 'no_instructor', 'no_group', 'v-admin-table-sticky', 'v-admin-table-compact']) {
  if (!studentsPage.includes(marker)) failures.push(`src/pages/admin/Students.tsx: missing bulk/problem marker ${marker}`)
}

const schedulePage = read('src/pages/admin/Schedule.tsx')
for (const marker of ['SlotTemplateForm', 'timeToMinutes', 'Создан шаблон окон']) {
  if (!schedulePage.includes(marker)) failures.push(`src/pages/admin/Schedule.tsx: missing schedule template marker ${marker}`)
}
for (const marker of ['dd:admin_schedule_view', 'duplicateSelectedSlotTomorrow']) {
  if (!schedulePage.includes(marker)) failures.push(`src/pages/admin/Schedule.tsx: missing schedule convenience marker ${marker}`)
}

const studentDetail = read('src/pages/admin/StudentDetail.tsx')
for (const marker of ['missingDocs', 'nextBooking', 'Следующее']) {
  if (!studentDetail.includes(marker)) failures.push(`src/pages/admin/StudentDetail.tsx: missing student summary marker ${marker}`)
}

for (const marker of ['normalizePersonName', 'normalizeNamePart']) {
  if (!read('src/lib/nameFormat.ts').includes(marker)) failures.push(`src/lib/nameFormat.ts: missing ${marker}`)
}
if (!read('src/lib/phoneFormat.ts').includes('formatRussianPhoneInput')) failures.push('src/lib/phoneFormat.ts: missing formatRussianPhoneInput')

for (const file of ['src/services/bookingService.ts', 'src/services/studentProfile.ts', 'src/services/instructorService.ts', 'src/services/schoolStaffService.ts']) {
  if (!read(file).includes('normalizePersonName')) failures.push(`${file}: missing name normalization`)
}

for (const file of ['src/pages/admin/Students.tsx', 'src/pages/admin/StudentDetail.tsx', 'src/pages/admin/InstructorDetail.tsx', 'src/pages/admin/Instructors.tsx', 'src/pages/admin/Users.tsx']) {
  if (!read(file).includes('formatRussianPhoneInput')) failures.push(`${file}: missing phone autoformat`)
}

const integrity = read('src/services/integrityService.ts')
for (const marker of ['slot.schoolId !== schoolId', 'instructor.schoolId !== schoolId', 'branch.schoolId !== schoolId', 'student.schoolId !== schoolId']) {
  if (!integrity.includes(marker)) failures.push(`src/services/integrityService.ts: missing ${marker}`)
}

const adminStorage = read('src/services/adminStorage.ts')
for (const marker of ['createCurrentStaffAuditEntry', 'getWorkspaceStaffContext', 'STAFF_ROLE_AUDIT_LABEL']) {
  if (!adminStorage.includes(marker)) failures.push(`src/services/adminStorage.ts: missing ${marker}`)
}

for (const file of [
  'src/pages/admin/Payments.tsx',
  'src/pages/admin/Settings.tsx',
  'src/pages/admin/Students.tsx',
  'src/pages/admin/Cars.tsx',
  'src/pages/admin/InstructorDetail.tsx',
  'src/pages/admin/StudentDetail.tsx',
  'src/pages/admin/Schedule.tsx',
  'src/services/schoolStaffService.ts',
]) {
  const source = read(file)
  if (source.includes("'admin', 'Менеджер школы'") || source.includes("'admin',\n    'Менеджер школы'")) {
    failures.push(`${file}: uses hardcoded audit actor`)
  }
  if (!source.includes('createCurrentStaffAuditEntry')) failures.push(`${file}: missing current staff audit helper`)
}

for (const marker of ['finance.view', 'finance.manage', 'vehicles.manage', 'documents.manage', 'exams.manage']) {
  if (!roles.includes(marker)) failures.push(`src/services/schoolStaff.ts: missing ${marker}`)
}

for (const file of ['src/services/branchService.ts', 'src/services/instructorService.ts', 'src/services/slotService.ts', 'src/services/schoolService.ts', 'src/services/studentService.ts', 'src/services/studentProfile.ts']) {
  if (!read(file).includes('assertAdminPermission')) failures.push(`${file}: missing permission guard`)
}

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log('Multitenant local smoke passed')
