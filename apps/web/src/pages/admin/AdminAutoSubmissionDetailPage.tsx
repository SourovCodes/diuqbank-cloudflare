import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { api, isNotFound } from '../../lib/api'
import { toastError, toastSuccess } from '../../lib/toast'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { NotFoundPage } from '../NotFoundPage'
import { Badge } from '../../components/ui/Badge'
import {
  Button,
  Card,
  ConfirmDialog,
  Field,
  LoadingState,
  PageHeader,
  StatusBanner,
  TextInput,
} from '../../components/admin/ui'
import type { AutoSubmissionStatus } from '@diuqbank/shared/types'

const statusVariant = (s: AutoSubmissionStatus) =>
  s === 'published' ? 'green' : s === 'rejected' || s === 'failed' ? 'red' : s === 'needs_review' ? 'blue' : 'yellow'
const statusLabel = (s: AutoSubmissionStatus) =>
  s === 'published' ? 'Published'
    : s === 'rejected' ? 'Rejected'
    : s === 'failed' ? 'Failed'
    : s === 'needs_review' ? 'Needs Review'
    : 'Processing'

export function AdminAutoSubmissionDetailPage() {
  const { token } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isPending, isError, error: loadError } = useQuery({
    queryKey: ['admin-auto-submissions', 'detail', Number(id)],
    queryFn: () => api.adminAutoSubmission(token!, Number(id)),
    enabled: !!token,
    // Poll while the AI pipeline is still running so the page fills in on its own.
    refetchInterval: query => (query.state.data?.status === 'processing' ? 3000 : false),
  })

  const [fields, setFields] = useState({
    departmentName: '', departmentShortName: '', courseName: '', semesterName: '', examTypeName: '', section: '', batch: '',
  })
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState<'save' | 'approve' | 'reject' | 'delete' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [approveOpen, setApproveOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => {
    if (data) {
      setFields({
        departmentName: data.departmentName ?? '',
        departmentShortName: data.departmentShortName ?? '',
        courseName: data.courseName ?? '',
        semesterName: data.semesterName ?? '',
        examTypeName: data.examTypeName ?? '',
        section: data.section ?? '',
        batch: data.batch ?? '',
      })
    }
  }, [data])

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: ['admin-auto-submissions'] })
  }

  async function handleSave() {
    if (!token) return
    setBusy('save')
    setError(null)
    try {
      await api.updateAutoSubmission(token, Number(id), fields)
      await invalidate()
      toastSuccess('Metadata saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.')
      toastError(err, 'Save failed.')
    } finally {
      setBusy(null)
    }
  }

  async function confirmApprove() {
    if (!token) return
    setBusy('approve')
    setError(null)
    try {
      await api.approveAutoSubmission(token, Number(id))
      await invalidate()
      toastSuccess('Auto submission approved.')
      navigate('/admin/auto-submissions')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approve failed.')
      toastError(err, 'Approve failed.')
      setBusy(null)
    }
  }

  async function confirmDelete() {
    if (!token) return
    setBusy('delete')
    setError(null)
    try {
      await api.adminDeleteAutoSubmission(token, Number(id))
      await invalidate()
      toastSuccess('Auto submission deleted.')
      navigate('/admin/auto-submissions')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.')
      toastError(err, 'Delete failed.')
      setBusy(null)
    }
  }

  async function handleReject() {
    if (!token) return
    if (!reason.trim()) {
      setError('A rejection reason is required.')
      toastError(new Error('A rejection reason is required.'), 'Reject failed.')
      return
    }
    setBusy('reject')
    setError(null)
    try {
      await api.rejectAutoSubmission(token, Number(id), reason.trim())
      await invalidate()
      toastSuccess('Auto submission rejected.')
      navigate('/admin/auto-submissions')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reject failed.')
      toastError(err, 'Reject failed.')
      setBusy(null)
    }
  }

  if (isPending) return <LoadingState label="Loading auto submission" />
  if (isError && isNotFound(loadError)) return <NotFoundPage />
  if (isError || !data) return <ErrorMessage message="Failed to load auto submission." />

  // Published rows are locked. Everything else (processing/needs_review/rejected/
  // failed) can be edited, approved, rejected, and deleted — mirrors the API.
  const isPublished = data.status === 'published'
  const editable = !isPublished

  return (
    <div>
      <PageHeader
        title={`Auto Submission #${data.id}`}
        subtitle={`Uploaded by @${data.contributor.username}`}
        action={<Badge label={statusLabel(data.status)} variant={statusVariant(data.status)} />}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <Link to="/admin/auto-submissions" className="font-medium text-gray-600 hover:text-gray-950 hover:underline">Back to auto submissions</Link>
        {data.questionId && (
          <Link to={`/questions/${data.questionId}`} className="font-medium text-blue-600 hover:underline">
            Published question #{data.questionId}
          </Link>
        )}
      </div>

      {data.status === 'processing' && (
        <div className="mb-4">
          <StatusBanner tone="info">The AI is still processing this upload. Details will appear automatically.</StatusBanner>
        </div>
      )}
      {data.status === 'rejected' && data.rejectedReason && (
        <div className="mb-4">
          <StatusBanner tone="danger">Rejected: {data.rejectedReason}</StatusBanner>
        </div>
      )}
      {data.status === 'failed' && (
        <div className="mb-4">
          <StatusBanner tone="danger">Processing failed{data.processingError ? `: ${data.processingError}` : ''}.</StatusBanner>
        </div>
      )}
      {data.questionId && (
        <div className="mb-4">
          <StatusBanner tone="success">This submission has been published and linked to the question bank.</StatusBanner>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="min-h-[520px] overflow-hidden">
          {data.pdfUrl ? (
            <iframe
              src={data.pdfUrl}
              title="Auto submission paper"
              className="h-[calc(100vh-210px)] min-h-[520px] w-full bg-white"
            />
          ) : (
            <div className="flex min-h-[520px] items-center justify-center bg-gray-50 p-8 text-center text-sm text-gray-500">
              No PDF attached.
            </div>
          )}
        </Card>

        <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          {data.aiReasoning && (
            <Card className="p-5">
              <h2 className="mb-1 text-sm font-semibold text-gray-950">AI reasoning</h2>
              <p className="whitespace-pre-wrap text-sm text-gray-700">{data.aiReasoning}</p>
              {data.isAcceptable === false && (
                <p className="mt-2 text-xs font-medium text-amber-600">The AI flagged this paper as not acceptable.</p>
              )}
            </Card>
          )}

          {data.extraContext && (
            <Card className="p-5">
              <h2 className="mb-1 text-sm font-semibold text-gray-950">Uploader's context</h2>
              <p className="whitespace-pre-wrap text-sm text-gray-700">{data.extraContext}</p>
            </Card>
          )}

          <Card className="p-5">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-gray-950">Metadata</h2>
              <p className="mt-1 text-xs text-gray-500">Correct the AI's extraction before approving. Approval find-or-creates these and publishes the paper.</p>
            </div>
            <div className="space-y-3">
              <Field label="Department"><TextInput value={fields.departmentName} onChange={e => setFields(f => ({ ...f, departmentName: e.target.value }))} disabled={!editable} /></Field>
              <Field label="Department Short Name"><TextInput value={fields.departmentShortName} onChange={e => setFields(f => ({ ...f, departmentShortName: e.target.value }))} disabled={!editable} /></Field>
              <Field label="Course"><TextInput value={fields.courseName} onChange={e => setFields(f => ({ ...f, courseName: e.target.value }))} disabled={!editable} /></Field>
              <Field label="Semester"><TextInput value={fields.semesterName} onChange={e => setFields(f => ({ ...f, semesterName: e.target.value }))} disabled={!editable} /></Field>
              <Field label="Exam Type"><TextInput value={fields.examTypeName} onChange={e => setFields(f => ({ ...f, examTypeName: e.target.value }))} disabled={!editable} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Section"><TextInput value={fields.section} onChange={e => setFields(f => ({ ...f, section: e.target.value }))} disabled={!editable} /></Field>
                <Field label="Batch"><TextInput value={fields.batch} onChange={e => setFields(f => ({ ...f, batch: e.target.value }))} disabled={!editable} /></Field>
              </div>

              {editable && (
                <Button type="button" variant="secondary" onClick={handleSave} disabled={busy !== null} className="w-full">
                  {busy === 'save' ? 'Saving...' : 'Save metadata'}
                </Button>
              )}
            </div>
          </Card>

          {editable && (
            <Card className="p-5">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-gray-950">Review decision</h2>
                <p className="mt-1 text-xs text-gray-500">Approval publishes the paper into the public question bank.</p>
              </div>
              <Button
                type="button"
                variant="success"
                onClick={() => setApproveOpen(true)}
                disabled={busy !== null}
                className="w-full"
              >
                {busy === 'approve' ? 'Approving...' : 'Approve & Publish'}
              </Button>

              <div className="mt-4 border-t border-gray-100 pt-4">
                <Field label="Rejection reason">
                  <textarea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    rows={3}
                    maxLength={1000}
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Required before rejecting"
                  />
                </Field>
                <Button
                  type="button"
                  variant="danger"
                  onClick={handleReject}
                  disabled={busy !== null}
                  className="mt-3 w-full"
                >
                  {busy === 'reject' ? 'Rejecting...' : data.status === 'rejected' ? 'Update rejection' : 'Reject'}
                </Button>
              </div>
            </Card>
          )}

          <Card className="p-5">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-gray-950">Delete auto submission</h2>
              <p className="mt-1 text-xs text-gray-500">Removes this record and its original uploaded PDF. A published submission keeps its own copied PDF.</p>
            </div>
            <Button
              type="button"
              variant="danger"
              onClick={() => setDeleteOpen(true)}
              disabled={busy !== null}
              className="w-full"
            >
              {busy === 'delete' ? 'Deleting...' : 'Delete'}
            </Button>
          </Card>

          {error && <ErrorMessage message={error} />}
        </div>
      </div>

      <ConfirmDialog
        open={approveOpen}
        title="Approve auto submission"
        description="This will publish the PDF as a question-bank submission and make it available from the public question pages."
        confirmLabel="Approve"
        variant="success"
        busy={busy === 'approve'}
        onCancel={() => setApproveOpen(false)}
        onConfirm={confirmApprove}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Delete auto submission"
        description="This permanently removes the record and its uploaded PDF. This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        busy={busy === 'delete'}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
