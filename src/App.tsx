import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { seedIfNeeded } from './services/seed'
import { syncSupabaseSchoolToLocalDb } from './services/supabaseSync'
import { AdminLayout } from './components/layout/AdminLayout'
import { LandingPage } from './pages/LandingPage'
import { SchoolPage } from './pages/SchoolPage'
import { BookingConfirmation } from './pages/BookingConfirmation'
import { AdminDashboard } from './pages/admin/Dashboard'
import { AdminBookings } from './pages/admin/Bookings'
import { AdminSlots } from './pages/admin/Slots'
import { AdminStudents } from './pages/admin/Students'
import { AdminStudentDetail } from './pages/admin/StudentDetail'
import { AdminInstructors } from './pages/admin/Instructors'
import { AdminBranches } from './pages/admin/Branches'
import { AdminModules } from './pages/admin/Modules'
import { AdminModuleDetail } from './pages/admin/ModuleDetail'
import { AdminSettings } from './pages/admin/Settings'
import { StaffLoginPage } from './pages/StaffLoginPage'
import { InstructorPage } from './pages/InstructorPage'
import { SuperAdminOverview } from './pages/SuperAdmin'
import { SuperAdminSchools } from './pages/superadmin/Schools'
import { SuperAdminSchoolNew } from './pages/superadmin/SchoolNew'
import { SuperAdminSchoolDetail } from './pages/superadmin/SchoolDetail'
import { SuperAdminLayout } from './components/layout/SuperAdminLayout'
import { ProtectedAccess } from './components/layout/ProtectedAccess'
import { NotFoundPage } from './pages/NotFoundPage'
import { ADMIN_BASE_PATH, ADMIN_LOGIN_PATH, SUPERADMIN_BASE_PATH, SUPERADMIN_LOGIN_PATH } from './services/accessControl'

function App() {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    seedIfNeeded()
    void syncSupabaseSchoolToLocalDb('virazh')
      .catch(() => undefined)
      .finally(() => setIsReady(true))
  }, [])

  if (!isReady) {
    return <div className="min-h-screen bg-stone-50" />
  }

  return (
    <BrowserRouter>
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
    </BrowserRouter>
  )
}

export default App
