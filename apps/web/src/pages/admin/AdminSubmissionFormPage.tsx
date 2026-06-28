import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { toastError, toastSuccess } from '../../lib/toast'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { SearchableSelect } from '../../components/ui/SearchableSelect'
import { FileUpload } from '../../components/ui/FileUpload'
import { Button, Card, Field, FormActions, LoadingState, PageHeader, SubmitButton, TextInput } from '../../components/admin/ui'
import type { WatermarkStatus } from '@diuqbank/shared/types'

export function AdminSubmissionFormPage() {
  const { token } = useAuth()
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [questionId, setQuestionId] = useState('')
  const [userId, setUserId] = useState('')
  const [section, setSection] = useState('')
  const [batch, setBatch] = useState('')
  const [watermarkStatus, setWatermarkStatus] = useState<WatermarkStatus>('awaiting')
  const [pdf, setPdf] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [replaceFile, setReplaceFile] = useState<File | null>(null)
  const [replacing, setReplacing] = useState(false)

  // Option sources for the question/user pickers (first 100 of each).
  const { data: questions } = useQuery({
    queryKey: ['admin-questions', 'picker'],
    queryFn: () => api.adminQuestions(token!, { perPage: 100 }),
    enabled: !!token,
  })
  const { data: users } = useQuery({
    queryKey: ['admin-users', 'picker'],
    queryFn: () => api.adminUsers(token!, { perPage: 100 }),
    enabled: !!token,
  })

  const { data, isPending } = useQuery({
    queryKey: ['admin-submissions', 'detail', Number(id)],
    queryFn: () => api.adminSubmission(token!, Number(id)),
    enabled: isEdit && !!token,
  })

  useEffect(() => {
    if (data) {
      setQuestionId(String(data.question.id))
      setUserId(data.contributor ? String(data.contributor.id) : '')
      setSection(data.section ?? '')
      setBatch(data.batch ?? '')
      setWatermarkStatus(data.watermarkStatus)
    }
  }, [data])

  const questionOptions = (questions?.data ?? []).map(q => ({ value: String(q.id), label: q.title }))
  const userOptions = (users?.data ?? []).map(u => ({ value: String(u.id), label: `${u.name} (@${u.username})` }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    if (!questionId || !userId) { setError('Question and contributor are required.'); return }
    if (!isEdit && !pdf) { setError('A PDF file is required.'); return }
    setSaving(true)
    setError(null)
    try {
      if (isEdit) {
        await api.updateSubmission(token, Number(id), {
          questionId: Number(questionId), userId: Number(userId),
          section: section || null, batch: batch || null, watermarkStatus,
        })
      } else {
        const fd = new FormData()
        fd.append('pdf', pdf!)
        fd.append('questionId', questionId)
        fd.append('userId', userId)
        if (section) fd.append('section', section)
        if (batch) fd.append('batch', batch)
        await api.createSubmission(token, fd)
      }
      queryClient.invalidateQueries({ queryKey: ['admin-submissions'] })
      toastSuccess(isEdit ? 'Submission updated.' : 'Submission created.')
      navigate('/admin/submissions')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.')
      toastError(err, 'Save failed.')
      setSaving(false)
    }
  }

  async function handleReplacePdf() {
    if (!token || !replaceFile) return
    setReplacing(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('pdf', replaceFile)
      await api.replaceSubmissionPdf(token, Number(id), fd)
      setReplaceFile(null)
      queryClient.invalidateQueries({ queryKey: ['admin-submissions'] })
      toastSuccess('PDF replaced.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Replace failed.')
      toastError(err, 'Replace failed.')
    } finally {
      setReplacing(false)
    }
  }

  if (isEdit && isPending) return <LoadingState label="Loading submission" />

  return (
    <div className="max-w-lg">
      <PageHeader title={isEdit ? 'Edit Submission' : 'New Submission'} />
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Question">
            <SearchableSelect placeholder="Select question" options={questionOptions} value={questionId} onChange={setQuestionId} />
          </Field>
          <Field label="Contributor">
            <SearchableSelect placeholder="Select user" options={userOptions} value={userId} onChange={setUserId} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Section (optional)">
              <TextInput value={section} onChange={e => setSection(e.target.value)} maxLength={100} />
            </Field>
            <Field label="Batch (optional)">
              <TextInput value={batch} onChange={e => setBatch(e.target.value)} maxLength={100} />
            </Field>
          </div>

          {isEdit ? (
            <Field label="Watermark Status">
              <SearchableSelect
                options={[
                  { value: 'awaiting', label: 'Awaiting' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'failed', label: 'Failed' },
                ]}
                value={watermarkStatus}
                onChange={v => setWatermarkStatus(v as WatermarkStatus)}
              />
            </Field>
          ) : (
            <Field label="PDF File">
              <FileUpload file={pdf} onChange={setPdf} />
            </Field>
          )}

          {error && <ErrorMessage message={error} />}
          <FormActions>
            <SubmitButton saving={saving}>{isEdit ? 'Save changes' : 'Create'}</SubmitButton>
            <Button type="button" variant="secondary" onClick={() => navigate('/admin/submissions')}>Cancel</Button>
          </FormActions>
        </form>
      </Card>

      {isEdit && (
        <Card className="mt-6 p-6">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Replace PDF</h2>
          {data?.pdfUrl && (
            <a href={data.pdfUrl} target="_blank" rel="noreferrer" className="mb-3 inline-block text-xs font-medium text-blue-600 hover:underline">View current PDF ↗</a>
          )}
          <FileUpload file={replaceFile} onChange={setReplaceFile} />
          <Button
            type="button"
            onClick={handleReplacePdf}
            disabled={!replaceFile || replacing}
            className="mt-3"
          >
            {replacing ? 'Uploading...' : 'Replace PDF'}
          </Button>
        </Card>
      )}
    </div>
  )
}
