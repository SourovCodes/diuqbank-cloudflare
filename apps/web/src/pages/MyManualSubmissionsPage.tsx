import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { useMyManualSubmissions } from '../hooks/useMyManualSubmissions'
import { api } from '../lib/api'
import { Badge } from '../components/ui/Badge'
import { Pagination } from '../components/ui/Pagination'
import { Spinner } from '../components/ui/Spinner'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import type { ManualSubmission } from '@diuqbank/shared/types'

function formatDate(unix: number) {
  return new Date(unix * 1000).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

const statusVariant = (s: ManualSubmission['status']) =>
  s === 'approved' ? 'green' : s === 'rejected' ? 'red' : 'yellow'

const statusLabel = (s: ManualSubmission['status']) =>
  s === 'approved' ? 'Approved' : s === 'rejected' ? 'Rejected' : 'Pending Review'

function SubmissionCard({ sub, onDeleted }: { sub: ManualSubmission; onDeleted: () => void }) {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (!token || !window.confirm('Delete this submission? This cannot be undone.')) return
    setDeleting(true)
    setError(null)
    try {
      await api.deleteManualSubmission(token, sub.id)
      onDeleted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.')
      setDeleting(false)
    }
  }

  return (
    <div
      className="group cursor-pointer rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm transition hover:border-blue-300 hover:shadow-md"
      onClick={() => navigate(`/my/manual-submissions/${sub.id}`)}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2 min-w-0">
          <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700">{sub.course.name}</p>
          <div className="flex flex-wrap gap-1.5">
            <Badge label={sub.department.shortName} variant="blue" />
            <Badge label={sub.semester.name} variant="gray" />
            <Badge label={sub.examType.name} variant="green" />
          </div>
          <p className="text-xs text-gray-500">{formatDate(sub.createdAt)}</p>
          {sub.rejectedReason && (
            <p className="text-xs text-red-600">Reason: {sub.rejectedReason}</p>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          <Badge label={statusLabel(sub.status)} variant={statusVariant(sub.status)} />
          <span className="text-xs font-medium text-blue-600 group-hover:underline">View details →</span>
          <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
            {sub.questionId && (
              <Link to={`/questions/${sub.questionId}`} className="text-xs font-medium text-gray-500 hover:underline">
                Question ↗
              </Link>
            )}
            {sub.status === 'pending_review' && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs font-medium text-red-500 hover:text-red-700 hover:underline disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function MyManualSubmissionsPage() {
  const { token } = useAuth()
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()
  const { data, isPending, isError } = useMyManualSubmissions(token, page)

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['my-manual-submissions'] })
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Manual Submissions</h1>
          {data && (
            <p className="mt-1 text-sm text-gray-500">
              {data.meta.total} submission{data.meta.total !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <Link
          to="/submit/manual"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
        >
          + New Submission
        </Link>
      </div>

      {isPending ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : isError ? (
        <ErrorMessage message="Failed to load your submissions." />
      ) : data?.data.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-16 text-center">
          <p className="text-sm text-gray-500">You haven't submitted any papers yet.</p>
          <Link to="/submit/manual" className="mt-3 inline-block text-sm font-medium text-blue-600 hover:underline">
            Submit your first paper →
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {data?.data.map(sub => (
              <SubmissionCard key={sub.id} sub={sub} onDeleted={invalidate} />
            ))}
          </div>
          {data?.meta && <Pagination meta={data.meta} onPageChange={setPage} />}
        </>
      )}
    </div>
  )
}
