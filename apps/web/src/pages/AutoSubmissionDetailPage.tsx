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

export function AutoSubmissionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { token } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const numId = id ? Number(id) : null

  const { data: sub, isPending, isError, error } = useAutoSubmission(token, numId)
  useDocumentTitle('Auto Submission')

  const [confirming, setConfirming] = useState(false)
  const [reprocessing, setReprocessing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleConfirm() {
    if (!token || numId === null) return
    setConfirming(true)
    try {
      await api.confirmAutoSubmission(token, numId)
      queryClient.invalidateQueries({ queryKey: ['auto-submission', numId] })
      queryClient.invalidateQueries({ queryKey: ['my-auto-submissions'] })
      toastSuccess('Submission confirmed.')
    } catch (err) {
      toastError(err, 'Confirmation failed.')
    } finally {
      setConfirming(false)
    }
  }

  async function handleReprocess() {
    if (!token || numId === null) return
    setReprocessing(true)
    try {
      await api.reprocessAutoSubmission(token, numId)
      queryClient.invalidateQueries({ queryKey: ['auto-submission', numId] })
      toastSuccess('Reprocessing started.')
    } catch (err) {
      toastError(err, 'Reprocess failed.')
    } finally {
      setReprocessing(false)
    }
  }

  async function handleDelete() {
    if (!token || numId === null || !window.confirm('Delete this submission? This cannot be undone.')) return
    setDeleting(true)
    try {
      await api.deleteAutoSubmission(token, numId)
      queryClient.invalidateQueries({ queryKey: ['my-auto-submissions'] })
      toastSuccess('Submission deleted.')
      navigate('/my/auto-submissions')
    } catch (err) {
      toastError(err, 'Delete failed.')
      setDeleting(false)
    }
  }

  if (isPending) return <div className="flex justify-center py-16"><Spinner /></div>
  if (isError && isNotFound(error)) return <NotFoundPage />
  if (!sub) {
    return (
      <div>
        <ErrorMessage message="Submission not found or failed to load." />
        <Link to="/my/auto-submissions" className="mt-4 inline-block text-sm text-blue-600 hover:underline">← Back</Link>
      </div>
    )
  }

  const ai = sub.aiResult
  const canConfirm = sub.status === 'awaiting_confirmation' && ai?.isAcceptable
  const canReprocess = sub.status === 'awaiting_confirmation' || sub.status === 'failed'
  const canDelete = sub.status !== 'confirmed'

  return (
    <div>
      <div className="mb-6">
        <Link to="/my/auto-submissions" className="text-sm text-blue-600 hover:underline">← My Auto Submissions</Link>
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
            {sub.status === 'processing' && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Spinner className="h-4 w-4" /> AI is extracting metadata…
              </div>
            )}
            {sub.status === 'confirmed' && sub.submissionId && (
              <p className="text-sm text-gray-500">
                Successfully confirmed as submission #{sub.submissionId}.
              </p>
            )}
            {sub.status === 'failed' && (
              <p className="text-sm text-red-600">{sub.errorMessage ?? 'Processing failed.'}</p>
            )}
          </div>

          {/* AI extracted metadata */}
          {ai && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">AI Extracted</h2>
              {!ai.isAcceptable ? (
                <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
                  <strong>Not acceptable:</strong> {ai.rejectionReason}
                </div>
              ) : (
                <dl className="space-y-2 text-sm">
                  {ai.courseName && (
                    <div>
                      <dt className="text-xs text-gray-400">Course</dt>
                      <dd className="font-medium text-gray-900">{ai.courseName}</dd>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {ai.departmentShortName && <Badge label={ai.departmentShortName} variant="blue" />}
                    {ai.semesterName && <Badge label={ai.semesterName} variant="gray" />}
                    {ai.examTypeName && <Badge label={ai.examTypeName} variant="green" />}
                  </div>
                  {(ai.section || ai.batch) && (
                    <div className="flex gap-4 pt-1 text-xs text-gray-500">
                      {ai.section && <span>Section: {ai.section}</span>}
                      {ai.batch && <span>Batch: {ai.batch}</span>}
                    </div>
                  )}
                </dl>
              )}
              {ai.reasoning && (
                <details className="mt-3 rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
                  <summary className="cursor-pointer font-medium text-gray-600">AI reasoning</summary>
                  <p className="mt-2 leading-relaxed">{ai.reasoning}</p>
                </details>
              )}
            </div>
          )}

          {/* File info */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">File</h2>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Size</dt>
                <dd className="font-medium text-gray-800">{formatBytes(sub.fileSize)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Uploaded</dt>
                <dd className="font-medium text-gray-800">{formatDate(sub.createdAt)}</dd>
              </div>
            </dl>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {canConfirm && (
              <button onClick={handleConfirm} disabled={confirming}
                className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50">
                {confirming ? 'Confirming…' : 'Confirm & Submit'}
              </button>
            )}
            {canReprocess && (
              <button onClick={handleReprocess} disabled={reprocessing}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50">
                {reprocessing ? 'Reprocessing…' : 'Reprocess with AI'}
              </button>
            )}
            {canDelete && (
              <button onClick={handleDelete} disabled={deleting}
                className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-100 transition disabled:opacity-50">
                {deleting ? 'Deleting…' : 'Delete Submission'}
              </button>
            )}
          </div>
        </div>

        {/* Right: PDF viewer */}
        <div className="flex-1 min-w-0">
          {sub.pdfUrl ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Uploaded PDF</span>
                <a href={sub.pdfUrl} target="_blank" rel="noreferrer noopener"
                  className="font-medium text-blue-600 hover:underline">Open in new tab ↗</a>
              </div>
              <iframe
                src={sub.pdfUrl}
                title="Auto submission PDF"
                className="w-full rounded-xl border border-gray-200 shadow-sm"
                style={{ height: 'calc(100vh - 260px)', minHeight: '500px' }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 text-sm text-gray-400"
              style={{ minHeight: '300px' }}>
              {sub.status === 'processing'
                ? 'PDF will appear once processing is complete.'
                : 'No PDF available.'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
