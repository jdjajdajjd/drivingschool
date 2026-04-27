import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { lazy, Suspense, useEffect, useState } from 'react'
import { ProtectedAccess } from './components/layout/ProtectedAccess'
import { ADMIN_BASE_PATH, ADMIN_LOGIN_PATH, SUPERADMIN_BASE_PATH, SUPERADMIN_LOGIN_PATH } from './services/accessControl'

const LandingPage = lazy(() => import('./pages/LandingPage').then((module) => ({ default: module.LandingPage })))
const SchoolPage = lazy(() => import('./pages/SchoolPage').then((module) => ({ default: module.SchoolPage })))
const BookingConfirmation = lazy(() => import('./pages/BookingConfirmation').then((module) => ({ default: module.BookingConfirmation })))
const StaffLoginPage = lazy(() => import('./pages/StaffLoginPage').then((module) => ({ default: module.StaffLoginPage })))
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
    void Promise.all([
      import('./services/seed'),
      import('./services/supabaseSync'),
    ])
      .then(([seedModule, syncModule]) => {
        seedModule.seedIfNeeded()
        return syncModule.syncSupabaseSchoolToLocalDb('virazh')
      })
      .catch(() => undefined)
      .finally(() => setIsReady(true))
  }, [])

  if (!isReady) {
    return <div className="min-h-screen bg-stone-50" />
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/school/:slug" element={<SchoolPage />} />
          <Route path="/booking/:bookingId" element={<BookingConfirmation />} />
          <Route path={ADMIN_LOGIN_PATH} element={<StaffLoginPage role="admin" />} />
          <Route path={SUPERADMIN_LOGIN_PATH} element={<StaffLoginPage role="superadmin" />} />
          <Route element={<ProtectedAccess role="admin" />}>
            <Route path={ADMIN_BASE_PATH} element={<AdminLayout />}>
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
