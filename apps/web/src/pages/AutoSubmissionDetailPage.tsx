import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { useAutoSubmission } from '../hooks/useAutoSubmission'
import { api, isNotFound } from '../lib/api'
import { Badge } from '../components/ui/Badge'
import { Spinner } from '../components/ui/Spinner'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { NotFoundPage } from './NotFoundPage'
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

export function AutoSubmissionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { token } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const numId = id ? Number(id) : null

  const { data: sub, isPending, isError, error } = useAutoSubmission(token, numId)
  useDocumentTitle('Auto Submission')

  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!token || numId === null || !window.confirm('Delete this auto-submission? This cannot be undone.')) return
    setDeleting(true)
    try {
      await api.deleteAutoSubmission(token, numId)
      queryClient.invalidateQueries({ queryKey: ['my-auto-submissions'] })
      toastSuccess('Auto-submission deleted.')
      navigate('/my/auto-submissions')
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
        <ErrorMessage message="Auto submission not found or failed to load." />
        <Link to="/my/auto-submissions" className="mt-4 inline-block text-sm text-blue-600 hover:underline">← Back</Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link to="/my/auto-submissions" className="text-sm text-blue-600 hover:underline">← My Auto Submissions</Link>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Left: status + metadata + actions */}
        <div className="flex flex-col gap-4 lg:w-72 lg:shrink-0">
          {/* Status card */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Status</h2>
              <Badge label={statusLabel(sub.status)} variant={statusVariant(sub.status)} />
            </div>
            {sub.status === 'processing' && (
              <p className="text-sm text-gray-500">The AI is reading your paper and extracting its details. This usually takes under a minute.</p>
            )}
            {sub.status === 'needs_review' && (
              <p className="text-sm text-gray-500">The AI wasn't confident enough to publish automatically, so an admin will review it shortly.</p>
            )}
            {sub.status === 'published' && (
              <p className="text-sm text-gray-500">
                Published to the question bank.
                {sub.questionId && (
                  <> <Link to={`/questions/${sub.questionId}`} className="font-medium text-blue-600 hover:underline">View question →</Link></>
                )}
              </p>
            )}
            {sub.status === 'rejected' && (
              <p className="text-sm text-red-600">{sub.rejectedReason ? `Reason: ${sub.rejectedReason}` : 'This submission was rejected.'}</p>
            )}
            {sub.status === 'failed' && (
              <p className="text-sm text-red-600">Processing failed. You can delete this and try uploading again.</p>
            )}
          </div>

          {/* AI reasoning card */}
          {sub.aiReasoning && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">What the AI saw</h2>
              <p className="whitespace-pre-wrap text-sm text-gray-700">{sub.aiReasoning}</p>
            </div>
          )}

          {/* Extracted details card */}
          {(sub.courseName || sub.departmentShortName || sub.semesterName || sub.examTypeName) && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Extracted details</h2>
              <dl className="space-y-2 text-sm">
                {sub.courseName && (
                  <div>
                    <dt className="text-xs text-gray-400">Course</dt>
                    <dd className="font-medium text-gray-900">{sub.courseName}</dd>
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {sub.departmentShortName && <Badge label={sub.departmentShortName} variant="blue" />}
                  {sub.semesterName && <Badge label={sub.semesterName} variant="gray" />}
                  {sub.examTypeName && <Badge label={sub.examTypeName} variant="green" />}
                </div>
                <div className="pt-1">
                  <dt className="text-xs text-gray-400">Uploaded</dt>
                  <dd className="font-medium text-gray-900">{formatDate(sub.createdAt)}</dd>
                </div>
              </dl>
            </div>
          )}

          {/* Actions */}
          {sub.status !== 'published' && (
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
                title="Uploaded question paper"
                className="w-full rounded-xl border border-gray-200 shadow-sm"
                style={{ height: 'calc(100vh - 260px)', minHeight: '500px' }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 text-sm text-gray-400"
              style={{ minHeight: '300px' }}>
              No PDF available for this submission.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
