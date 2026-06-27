import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { useManualSubmission } from '../hooks/useManualSubmission'
import { api, isNotFound } from '../lib/api'
import { Badge } from '../components/ui/Badge'
import { Spinner } from '../components/ui/Spinner'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { NotFoundPage } from './NotFoundPage'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { toastError, toastSuccess } from '../lib/toast'
import type { ManualSubmission } from '@diuqbank/shared/types'
import { formatDate } from '@diuqbank/shared'

const statusVariant = (s: ManualSubmission['status']) =>
  s === 'approved' ? 'green' : s === 'rejected' ? 'red' : 'yellow'

const statusLabel = (s: ManualSubmission['status']) =>
  s === 'approved' ? 'Approved' : s === 'rejected' ? 'Rejected' : 'Pending Review'

export function ManualSubmissionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { token } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const numId = id ? Number(id) : null

  const { data: sub, isPending, isError, error } = useManualSubmission(token, numId)
  useDocumentTitle('Manual Submission')

  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!token || numId === null || !window.confirm('Delete this submission? This cannot be undone.')) return
    setDeleting(true)
    try {
      await api.deleteManualSubmission(token, numId)
      queryClient.invalidateQueries({ queryKey: ['my-manual-submissions'] })
      toastSuccess('Submission deleted.')
      navigate('/my/manual-submissions')
    } catch (err) {
      toastError(err, 'Delete failed.')
      setDeleting(false)
    }
  }

  if (isPending) return <div className="flex justify-center py-16"><Spinner /></div>
  if (isError && isNotFound(error)) return <NotFoundPage />
  if (isError || !sub) {
    return (
      <div>
        <ErrorMessage message="Submission not found or failed to load." />
        <Link to="/my/manual-submissions" className="mt-4 inline-block text-sm text-blue-600 hover:underline">← Back</Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link to="/my/manual-submissions" className="text-sm text-blue-600 hover:underline">← My Manual Submissions</Link>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Left: metadata + actions */}
        <div className="flex flex-col gap-4 lg:w-72 lg:shrink-0">
          {/* Status card */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Status</h2>
              <Badge label={statusLabel(sub.status)} variant={statusVariant(sub.status)} />
            </div>
            {sub.status === 'pending_review' && (
              <p className="text-sm text-gray-500">Your submission is awaiting admin review.</p>
            )}
            {sub.status === 'approved' && (
              <p className="text-sm text-gray-500">
                Your submission has been approved.
                {sub.questionId && (
                  <> <Link to={`/questions/${sub.questionId}`} className="font-medium text-blue-600 hover:underline">View question →</Link></>
                )}
              </p>
            )}
            {sub.status === 'rejected' && sub.rejectedReason && (
              <p className="text-sm text-red-600">Reason: {sub.rejectedReason}</p>
            )}
          </div>

          {/* Details card */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Details</h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs text-gray-400">Course</dt>
                <dd className="font-medium text-gray-900">{sub.course.name}</dd>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <Badge label={sub.department.shortName} variant="blue" />
                <Badge label={sub.semester.name} variant="gray" />
                <Badge label={sub.examType.name} variant="green" />
              </div>
              <div className="pt-1">
                <dt className="text-xs text-gray-400">Submitted</dt>
                <dd className="font-medium text-gray-900">{formatDate(sub.createdAt)}</dd>
              </div>
            </dl>
          </div>

          {/* Actions */}
          {sub.status === 'pending_review' && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-100 transition disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Delete Submission'}
            </button>
          )}
        </div>

        {/* Right: PDF viewer */}
        <div className="flex-1 min-w-0">
          {sub.pdfUrl ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Question paper</span>
                <a href={sub.pdfUrl} target="_blank" rel="noreferrer noopener"
                  className="font-medium text-blue-600 hover:underline">Open in new tab ↗</a>
              </div>
              <iframe
                src={sub.pdfUrl}
                title="Submitted question paper"
                className="w-full rounded-xl border border-gray-200 shadow-sm"
                style={{ height: 'calc(100vh - 260px)', minHeight: '500px' }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 text-sm text-gray-400"
              style={{ minHeight: '300px' }}>
              {sub.status === 'pending_review'
                ? 'PDF will be available after admin review.'
                : 'No PDF available for this submission.'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
