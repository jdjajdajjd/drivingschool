import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import React, { lazy, Suspense, useEffect, useState } from 'react'
import { ProtectedAccess } from './components/layout/ProtectedAccess'
import { ADMIN_BASE_PATH, ADMIN_LOGIN_PATH, WORKSPACE_ADMIN_LOGIN_PATH, SUPERADMIN_BASE_PATH, SUPERADMIN_LOGIN_PATH } from './services/accessControl'

void React

const SchoolPage = lazy(() => import('./pages/SchoolPage').then((module) => ({ default: module.SchoolPage })))
const BookingFlowPage = lazy(() => import('./pages/BookingFlowPage').then((module) => ({ default: module.BookingFlowPage })))
const StudentPage = lazy(() => import('./pages/StudentPage').then((module) => ({ default: module.StudentPage })))
const StudentRegisterPage = lazy(() => import('./pages/StudentRegisterPage'))
const StudentLoginPage = lazy(() => import('./pages/StudentLoginPage'))
const LandingPage = lazy(() => import('./pages/LandingPage').then((module) => ({ default: module.LandingPage })))
const LegalPage = lazy(() => import('./pages/LegalPage').then((module) => ({ default: module.LegalPage })))
const BookingConfirmation = lazy(() => import('./pages/BookingConfirmation').then((module) => ({ default: module.BookingConfirmation })))
const StaffLoginPage = lazy(() => import('./pages/StaffLoginPage').then((module) => ({ default: module.StaffLoginPage })))
const AutoAdminAccess = lazy(() => import('./components/layout/AutoAdminAccess').then((module) => ({ default: module.AutoAdminAccess })))
const InstructorPage = lazy(() => import('./pages/InstructorPage').then((module) => ({ default: module.InstructorPage })))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })))

const AdminLayout = lazy(() => import('./components/layout/AdminLayout').then((module) => ({ default: module.AdminLayout })))
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard').then((module) => ({ default: module.AdminDashboard })))
const AdminBookings = lazy(() => import('./pages/admin/Bookings').then((module) => ({ default: module.AdminBookings })))
const AdminSlots = lazy(() => import('./pages/admin/Slots').then((module) => ({ default: module.AdminSlots })))
const AdminStudents = lazy(() => import('./pages/admin/Students').then((module) => ({ default: module.AdminStudents })))
const AdminStudentDetail = lazy(() => import('./pages/admin/StudentDetail').then((module) => ({ default: module.AdminStudentDetail })))
const AdminInstructors = lazy(() => import('./pages/admin/Instructors').then((module) => ({ default: module.AdminInstructors })))
const AdminBranches = lazy(() => import('./pages/admin/Branches').then((module) => ({ default: module.AdminBranches })))
const AdminModules = lazy(() => import('./pages/admin/Modules').then((module) => ({ default: module.AdminModules })))
const AdminModuleDetail = lazy(() => import('./pages/admin/ModuleDetail').then((module) => ({ default: module.AdminModuleDetail })))
const AdminSettings = lazy(() => import('./pages/admin/Settings').then((module) => ({ default: module.AdminSettings })))

const SuperAdminLayout = lazy(() => import('./components/layout/SuperAdminLayout').then((module) => ({ default: module.SuperAdminLayout })))
const SuperAdminOverview = lazy(() => import('./pages/SuperAdmin').then((module) => ({ default: module.SuperAdminOverview })))
const SuperAdminSchools = lazy(() => import('./pages/superadmin/Schools').then((module) => ({ default: module.SuperAdminSchools })))
const SuperAdminSchoolNew = lazy(() => import('./pages/superadmin/SchoolNew').then((module) => ({ default: module.SuperAdminSchoolNew })))
const SuperAdminSchoolDetail = lazy(() => import('./pages/superadmin/SchoolDetail').then((module) => ({ default: module.SuperAdminSchoolDetail })))

function PageFallback() {
  return <div className="min-h-screen bg-stone-50" />
}

function App() {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    Promise.all([import('./services/storage'), import('./services/seed')]).then(([storage, seed]) => {
      const shouldUseWorkspace = window.location.pathname.startsWith(ADMIN_BASE_PATH) || window.location.pathname === WORKSPACE_ADMIN_LOGIN_PATH || window.location.pathname === '/admin' || window.location.pathname.startsWith('/school/workspace')
      storage.setDataNamespace(shouldUseWorkspace ? 'workspace' : 'demo')
      seed.seedIfNeeded({ mode: shouldUseWorkspace ? 'workspace' : 'demo' })
      setIsReady(true)
    })

    const fallback = setTimeout(() => setIsReady(true), 1200)
    return () => clearTimeout(fallback)
  }, [])

  if (!isReady) {
    return <div className="min-h-screen" style={{ background: '#F2F3F4' }} />
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<StudentLoginPage />} />
          <Route path="/auth" element={<Navigate to="/login" replace />} />
          <Route path="/admin" element={<Navigate to={WORKSPACE_ADMIN_LOGIN_PATH} replace />} />
          <Route path="/staff/login" element={<Navigate to={ADMIN_LOGIN_PATH} replace />} />
          <Route path="/student/login" element={<Navigate to="/login" replace />} />
          <Route path="/register" element={<Navigate to="/student/register" replace />} />
          <Route path="/dashboard" element={<Navigate to="/student" replace />} />
          <Route path="/product" element={<Navigate to="/school/virazh" replace />} />
          <Route path="/demo" element={<Navigate to="/school/virazh" replace />} />
          <Route path="/terms" element={<LegalPage />} />
          <Route path="/privacy" element={<LegalPage />} />
          <Route path="/school" element={<Navigate to="/school/virazh" replace />} />
          <Route path="/school/:slug" element={<SchoolPage />} />
          <Route path="/school/:slug/book" element={<BookingFlowPage />} />
          <Route path="/school/:slug/login" element={<StudentLoginPage />} />
          <Route path="/school/:slug/register" element={<StudentRegisterPage />} />
          <Route path="/student/register" element={<StudentRegisterPage />} />
          <Route path="/student/book" element={<BookingFlowPage />} />
          <Route path="/student" element={<StudentPage />} />
          <Route path="/booking/:bookingId" element={<BookingConfirmation />} />
          <Route path={WORKSPACE_ADMIN_LOGIN_PATH} element={<AutoAdminAccess />} />
          <Route path={ADMIN_LOGIN_PATH} element={<StaffLoginPage role="admin" mode="demo" />} />
          <Route path={SUPERADMIN_LOGIN_PATH} element={<StaffLoginPage role="superadmin" />} />
          <Route element={<ProtectedAccess role="admin" mode="workspace" />}>
            <Route path={ADMIN_BASE_PATH} element={<AdminLayout />}>
              <Route path="today" element={<Navigate to={ADMIN_BASE_PATH} replace />} />
              <Route index element={<AdminDashboard />} />
              <Route path="bookings" element={<AdminBookings />} />
              <Route path="slots" element={<AdminSlots />} />
              <Route path="students" element={<AdminStudents />} />
              <Route path="students/:studentId" element={<AdminStudentDetail />} />
              <Route path="instructors" element={<AdminInstructors />} />
              <Route path="branches" element={<AdminBranches />} />
              <Route path="modules" element={<AdminModules />} />
              <Route path="modules/:moduleId" element={<AdminModuleDetail />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
          </Route>
          <Route path="/instructor" element={<Navigate to="/instructor/tok-petrov-2024" replace />} />
          <Route path="/instructor/register" element={<Navigate to="/admin/instructors" replace />} />
          <Route path="/instructor/:token" element={<InstructorPage />} />
          <Route element={<ProtectedAccess role="superadmin" />}>
            <Route path={SUPERADMIN_BASE_PATH} element={<SuperAdminLayout />}>
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
