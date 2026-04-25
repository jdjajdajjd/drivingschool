import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { seedIfNeeded } from './services/seed'
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
import { InstructorPage } from './pages/InstructorPage'
import { SuperAdminOverview } from './pages/SuperAdmin'
import { SuperAdminSchools } from './pages/superadmin/Schools'
import { SuperAdminSchoolNew } from './pages/superadmin/SchoolNew'
import { SuperAdminSchoolDetail } from './pages/superadmin/SchoolDetail'
import { SuperAdminLayout } from './components/layout/SuperAdminLayout'
import { NotFoundPage } from './pages/NotFoundPage'

function App() {
  useEffect(() => {
    seedIfNeeded()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/school/:slug" element={<SchoolPage />} />
        <Route path="/booking/:bookingId" element={<BookingConfirmation />} />
        <Route path="/admin" element={<AdminLayout />}>
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
        <Route path="/instructor/:token" element={<InstructorPage />} />
        <Route path="/superadmin" element={<SuperAdminLayout />}>
          <Route index element={<SuperAdminOverview />} />
          <Route path="schools" element={<SuperAdminSchools />} />
          <Route path="schools/new" element={<SuperAdminSchoolNew />} />
          <Route path="schools/:schoolId" element={<SuperAdminSchoolDetail />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
