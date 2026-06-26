import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  useAdminDepartments, useAdminCourses, useAdminSemesters, useAdminExamTypes,
  useAdminQuestions, useAdminSubmissions, useAdminManualSubmissions, useAdminUsers,
} from '../../hooks/admin'
import { PageHeader, Card } from '../../components/admin/ui'

function StatCard({ to, icon, label, value }: { to: string; icon: string; label: string; value?: number }) {
  return (
    <Link to={to}>
      <Card className="p-5 transition hover:border-blue-300 hover:shadow-md">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
          </div>
        </div>
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

  return (
    <div>
      <PageHeader title="Admin Dashboard" subtitle={user && `Welcome back, ${user.name}`} />

      {(pendingReview.data?.meta.total ?? 0) > 0 && (
        <Link to="/admin/manual-submissions?status=pending_review">
          <div className="mb-6 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm font-medium text-yellow-800 transition hover:bg-yellow-100">
            🛡️ {pendingReview.data!.meta.total} submission{pendingReview.data!.meta.total !== 1 ? 's' : ''} awaiting review →
          </div>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard to="/admin/departments" icon="🏛️" label="Departments" value={departments.data?.meta.total} />
        <StatCard to="/admin/courses" icon="📚" label="Courses" value={courses.data?.meta.total} />
        <StatCard to="/admin/semesters" icon="🗓️" label="Semesters" value={semesters.data?.meta.total} />
        <StatCard to="/admin/exam-types" icon="📝" label="Exam Types" value={examTypes.data?.meta.total} />
        <StatCard to="/admin/questions" icon="❓" label="Questions" value={questions.data?.meta.total} />
        <StatCard to="/admin/submissions" icon="📎" label="Submissions" value={submissions.data?.meta.total} />
        <StatCard to="/admin/manual-submissions" icon="🛡️" label="Manual Subs" value={manual.data?.meta.total} />
        <StatCard to="/admin/users" icon="👥" label="Users" value={users.data?.meta.total} />
      </div>
    </div>
  )
}
