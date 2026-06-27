import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { clsx } from 'clsx'
import { Badge } from '../components/ui/Badge'
import { Spinner } from '../components/ui/Spinner'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { useQuestion } from '../hooks/useQuestion'
import { useSubmissions } from '../hooks/useSubmissions'

function formatBytes(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`
  return `${(bytes / 1024).toFixed(0)} KB`
}

function formatDate(unix: number): string {
  return new Date(unix * 1000).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export function QuestionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: question, isPending: questionLoading, isError: questionError } = useQuestion(id ?? '')
  const { data: submissionsData, isPending: submissionsLoading } = useSubmissions(id ?? '')

  const submissions = submissionsData?.data.slice().sort((a, b) => b.createdAt - a.createdAt) ?? []

  const [selectedId, setSelectedId] = useState<number | null>(null)

  // Auto-select the first submission that has a PDF
  useEffect(() => {
    const first = submissions.find(s => s.pdfUrl !== null)
    setSelectedId(first?.id ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, submissionsData])

  const selectedSub = submissions.find(s => s.id === selectedId)

  if (questionLoading) {
    return <div className="flex justify-center py-24"><Spinner /></div>
  }

  if (questionError || !question) {
    return (
      <div className="container mx-auto px-4 py-12">
        <ErrorMessage message="Question not found or failed to load." />
        <Link to="/questions" className="mt-4 inline-block text-sm text-blue-600 hover:underline">← Back to questions</Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link to="/questions" className="mb-4 inline-flex items-center text-sm text-blue-600 hover:underline">
        ← Back to questions
      </Link>

      {/* Question header */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h1 className="mb-3 text-lg font-bold text-gray-900">{question.title}</h1>
        <div className="flex flex-wrap gap-2">
          <Badge label={question.department.name} variant="blue" />
          <Badge label={question.course.name} variant="gray" />
          <Badge label={question.semester.name} variant="gray" />
          <Badge label={question.examType.name} variant="green" />
        </div>
      </div>

      {/* PDF + right sidebar */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">

        {/* PDF viewer */}
        <div className="min-w-0 flex-1">
          {selectedSub?.pdfUrl ? (
            <iframe
              src={selectedSub.pdfUrl}
              title="Question paper"
              className="w-full rounded-xl border border-gray-200 shadow-sm"
              style={{ height: 'calc(100vh - 260px)', minHeight: '400px' }}
            />
          ) : submissionsLoading ? (
            <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white" style={{ minHeight: '600px' }}>
              <Spinner />
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50" style={{ minHeight: '600px' }}>
              <p className="text-sm text-gray-500">
                {submissions.length === 0 ? 'No submissions yet.' : 'No PDF available for this question.'}
              </p>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="w-full shrink-0 lg:w-80 lg:sticky lg:top-20">
        <div className="flex flex-col gap-4" style={{ maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>

          {/* Submission picker */}
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              {submissions.length} Submission{submissions.length !== 1 ? 's' : ''}
            </h2>

            {submissionsLoading ? (
              <div className="flex justify-center py-6"><Spinner className="h-5 w-5" /></div>
            ) : submissions.length === 0 ? (
              <p className="text-sm text-gray-500">No submissions yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {submissions.map(sub => {
                  const canView = sub.pdfUrl !== null
                  const isSelected = sub.id === selectedId
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => canView && setSelectedId(sub.id)}
                      disabled={!canView}
                      className={clsx(
                        'w-full rounded-lg border p-3 text-left transition',
                        canView ? 'cursor-pointer hover:border-blue-300' : 'cursor-not-allowed opacity-50',
                        isSelected ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 bg-white'
                      )}
                    >
                      <p className="truncate text-sm font-medium text-gray-800">
                        {sub.contributor?.name ?? 'Anonymous'}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">{formatDate(sub.createdAt)}</p>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Selected submission details */}
          {selectedSub && (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Contributor</h3>

              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                  {selectedSub.contributor?.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {selectedSub.contributor?.name ?? 'Anonymous'}
                  </p>
                  {selectedSub.contributor?.username && (
                    <p className="text-xs text-gray-500">@{selectedSub.contributor.username}</p>
                  )}
                </div>
              </div>

              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Details</h3>
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Date</dt>
                  <dd className="font-medium text-gray-800">{formatDate(selectedSub.createdAt)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">File size</dt>
                  <dd className="font-medium text-gray-800">{formatBytes(selectedSub.fileSize)}</dd>
                </div>
                {selectedSub.section && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Section</dt>
                    <dd className="font-medium text-gray-800">{selectedSub.section}</dd>
                  </div>
                )}
                {selectedSub.batch && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Batch</dt>
                    <dd className="font-medium text-gray-800">{selectedSub.batch}</dd>
                  </div>
                )}
              </dl>

              {selectedSub.pdfUrl && (
                <a
                  href={selectedSub.pdfUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-4 flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
                >
                  Open in new tab ↗
                </a>
              )}
            </div>
          )}

        </div>{/* end scrollable inner */}
        </div>{/* end sidebar */}
      </div>
    </div>
  )
}
