import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { Spinner } from '../../components/ui/Spinner'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { Badge } from '../../components/ui/Badge'
import { Card, Field, TextInput } from '../../components/admin/ui'
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

  const { data, isPending, isError } = useQuery({
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

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['admin-manual-submissions'] })
  }

  async function handleSave() {
    if (!token) return
    setBusy('save'); setError(null)
    try {
      await api.updateManualSubmission(token, Number(id), fields)
      invalidate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setBusy(null)
    }
  }

  async function handleApprove() {
    if (!token || !window.confirm('Approve this submission? It will become a published question paper.')) return
    setBusy('approve'); setError(null)
    try {
      await api.approveManualSubmission(token, Number(id))
      invalidate()
      navigate('/admin/manual-submissions')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approve failed.')
      setBusy(null)
    }
  }

  async function handleReject() {
    if (!token) return
    if (!reason.trim()) { setError('A rejection reason is required.'); return }
    setBusy('reject'); setError(null)
    try {
      await api.rejectManualSubmission(token, Number(id), reason.trim())
      invalidate()
      navigate('/admin/manual-submissions')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reject failed.')
      setBusy(null)
    }
  }

  if (isPending) return <div className="flex justify-center py-16"><Spinner /></div>
  if (isError || !data) return <ErrorMessage message="Failed to load submission." />

  const pending = data.status === 'pending_review'

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/admin/manual-submissions" className="text-xs font-medium text-gray-500 hover:underline">← Back to list</Link>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">Review Submission #{data.id}</h1>
          <p className="mt-1 text-sm text-gray-500">by @{data.contributor.username}</p>
        </div>
        <Badge label={statusLabel(data.status)} variant={statusVariant(data.status)} />
      </div>

      {data.rejectedReason && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Rejected: {data.rejectedReason}
        </div>
      )}
      {data.questionId && (
        <div className="mb-4 text-sm text-gray-600">
          Published as <Link to={`/questions/${data.questionId}`} className="font-medium text-blue-600 hover:underline">question #{data.questionId} ↗</Link>
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 lg:flex-1">
          {data.pdfUrl ? (
            <iframe
              src={data.pdfUrl}
              title="Submission paper"
              className="w-full rounded-xl border border-gray-200 shadow-sm"
              style={{ height: 'calc(100vh - 260px)', minHeight: '400px' }}
            />
          ) : (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">No PDF attached.</div>
          )}
        </div>

        <div className="w-full lg:w-80 lg:shrink-0">
          <Card className="p-5">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">Categorization</h2>
            <div className="space-y-3">
              <Field label="Department"><TextInput value={fields.departmentName} onChange={e => setFields(f => ({ ...f, departmentName: e.target.value }))} disabled={!pending} /></Field>
              <Field label="Department Short Name"><TextInput value={fields.departmentShortName} onChange={e => setFields(f => ({ ...f, departmentShortName: e.target.value }))} disabled={!pending} /></Field>
              <Field label="Course"><TextInput value={fields.courseName} onChange={e => setFields(f => ({ ...f, courseName: e.target.value }))} disabled={!pending} /></Field>
              <Field label="Semester"><TextInput value={fields.semesterName} onChange={e => setFields(f => ({ ...f, semesterName: e.target.value }))} disabled={!pending} /></Field>
              <Field label="Exam Type"><TextInput value={fields.examTypeName} onChange={e => setFields(f => ({ ...f, examTypeName: e.target.value }))} disabled={!pending} /></Field>

              {pending && (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={busy !== null}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                >
                  {busy === 'save' ? 'Saving…' : 'Save categorization'}
                </button>
              )}
            </div>

            {pending && (
              <div className="mt-5 border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={busy !== null}
                  className="mb-3 w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
                >
                  {busy === 'approve' ? 'Approving…' : '✓ Approve'}
                </button>
                <Field label="Rejection reason">
                  <textarea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    rows={3}
                    maxLength={1000}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Required to reject…"
                  />
                </Field>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={busy !== null}
                  className="mt-2 w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                >
                  {busy === 'reject' ? 'Rejecting…' : '✕ Reject'}
                </button>
              </div>
            )}

            {error && <div className="mt-4"><ErrorMessage message={error} /></div>}
          </Card>
        </div>
      </div>
    </div>
  )
}
