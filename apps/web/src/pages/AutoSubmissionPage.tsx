import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { FileUpload } from '../components/ui/FileUpload'
import { ErrorMessage } from '../components/ui/ErrorMessage'

export function AutoSubmissionPage() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  async function handleUpload() {
    if (!token || !file) return
    setUploading(true)
    setUploadError(null)
    try {
      const result = await api.createAutoSubmission(token, file)
      navigate(`/my/auto-submissions/${result.id}`)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.')
      setUploading(false)
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Auto Submission</h1>
      <p className="mb-6 text-sm text-gray-500">Upload a PDF — AI will extract the question metadata automatically.</p>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
        <FileUpload file={file} onChange={setFile} disabled={uploading} />
        {uploadError && <ErrorMessage message={uploadError} />}
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-60"
        >
          {uploading ? 'Uploading…' : 'Upload & Extract with AI'}
        </button>
      </div>
    </div>
  )
}
