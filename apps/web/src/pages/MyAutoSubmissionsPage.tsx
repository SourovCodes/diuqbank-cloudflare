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
import { formatBytes, formatDate } from '@diuqbank/shared'

const statusVariant = (s: AutoSubmission['status']) => {
  if (s === 'confirmed') return 'green'
  if (s === 'failed') return 'red'
  if (s === 'awaiting_confirmation') return 'yellow'
  return 'gray'
}

const statusLabel = (s: AutoSubmission['status']) => {
  if (s === 'confirmed') return 'Confirmed'
  if (s === 'failed') return 'Failed'
  if (s === 'awaiting_confirmation') return 'Awaiting Confirmation'
  return 'Processing'
}

function SubmissionCard({ submission, onMutated }: { submission: AutoSubmission; onMutated: () => void }) {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const [reprocessing, setReprocessing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const ai = submission.aiResult
  const canDelete = submission.status !== 'confirmed'
  const canReprocess = submission.status === 'awaiting_confirmation' || submission.status === 'failed'
  const canConfirm = submission.status === 'awaiting_confirmation' && ai?.isAcceptable

  async function handleConfirm() {
    if (!token) return
    setConfirming(true)
    try {
      await api.confirmAutoSubmission(token, submission.id)
      toastSuccess('Submission confirmed.')
      onMutated()
    } catch (err) {
      toastError(err, 'Confirmation failed.')
      setConfirming(false)
    }
  }

  async function handleReprocess() {
    if (!token) return
    setReprocessing(true)
    try {
      await api.reprocessAutoSubmission(token, submission.id)
      toastSuccess('Reprocessing started.')
      onMutated()
    } catch (err) {
      toastError(err, 'Reprocess failed.')
      setReprocessing(false)
    }
  }

  async function handleDelete() {
    if (!token || !window.confirm('Delete this submission? This cannot be undone.')) return
    setDeleting(true)
    try {
      await api.deleteAutoSubmission(token, submission.id)
      toastSuccess('Submission deleted.')
      onMutated()
    } catch (err) {
      toastError(err, 'Delete failed.')
      setDeleting(false)
    }
  }

  return (
    <div
      className="group cursor-pointer rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm transition hover:border-blue-300 hover:shadow-md"
      onClick={() => navigate(`/my/auto-submissions/${submission.id}`)}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2 min-w-0">
          {ai ? (
            <>
              {!ai.isAcceptable && (
                <p className="text-xs font-medium text-red-600">Not acceptable: {ai.rejectionReason}</p>
              )}
              {ai.courseName && (
                <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700">{ai.courseName}</p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {ai.departmentShortName && <Badge label={ai.departmentShortName} variant="blue" />}
                {ai.semesterName && <Badge label={ai.semesterName} variant="gray" />}
                {ai.examTypeName && <Badge label={ai.examTypeName} variant="green" />}
              </div>
            </>
          ) : (
            <p className="text-sm italic text-gray-400">
              {submission.status === 'processing' ? 'AI extraction in progress…' : 'No AI result'}
            </p>
          )}
          <div className="flex flex-wrap gap-x-4 text-xs text-gray-500">
            <span>{formatDate(submission.createdAt)}</span>
            <span>{formatBytes(submission.fileSize)}</span>
            {submission.submissionId && <span>Submission #{submission.submissionId}</span>}
          </div>
          {submission.errorMessage && <p className="text-xs text-red-600">{submission.errorMessage}</p>}
        </div>

        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          <Badge label={statusLabel(submission.status)} variant={statusVariant(submission.status)} />
          <span className="text-xs font-medium text-blue-600 group-hover:underline">View details →</span>
          <div className="flex flex-wrap gap-2" onClick={e => e.stopPropagation()}>
            {canConfirm && (
              <button onClick={handleConfirm} disabled={confirming}
                className="rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50">
                {confirming ? 'Confirming…' : 'Confirm'}
              </button>
            )}
            {canReprocess && (
              <button onClick={handleReprocess} disabled={reprocessing}
                className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50">
                {reprocessing ? 'Reprocessing…' : 'Reprocess'}
              </button>
            )}
            {canDelete && (
              <button onClick={handleDelete} disabled={deleting}
                className="text-xs font-medium text-red-500 hover:text-red-700 hover:underline disabled:opacity-50">
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
        <Link to="/submit/auto"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition">
          + New Submission
        </Link>
      </div>

      {isPending ? (
        <SkeletonList count={5} />
      ) : isError ? (
        <ErrorMessage message="Failed to load your submissions." />
      ) : data?.data.length === 0 ? (
        <EmptyState
          message="You haven't made any auto submissions yet."
          action={
            <Link to="/submit/auto" className="text-sm font-medium text-blue-600 hover:underline">
              Submit your first paper →
            </Link>
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {data?.data.map(s => <SubmissionCard key={s.id} submission={s} onMutated={invalidate} />)}
          </div>
          {data?.meta && <Pagination meta={data.meta} onPageChange={setPage} />}
        </>
      )}
    </div>
  )
}
