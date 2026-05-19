import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import React, { lazy, Suspense, useEffect, useState } from 'react'
import { ProtectedAccess } from './components/layout/ProtectedAccess'
import {
  ADMIN_BASE_PATH,
  ADMIN_LOGIN_PATH,
  DEMO_ADMIN_BASE_PATH,
  SUPERADMIN_BASE_PATH,
  SUPERADMIN_LOGIN_PATH,
  WORKSPACE_ADMIN_LOGIN_PATH,
} from './services/accessControl'
import { setDataNamespace } from './services/storage'
import { seedIfNeeded } from './services/seed'
import { DEMO_SCHOOL_PATH, DEMO_SCHOOL_SLUG, DEMO_STUDENT_REGISTER_PATH } from './services/schoolRoutes'
import { LoadingScreen } from './components/ui/loader'

void React

const SchoolPage = lazy(() => import('./pages/SchoolPage').then((module) => ({ default: module.SchoolPage })))
const StudentPage = lazy(() => import('./pages/StudentPage').then((module) => ({ default: module.StudentPage })))
const StudentRegisterPage = lazy(() => import('./pages/StudentRegisterPage'))
const StudentLoginPage = lazy(() => import('./pages/StudentLoginPage'))
const LandingPage = lazy(() => import('./pages/LandingPage').then((module) => ({ default: module.LandingPage })))
const DemoHubPage = lazy(() => import('./pages/DemoHubPage').then((module) => ({ default: module.DemoHubPage })))
const EntryLoginPage = lazy(() => import('./pages/EntryLoginPage').then((module) => ({ default: module.EntryLoginPage })))
const LegalPage = lazy(() => import('./pages/LegalPage').then((module) => ({ default: module.LegalPage })))
const BookingConfirmation = lazy(() => import('./pages/BookingConfirmation').then((module) => ({ default: module.BookingConfirmation })))
const StaffLoginPage = lazy(() => import('./pages/StaffLoginPage').then((module) => ({ default: module.StaffLoginPage })))
const InstructorPage = lazy(() => import('./pages/InstructorPage').then((module) => ({ default: module.InstructorPage })))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })))

const AdminLayout = lazy(() => import('./components/layout/AdminLayout').then((module) => ({ default: module.AdminLayout })))
const AdminToday = lazy(() => import('./pages/admin/Today').then((module) => ({ default: module.AdminToday })))
const AdminSchedule = lazy(() => import('./pages/admin/Schedule').then((module) => ({ default: module.AdminSchedule })))
const AdminStudents = lazy(() => import('./pages/admin/Students').then((module) => ({ default: module.AdminStudents })))
const AdminStudentDetail = lazy(() => import('./pages/admin/StudentDetail').then((module) => ({ default: module.AdminStudentDetail })))
const AdminInstructors = lazy(() => import('./pages/admin/Instructors').then((module) => ({ default: module.AdminInstructors })))
const AdminInstructorDetail = lazy(() => import('./pages/admin/InstructorDetail').then((module) => ({ default: module.AdminInstructorDetail })))
const AdminCars = lazy(() => import('./pages/admin/Cars').then((module) => ({ default: module.AdminCars })))
const AdminBranches = lazy(() => import('./pages/admin/Branches').then((module) => ({ default: module.AdminBranches })))
const AdminPayments = lazy(() => import('./pages/admin/Payments').then((module) => ({ default: module.AdminPayments })))
const AdminDocuments = lazy(() => import('./pages/admin/Documents').then((module) => ({ default: module.AdminDocuments })))
const AdminExams = lazy(() => import('./pages/admin/Exams').then((module) => ({ default: module.AdminExams })))
const AdminReports = lazy(() => import('./pages/admin/Reports').then((module) => ({ default: module.AdminReports })))
const AdminSettings = lazy(() => import('./pages/admin/Settings').then((module) => ({ default: module.AdminSettings })))
const AdminUsers = lazy(() => import('./pages/admin/Users').then((module) => ({ default: module.AdminUsers })))
const AdminBookings = lazy(() => import('./pages/admin/Bookings').then((module) => ({ default: module.AdminBookings })))
const AdminSlots = lazy(() => import('./pages/admin/Slots').then((module) => ({ default: module.AdminSlots })))

const SuperAdminLayout = lazy(() => import('./components/layout/SuperAdminLayout').then((module) => ({ default: module.SuperAdminLayout })))
const SuperAdminOverview = lazy(() => import('./pages/SuperAdmin').then((module) => ({ default: module.SuperAdminOverview })))
const SuperAdminSchools = lazy(() => import('./pages/superadmin/Schools').then((module) => ({ default: module.SuperAdminSchools })))
const SuperAdminSchoolNew = lazy(() => import('./pages/superadmin/SchoolNew').then((module) => ({ default: module.SuperAdminSchoolNew })))
const SuperAdminSchoolDetail = lazy(() => import('./pages/superadmin/SchoolDetail').then((module) => ({ default: module.SuperAdminSchoolDetail })))

function PageFallback() {
  const path = window.location.pathname
  const isAdmin =
    path.startsWith(ADMIN_BASE_PATH) ||
    path.startsWith(DEMO_ADMIN_BASE_PATH) ||
    path.startsWith(SUPERADMIN_BASE_PATH) ||
    path === WORKSPACE_ADMIN_LOGIN_PATH
  return <LoadingScreen tone={isAdmin ? 'admin' : 'student'} label={isAdmin ? 'Загрузка кабинета' : 'Загрузка'} />
}

function SchoolBookRedirect() {
  const { slug = DEMO_SCHOOL_SLUG } = useParams<{ slug?: string }>()
  return <Navigate to={`/school/${slug}/login`} replace />
}

function NamespaceRedirect({ namespace, to }: { namespace: 'demo' | 'workspace'; to: string }) {
  setDataNamespace(namespace)
  return <Navigate to={to} replace />
}

function adminRoutes(basePath: string) {
  return (
    <>
      <Route index element={<AdminToday />} />
      <Route path="today" element={<AdminToday />} />
      <Route path="schedule" element={<AdminSchedule />} />
      <Route path="students" element={<AdminStudents />} />
      <Route path="students/:id" element={<AdminStudentDetail />} />
      <Route path="instructors" element={<AdminInstructors />} />
      <Route path="instructors/:id" element={<AdminInstructorDetail />} />
      <Route path="cars" element={<AdminCars />} />
      <Route path="branches" element={<AdminBranches />} />
      <Route path="payments" element={<AdminPayments />} />
      <Route path="documents" element={<AdminDocuments />} />
      <Route path="exams" element={<AdminExams />} />
      <Route path="reports" element={<AdminReports />} />
      <Route path="settings" element={<AdminSettings />} />
      <Route path="users" element={<AdminUsers />} />
      <Route path="bookings" element={<AdminBookings />} />
      <Route path="slots" element={<AdminSlots />} />
      <Route path="people" element={<Navigate to={`${basePath}/students`} replace />} />
      <Route path="school" element={<Navigate to={`${basePath}/settings`} replace />} />
      <Route path="money" element={<Navigate to={`${basePath}/payments`} replace />} />
    </>
  )
}

function App() {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const isWorkspace =
      window.location.pathname.startsWith(ADMIN_BASE_PATH) ||
      window.location.pathname === WORKSPACE_ADMIN_LOGIN_PATH ||
      window.location.pathname.startsWith('/school/workspace')
    const namespace = isWorkspace ? 'workspace' : 'demo'
    setDataNamespace(namespace)
    if (namespace === 'demo') {
      seedIfNeeded({ mode: namespace })
    }
    setIsReady(true)
  }, [])

  if (!isReady) {
    return <LoadingScreen tone="student" />
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<EntryLoginPage />} />
          <Route path="/auth" element={<Navigate to="/login" replace />} />
          <Route path="/admin" element={<Navigate to={WORKSPACE_ADMIN_LOGIN_PATH} replace />} />
          <Route path="/workspace-admin" element={<Navigate to={WORKSPACE_ADMIN_LOGIN_PATH} replace />} />
          <Route path="/staff/login" element={<Navigate to={ADMIN_LOGIN_PATH} replace />} />
          <Route path="/student/login" element={<Navigate to="/login" replace />} />
          <Route path="/register" element={<Navigate to="/student/register" replace />} />
          <Route path="/dashboard" element={<Navigate to="/student" replace />} />
          <Route path="/product" element={<Navigate to={DEMO_SCHOOL_PATH} replace />} />
          <Route path="/demo" element={<DemoHubPage />} />
          <Route path="/demo/student" element={<NamespaceRedirect namespace="demo" to={DEMO_STUDENT_REGISTER_PATH} />} />
          <Route path="/demo/school" element={<NamespaceRedirect namespace="demo" to={DEMO_SCHOOL_PATH} />} />
          <Route path="/demo/admin-login" element={<StaffLoginPage role="admin" mode="demo" />} />
          <Route path="/terms" element={<LegalPage />} />
          <Route path="/privacy" element={<LegalPage />} />
          <Route path="/school" element={<Navigate to={DEMO_SCHOOL_PATH} replace />} />
          <Route path="/school/:slug" element={<SchoolPage />} />
          <Route path="/school/:slug/book" element={<SchoolBookRedirect />} />
          <Route path="/school/:slug/login" element={<StudentLoginPage />} />
          <Route path="/school/:slug/register" element={<StudentRegisterPage />} />
          <Route path="/student/register" element={<StudentRegisterPage />} />
          <Route path="/student/book" element={<Navigate to="/student" replace />} />
          <Route path="/student" element={<StudentPage />} />
          <Route path="/booking/:bookingId" element={<BookingConfirmation />} />

          <Route path="/virazh-office-73q" element={<Navigate to={DEMO_ADMIN_BASE_PATH} replace />} />
          <Route path="/staff-entrance-73q" element={<Navigate to={ADMIN_LOGIN_PATH} replace />} />
          <Route path="/drivedesk-root-91x" element={<Navigate to={SUPERADMIN_BASE_PATH} replace />} />
          <Route path="/root-entrance-91x" element={<Navigate to={SUPERADMIN_LOGIN_PATH} replace />} />
          <Route path="/superadmin-login" element={<Navigate to={SUPERADMIN_LOGIN_PATH} replace />} />

          <Route path={WORKSPACE_ADMIN_LOGIN_PATH} element={<StaffLoginPage role="admin" mode="workspace" />} />
          <Route path={ADMIN_LOGIN_PATH} element={<StaffLoginPage role="admin" mode="demo" />} />
          <Route path={SUPERADMIN_LOGIN_PATH} element={<StaffLoginPage role="superadmin" />} />

          <Route element={<ProtectedAccess role="admin" mode="demo" />}>
            <Route path={`${DEMO_ADMIN_BASE_PATH}/*`} element={<AdminLayout mode="demo" basePath={DEMO_ADMIN_BASE_PATH} />}>
              {adminRoutes(DEMO_ADMIN_BASE_PATH)}
            </Route>
          </Route>

          <Route element={<ProtectedAccess role="admin" mode="workspace" />}>
            <Route path={`${ADMIN_BASE_PATH}/*`} element={<AdminLayout mode="workspace" basePath={ADMIN_BASE_PATH} />}>
              {adminRoutes(ADMIN_BASE_PATH)}
            </Route>
          </Route>

          <Route path="/instructor" element={<Navigate to="/instructor/tok-petrov-2024" replace />} />
          <Route path="/instructor/register" element={<Navigate to="/admin-panel/instructors" replace />} />
          <Route path="/instructor/:token" element={<InstructorPage />} />
          <Route element={<ProtectedAccess role="superadmin" />}>
            <Route path={`${SUPERADMIN_BASE_PATH}/*`} element={<SuperAdminLayout />}>
              <Route index element={<SuperAdminOverview />} />
              <Route path="schools" element={<SuperAdminSchools />} />
              <Route path="schools/new" element={<SuperAdminSchoolNew />} />
              <Route path="schools/:schoolId" element={<SuperAdminSchoolDetail />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
