import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './main.css'

import { AuthProvider, useAuth } from './context/AuthContext'
import { Navbar } from './components/layout/Navbar'
import { Footer } from './components/layout/Footer'
import { DashboardLayout } from './components/layout/DashboardLayout'
import { AdminLayout } from './components/layout/AdminLayout'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { AdminRoute } from './components/auth/AdminRoute'

import { HomePage } from './pages/HomePage'
import { QuestionsPage } from './pages/QuestionsPage'
import { QuestionDetailPage } from './pages/QuestionDetailPage'
import { AuthPage } from './pages/AuthPage'
import { EditProfilePage } from './pages/EditProfilePage'
import { ManualSubmissionPage } from './pages/ManualSubmissionPage'
import { AutoSubmissionPage } from './pages/AutoSubmissionPage'
import { ContributorsPage } from './pages/ContributorsPage'
import { ContributorProfilePage } from './pages/ContributorProfilePage'
import { MyManualSubmissionsPage } from './pages/MyManualSubmissionsPage'
import { MyAutoSubmissionsPage } from './pages/MyAutoSubmissionsPage'
import { ManualSubmissionDetailPage } from './pages/ManualSubmissionDetailPage'
import { AutoSubmissionDetailPage } from './pages/AutoSubmissionDetailPage'

import { AdminDashboardPage } from './pages/admin/AdminDashboardPage'
import { AdminDepartmentsPage } from './pages/admin/AdminDepartmentsPage'
import { AdminDepartmentFormPage } from './pages/admin/AdminDepartmentFormPage'
import { AdminCoursesPage } from './pages/admin/AdminCoursesPage'
import { AdminCourseFormPage } from './pages/admin/AdminCourseFormPage'
import { AdminSemestersPage } from './pages/admin/AdminSemestersPage'
import { AdminSemesterFormPage } from './pages/admin/AdminSemesterFormPage'
import { AdminExamTypesPage } from './pages/admin/AdminExamTypesPage'
import { AdminExamTypeFormPage } from './pages/admin/AdminExamTypeFormPage'
import { AdminQuestionsPage } from './pages/admin/AdminQuestionsPage'
import { AdminQuestionFormPage } from './pages/admin/AdminQuestionFormPage'
import { AdminSubmissionsPage } from './pages/admin/AdminSubmissionsPage'
import { AdminSubmissionFormPage } from './pages/admin/AdminSubmissionFormPage'
import { AdminManualSubmissionsPage } from './pages/admin/AdminManualSubmissionsPage'
import { AdminManualSubmissionDetailPage } from './pages/admin/AdminManualSubmissionDetailPage'
import { AdminUsersPage } from './pages/admin/AdminUsersPage'
import { AdminUserFormPage } from './pages/admin/AdminUserFormPage'
import { api } from './lib/api'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

function App() {
  const { isAuthenticated } = useAuth()
  const [googleClientId, setGoogleClientId] = useState<string | null>(null)

  // The Google client id is only needed for the sign-in button, so skip the
  // config request entirely while the user is already authenticated.
  useEffect(() => {
    if (isAuthenticated) return
    api.authConfig().then(c => setGoogleClientId(c.googleClientId)).catch(() => {})
  }, [isAuthenticated])

  return (
    <GoogleOAuthProvider clientId={googleClientId ?? ''}>
      <BrowserRouter>
          <div className="flex min-h-screen flex-col bg-gray-50 text-gray-900">
            <Navbar />
            <main className="flex-1">
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/questions" element={<QuestionsPage />} />
                <Route path="/questions/:id" element={<QuestionDetailPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/contributors" element={<ContributorsPage />} />
                <Route path="/contributors/:username" element={<ContributorProfilePage />} />

                {/* Dashboard routes — protected, with sidebar layout */}
                <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                  <Route path="/profile/edit" element={<EditProfilePage />} />
                  <Route path="/submit/manual" element={<ManualSubmissionPage />} />
                  <Route path="/submit/auto" element={<AutoSubmissionPage />} />
                  <Route path="/my/manual-submissions" element={<MyManualSubmissionsPage />} />
                  <Route path="/my/manual-submissions/:id" element={<ManualSubmissionDetailPage />} />
                  <Route path="/my/auto-submissions" element={<MyAutoSubmissionsPage />} />
                  <Route path="/my/auto-submissions/:id" element={<AutoSubmissionDetailPage />} />
                </Route>

                {/* Admin routes — role-guarded, with admin sidebar layout */}
                <Route element={<AdminRoute><AdminLayout /></AdminRoute>}>
                  <Route path="/admin" element={<AdminDashboardPage />} />
                  <Route path="/admin/departments" element={<AdminDepartmentsPage />} />
                  <Route path="/admin/departments/new" element={<AdminDepartmentFormPage />} />
                  <Route path="/admin/departments/:id/edit" element={<AdminDepartmentFormPage />} />
                  <Route path="/admin/courses" element={<AdminCoursesPage />} />
                  <Route path="/admin/courses/new" element={<AdminCourseFormPage />} />
                  <Route path="/admin/courses/:id/edit" element={<AdminCourseFormPage />} />
                  <Route path="/admin/semesters" element={<AdminSemestersPage />} />
                  <Route path="/admin/semesters/new" element={<AdminSemesterFormPage />} />
                  <Route path="/admin/semesters/:id/edit" element={<AdminSemesterFormPage />} />
                  <Route path="/admin/exam-types" element={<AdminExamTypesPage />} />
                  <Route path="/admin/exam-types/new" element={<AdminExamTypeFormPage />} />
                  <Route path="/admin/exam-types/:id/edit" element={<AdminExamTypeFormPage />} />
                  <Route path="/admin/questions" element={<AdminQuestionsPage />} />
                  <Route path="/admin/questions/new" element={<AdminQuestionFormPage />} />
                  <Route path="/admin/questions/:id/edit" element={<AdminQuestionFormPage />} />
                  <Route path="/admin/submissions" element={<AdminSubmissionsPage />} />
                  <Route path="/admin/submissions/new" element={<AdminSubmissionFormPage />} />
                  <Route path="/admin/submissions/:id/edit" element={<AdminSubmissionFormPage />} />
                  <Route path="/admin/manual-submissions" element={<AdminManualSubmissionsPage />} />
                  <Route path="/admin/manual-submissions/:id" element={<AdminManualSubmissionDetailPage />} />
                  <Route path="/admin/users" element={<AdminUsersPage />} />
                  <Route path="/admin/users/:id/edit" element={<AdminUserFormPage />} />
                </Route>
              </Routes>
            </main>
            <Footer />
          </div>
        </BrowserRouter>
    </GoogleOAuthProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
)
