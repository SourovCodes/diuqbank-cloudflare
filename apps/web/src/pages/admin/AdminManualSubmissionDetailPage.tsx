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
import type { ManualSubmission } from '@diuqbank/shared/types'

const statusVariant = (s: ManualSubmission['status']) =>
  s === 'approved' ? 'green' : s === 'rejected' ? 'red' : 'yellow'
const statusLabel = (s: ManualSubmission['status']) =>
  s === 'approved' ? 'Approved' : s === 'rejected' ? 'Rejected' : 'Pending Review'

export function AdminManualSubmissionDetailPage() {
  const { token } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isPending, isError, error: loadError } = useQuery({
    queryKey: ['admin-manual-submissions', 'detail', Number(id)],
    queryFn: () => api.adminManualSubmission(token!, Number(id)),
    enabled: !!token,
  })

  const [fields, setFields] = useState({
    departmentName: '', departmentShortName: '', courseName: '', semesterName: '', examTypeName: '',
  })
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState<'save' | 'approve' | 'reject' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [approveOpen, setApproveOpen] = useState(false)

  useEffect(() => {
    if (data) {
      setFields({
        departmentName: data.department.name,
        departmentShortName: data.department.shortName,
        courseName: data.course.name,
        semesterName: data.semester.name,
        examTypeName: data.examType.name,
      })
    }
  }, [data])

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: ['admin-manual-submissions'] })
  }

  async function handleSave() {
    if (!token) return
    setBusy('save')
    setError(null)
    try {
      await api.updateManualSubmission(token, Number(id), fields)
      await invalidate()
      toastSuccess('Categorization saved.')
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
      await api.approveManualSubmission(token, Number(id))
      await invalidate()
      toastSuccess('Submission approved.')
      navigate('/admin/manual-submissions')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approve failed.')
      toastError(err, 'Approve failed.')
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
      await api.rejectManualSubmission(token, Number(id), reason.trim())
      await invalidate()
      toastSuccess('Submission rejected.')
      navigate('/admin/manual-submissions')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reject failed.')
      toastError(err, 'Reject failed.')
      setBusy(null)
    }
  }

  if (isPending) return <LoadingState label="Loading manual submission" />
  if (isError && isNotFound(loadError)) return <NotFoundPage />
  if (isError || !data) return <ErrorMessage message="Failed to load submission." />

  const pending = data.status === 'pending_review'

  return (
    <div>
      <PageHeader
        title={`Review Submission #${data.id}`}
        subtitle={`Submitted by @${data.contributor.username}`}
        action={<Badge label={statusLabel(data.status)} variant={statusVariant(data.status)} />}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <Link to="/admin/manual-submissions" className="font-medium text-gray-600 hover:text-gray-950 hover:underline">Back to submissions</Link>
        {data.questionId && (
          <Link to={`/questions/${data.questionId}`} className="font-medium text-blue-600 hover:underline">
            Published question #{data.questionId}
          </Link>
        )}
      </div>

      {data.rejectedReason && (
        <div className="mb-4">
          <StatusBanner tone="danger">Rejected: {data.rejectedReason}</StatusBanner>
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
              title="Submission paper"
              className="h-[calc(100vh-210px)] min-h-[520px] w-full bg-white"
            />
          ) : (
            <div className="flex min-h-[520px] items-center justify-center bg-gray-50 p-8 text-center text-sm text-gray-500">
              No PDF attached.
            </div>
          )}
        </Card>

        <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <Card className="p-5">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-gray-950">Categorization</h2>
              <p className="mt-1 text-xs text-gray-500">Match these fields to existing catalog records before approval.</p>
            </div>
            <div className="space-y-3">
              <Field label="Department"><TextInput value={fields.departmentName} onChange={e => setFields(f => ({ ...f, departmentName: e.target.value }))} disabled={!pending} /></Field>
              <Field label="Department Short Name"><TextInput value={fields.departmentShortName} onChange={e => setFields(f => ({ ...f, departmentShortName: e.target.value }))} disabled={!pending} /></Field>
              <Field label="Course"><TextInput value={fields.courseName} onChange={e => setFields(f => ({ ...f, courseName: e.target.value }))} disabled={!pending} /></Field>
              <Field label="Semester"><TextInput value={fields.semesterName} onChange={e => setFields(f => ({ ...f, semesterName: e.target.value }))} disabled={!pending} /></Field>
              <Field label="Exam Type"><TextInput value={fields.examTypeName} onChange={e => setFields(f => ({ ...f, examTypeName: e.target.value }))} disabled={!pending} /></Field>

              {pending && (
                <Button type="button" variant="secondary" onClick={handleSave} disabled={busy !== null} className="w-full">
                  {busy === 'save' ? 'Saving...' : 'Save categorization'}
                </Button>
              )}
            </div>
          </Card>

          {pending && (
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
                {busy === 'approve' ? 'Approving...' : 'Approve'}
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
                  {busy === 'reject' ? 'Rejecting...' : 'Reject'}
                </Button>
              </div>
            </Card>
          )}

          {error && <ErrorMessage message={error} />}
        </div>
      </div>

      <ConfirmDialog
        open={approveOpen}
        title="Approve manual submission"
        description="This will publish the PDF as a question-bank submission and make it available from the public question pages."
        confirmLabel="Approve"
        variant="success"
        busy={busy === 'approve'}
        onCancel={() => setApproveOpen(false)}
        onConfirm={confirmApprove}
      />
    </div>
  )
}
