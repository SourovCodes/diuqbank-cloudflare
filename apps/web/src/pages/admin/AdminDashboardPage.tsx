import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  useAdminDepartments, useAdminCourses, useAdminSemesters, useAdminExamTypes,
  useAdminQuestions, useAdminSubmissions, useAdminManualSubmissions, useAdminUsers,
} from '../../hooks/admin'
import { Card, PageHeader, StatusBanner } from '../../components/admin/ui'

function StatCard({ to, label, value, hint }: { to: string; label: string; value?: number; hint: string }) {
  return (
    <Link to={to} className="block">
      <Card className="p-4 transition hover:border-blue-300 hover:shadow-md">
        <p className="text-xs font-semibold uppercase text-gray-400">{label}</p>
        <p className="mt-2 text-2xl font-semibold text-gray-950">{value ?? '-'}</p>
        <p className="mt-1 text-xs text-gray-500">{hint}</p>
      </Card>
    </Link>
  )
}

export function AdminDashboardPage() {
  const { token, user } = useAuth()
  const departments = useAdminDepartments(token)
  const courses = useAdminCourses(token)
  const semesters = useAdminSemesters(token)
  const examTypes = useAdminExamTypes(token)
  const questions = useAdminQuestions(token)
  const submissions = useAdminSubmissions(token)
  const manual = useAdminManualSubmissions(token)
  const users = useAdminUsers(token)
  const pendingReview = useAdminManualSubmissions(token, 1, { status: 'pending_review' })

  const pendingCount = pendingReview.data?.meta.total ?? 0

  return (
    <div>
      <PageHeader title="Admin Dashboard" subtitle={user && `Welcome back, ${user.name}`} />

      {pendingCount > 0 && (
        <Link to="/admin/manual-submissions?status=pending_review" className="mb-5 block">
          <StatusBanner tone="warning">
            {pendingCount} manual submission{pendingCount !== 1 ? 's' : ''} awaiting review
          </StatusBanner>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard to="/admin/departments" label="Departments" value={departments.data?.meta.total} hint="Catalog groups" />
        <StatCard to="/admin/courses" label="Courses" value={courses.data?.meta.total} hint="Course records" />
        <StatCard to="/admin/semesters" label="Semesters" value={semesters.data?.meta.total} hint="Academic terms" />
        <StatCard to="/admin/exam-types" label="Exam Types" value={examTypes.data?.meta.total} hint="Paper categories" />
        <StatCard to="/admin/questions" label="Questions" value={questions.data?.meta.total} hint="Published sets" />
        <StatCard to="/admin/submissions" label="Submissions" value={submissions.data?.meta.total} hint="PDF entries" />
        <StatCard to="/admin/manual-submissions" label="Manual Reviews" value={manual.data?.meta.total} hint="User uploads" />
        <StatCard to="/admin/users" label="Users" value={users.data?.meta.total} hint="Accounts" />
      </div>
    </div>
  )
}
