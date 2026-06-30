import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { useMyAutoSubmissions } from '../hooks/useMyAutoSubmissions'
import { api } from '../lib/api'
import { Badge } from '../components/ui/Badge'
import { Pagination } from '../components/ui/Pagination'
import { SkeletonList } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { toastError, toastSuccess } from '../lib/toast'
import type { AutoSubmission } from '@diuqbank/shared/types'
import { formatDate } from '@diuqbank/shared'

type Status = AutoSubmission['status']

const statusVariant = (s: Status) =>
  s === 'published' ? 'green' : s === 'rejected' || s === 'failed' ? 'red' : s === 'needs_review' ? 'blue' : 'yellow'

const statusLabel = (s: Status) =>
  s === 'published' ? 'Published'
    : s === 'rejected' ? 'Rejected'
    : s === 'failed' ? 'Failed'
    : s === 'needs_review' ? 'In Review'
    : 'Processing'

function SubmissionCard({ sub, onDeleted }: { sub: AutoSubmission; onDeleted: () => void }) {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!token || !window.confirm('Delete this auto-submission? This cannot be undone.')) return
    setDeleting(true)
    try {
      await api.deleteAutoSubmission(token, sub.id)
      toastSuccess('Auto-submission deleted.')
      onDeleted()
    } catch (err) {
      toastError(err, 'Delete failed.')
      setDeleting(false)
    }
  }

  return (
    <div
      className="group cursor-pointer rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm transition hover:border-blue-300 hover:shadow-md"
      onClick={() => navigate(`/my/auto-submissions/${sub.id}`)}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2 min-w-0">
          <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700">
            {sub.courseName ?? (sub.status === 'processing' ? 'Reading your paper…' : 'Untitled paper')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {sub.departmentShortName && <Badge label={sub.departmentShortName} variant="blue" />}
            {sub.semesterName && <Badge label={sub.semesterName} variant="gray" />}
            {sub.examTypeName && <Badge label={sub.examTypeName} variant="green" />}
          </div>
          <p className="text-xs text-gray-500">{formatDate(sub.createdAt)}</p>
          {sub.status === 'rejected' && sub.rejectedReason && (
            <p className="text-xs text-red-600">Reason: {sub.rejectedReason}</p>
          )}
          {sub.status === 'failed' && (
            <p className="text-xs text-red-600">Processing failed. Open for details.</p>
          )}
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
            {sub.status !== 'published' && (
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

export function MyAutoSubmissionsPage() {
  useDocumentTitle('My Auto Submissions')
  const { token } = useAuth()
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()
  const { data, isPending, isError } = useMyAutoSubmissions(token, page)

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['my-auto-submissions'] })
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Auto Submissions</h1>
          {data && (
            <p className="mt-1 text-sm text-gray-500">
              {data.meta.total} submission{data.meta.total !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <Link
          to="/submit/auto"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
        >
          + New Auto Submission
        </Link>
      </div>

      {isPending ? (
        <SkeletonList count={5} />
      ) : isError ? (
        <ErrorMessage message="Failed to load your auto submissions." />
      ) : data?.data.length === 0 ? (
        <EmptyState
          message="You haven't uploaded any papers for AI processing yet."
          action={
            <Link to="/submit/auto" className="text-sm font-medium text-blue-600 hover:underline">
              Upload your first paper →
            </Link>
          }
        />
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
