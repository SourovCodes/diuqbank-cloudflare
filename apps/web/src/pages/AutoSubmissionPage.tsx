import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { FileUpload } from '../components/ui/FileUpload'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { toastError, toastSuccess } from '../lib/toast'

export function AutoSubmissionPage() {
  useDocumentTitle('AI Auto Submission')
  const { token } = useAuth()
  const navigate = useNavigate()

  const [extraContext, setExtraContext] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token || !file) return
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('pdf', file)
      if (extraContext.trim()) fd.append('extraContext', extraContext.trim())
      const created = await api.createAutoSubmission(token, fd)
      toastSuccess('Uploaded. The AI is reading your paper…')
      navigate(`/my/auto-submissions/${created.id}`)
    } catch (err) {
      toastError(err, 'Upload failed.')
      setSubmitting(false)
    }
  }

  const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
  const labelClass = 'mb-1 block text-xs font-medium text-gray-500'

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-gray-900">AI Auto Submission</h1>
      <p className="mb-6 text-sm text-gray-500">
        Just upload a question paper PDF — the AI reads it, fills in the department,
        course, semester and exam type, and publishes it automatically when it's
        confident. Anything it's unsure about goes to an admin for review.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">PDF File *</h2>
          <FileUpload file={file} onChange={setFile} disabled={submitting} />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <label className={labelClass}>Extra context (optional)</label>
          <textarea
            value={extraContext}
            onChange={e => setExtraContext(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Anything that helps the AI, e.g. the department or semester if the paper doesn't print it clearly."
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          disabled={!file || submitting}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Uploading…' : 'Upload & Process with AI'}
        </button>
      </form>
    </div>
  )
}
