import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useAutoSubmission } from '../hooks/useAutoSubmission'
import { api } from '../lib/api'
import { FileUpload } from '../components/ui/FileUpload'
import { Spinner } from '../components/ui/Spinner'
import { ErrorMessage } from '../components/ui/ErrorMessage'

export function AutoSubmissionPage() {
  const { token } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [uploadId, setUploadId] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  const { data: autoUpload } = useAutoSubmission(token, uploadId)

  async function handleUpload() {
    if (!token || !file) return
    setUploading(true)
    setUploadError(null)
    try {
      const result = await api.createAutoSubmission(token, file)
      setUploadId(result.id)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  async function handleConfirm() {
    if (!token || uploadId === null) return
    setConfirming(true)
    try {
      await api.confirmAutoSubmission(token, uploadId)
      setConfirmed(true)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Confirmation failed.')
    } finally {
      setConfirming(false)
    }
  }

  if (confirmed) {
    return (
      <div className="flex py-12 justify-center">
        <div className="w-full max-w-sm rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
          <div className="mb-3 text-4xl">🎉</div>
          <h2 className="mb-2 text-lg font-bold text-gray-900">Submission Confirmed!</h2>
          <p className="mb-6 text-sm text-gray-600">Your question paper has been added to the bank.</p>
          <Link to="/questions" className="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition">
            Browse Questions
          </Link>
        </div>
      </div>
    )
  }

  const isProcessing = autoUpload?.status === 'processing'
  const isAwaiting = autoUpload?.status === 'awaiting_confirmation'
  const isFailed = autoUpload?.status === 'failed'
  const ai = autoUpload?.aiResult

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Auto Submission</h1>
      <p className="mb-6 text-sm text-gray-500">Upload a PDF — AI will extract the question metadata automatically.</p>

      <div className="space-y-5">
        {/* Step 1: Upload */}
        {!uploadId && (
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
        )}

        {/* Step 2: Processing */}
        {isProcessing && (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 bg-white p-8 shadow-sm text-center">
            <Spinner />
            <div>
              <p className="font-semibold text-gray-800">Processing with AI…</p>
              <p className="mt-1 text-sm text-gray-500">This usually takes 15–30 seconds.</p>
            </div>
          </div>
        )}

        {/* Step 3: Failed */}
        {isFailed && (
          <ErrorMessage message={autoUpload.errorMessage ?? 'AI processing failed. Please try again.'} />
        )}

        {/* Step 4: Review & confirm */}
        {isAwaiting && ai && (
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">AI Extracted Metadata — Please Review</h2>

            {!ai.isAcceptable ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <strong>Not acceptable:</strong> {ai.rejectionReason}
              </div>
            ) : (
              <>
                <dl className="space-y-2 text-sm">
                  {[
                    ['Department', ai.departmentName ? `${ai.departmentName} (${ai.departmentShortName})` : null],
                    ['Course', ai.courseName],
                    ['Semester', ai.semesterName],
                    ['Exam Type', ai.examTypeName],
                    ['Section', ai.section],
                    ['Batch', ai.batch],
                  ].map(([label, value]) => value ? (
                    <div key={label as string} className="flex justify-between">
                      <dt className="text-gray-500">{label}</dt>
                      <dd className="font-medium text-gray-800">{value}</dd>
                    </div>
                  ) : null)}
                </dl>

                {ai.reasoning && (
                  <details className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
                    <summary className="cursor-pointer font-medium text-gray-600">AI reasoning</summary>
                    <p className="mt-2">{ai.reasoning}</p>
                  </details>
                )}

                {uploadError && <ErrorMessage message={uploadError} />}

                <button
                  onClick={handleConfirm}
                  disabled={confirming}
                  className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-60"
                >
                  {confirming ? 'Confirming…' : 'Confirm & Submit'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
