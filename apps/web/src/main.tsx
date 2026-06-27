import { StrictMode, useState, useEffect, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { Toaster } from 'sonner'
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
import { NotFoundPage } from './pages/NotFoundPage'
import { ErrorBoundary } from './components/ErrorBoundary'

// Admin pages are lazy-loaded so their code splits into a separate chunk that
// only admins fetch — keeps the main bundle small for regular visitors.
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })))
const AdminDepartmentsPage = lazy(() => import('./pages/admin/AdminDepartmentsPage').then(m => ({ default: m.AdminDepartmentsPage })))
const AdminDepartmentFormPage = lazy(() => import('./pages/admin/AdminDepartmentFormPage').then(m => ({ default: m.AdminDepartmentFormPage })))
const AdminCoursesPage = lazy(() => import('./pages/admin/AdminCoursesPage').then(m => ({ default: m.AdminCoursesPage })))
const AdminCourseFormPage = lazy(() => import('./pages/admin/AdminCourseFormPage').then(m => ({ default: m.AdminCourseFormPage })))
const AdminSemestersPage = lazy(() => import('./pages/admin/AdminSemestersPage').then(m => ({ default: m.AdminSemestersPage })))
const AdminSemesterFormPage = lazy(() => import('./pages/admin/AdminSemesterFormPage').then(m => ({ default: m.AdminSemesterFormPage })))
const AdminExamTypesPage = lazy(() => import('./pages/admin/AdminExamTypesPage').then(m => ({ default: m.AdminExamTypesPage })))
const AdminExamTypeFormPage = lazy(() => import('./pages/admin/AdminExamTypeFormPage').then(m => ({ default: m.AdminExamTypeFormPage })))
const AdminQuestionsPage = lazy(() => import('./pages/admin/AdminQuestionsPage').then(m => ({ default: m.AdminQuestionsPage })))
const AdminQuestionFormPage = lazy(() => import('./pages/admin/AdminQuestionFormPage').then(m => ({ default: m.AdminQuestionFormPage })))
const AdminSubmissionsPage = lazy(() => import('./pages/admin/AdminSubmissionsPage').then(m => ({ default: m.AdminSubmissionsPage })))
const AdminSubmissionFormPage = lazy(() => import('./pages/admin/AdminSubmissionFormPage').then(m => ({ default: m.AdminSubmissionFormPage })))
const AdminManualSubmissionsPage = lazy(() => import('./pages/admin/AdminManualSubmissionsPage').then(m => ({ default: m.AdminManualSubmissionsPage })))
const AdminManualSubmissionDetailPage = lazy(() => import('./pages/admin/AdminManualSubmissionDetailPage').then(m => ({ default: m.AdminManualSubmissionDetailPage })))
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage').then(m => ({ default: m.AdminUsersPage })))
const AdminUserFormPage = lazy(() => import('./pages/admin/AdminUserFormPage').then(m => ({ default: m.AdminUserFormPage })))
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
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:shadow focus:ring-2 focus:ring-blue-500"
            >
              Skip to content
            </a>
            <Navbar />
            <main id="main-content" className="flex-1">
              <ErrorBoundary>
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

                {/* Catch-all 404 */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
              </ErrorBoundary>
            </main>
            <Footer />
            <Toaster richColors closeButton position="top-center" />
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
