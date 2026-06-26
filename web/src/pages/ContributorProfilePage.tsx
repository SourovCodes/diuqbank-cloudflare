import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useContributor } from '../hooks/useContributor'
import { useContributorSubmissions } from '../hooks/useContributorSubmissions'
import { Avatar } from '../components/ui/Avatar'
import { Badge } from '../components/ui/Badge'
import { Pagination } from '../components/ui/Pagination'
import { Spinner } from '../components/ui/Spinner'
import { ErrorMessage } from '../components/ui/ErrorMessage'

function formatDate(unix: number) {
  return new Date(unix * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatBytes(bytes: number) {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`
  return `${(bytes / 1024).toFixed(0)} KB`
}

export function ContributorProfilePage() {
  const { username } = useParams<{ username: string }>()
  const [page, setPage] = useState(1)

  const { data: contributor, isPending: profileLoading, isError: profileError } = useContributor(username ?? '')
  const { data: submissionsData, isPending: subsLoading } = useContributorSubmissions(username ?? '', page)

  if (profileLoading) {
    return <div className="flex justify-center py-24"><Spinner /></div>
  }

  if (profileError || !contributor) {
    return (
      <div className="container mx-auto px-4 py-12">
        <ErrorMessage message="Contributor not found." />
        <Link to="/contributors" className="mt-4 inline-block text-sm text-blue-600 hover:underline">← Back to contributors</Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link to="/contributors" className="mb-6 inline-flex items-center text-sm text-blue-600 hover:underline">
        ← Contributors
      </Link>

      {/* Profile header */}
      <div className="mb-8 flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:gap-5">
        <Avatar name={contributor.name} image={contributor.image} size={16} />
        <div>
          <h1 className="text-xl font-bold text-gray-900">{contributor.name}</h1>
          <p className="text-sm text-gray-500">@{contributor.username}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-0.5 text-xs font-semibold text-blue-700">
              {contributor.submissionCount} submission{contributor.submissionCount !== 1 ? 's' : ''}
            </span>
            <span className="rounded-full bg-gray-100 px-3 py-0.5 text-xs text-gray-600">
              Member since {formatDate(contributor.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Submissions list */}
      <h2 className="mb-4 text-lg font-bold text-gray-900">Submissions</h2>

      {subsLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : submissionsData?.data.length === 0 ? (
        <p className="text-sm text-gray-500">No submissions yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {submissionsData?.data.map(sub => (
            <Link
              key={sub.id}
              to={`/questions/${sub.question.id}`}
              className="group flex flex-col gap-2 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm transition hover:border-blue-300 hover:shadow-md"
            >
              <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-700">
                {sub.question.title}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                <Badge label={sub.question.department.shortName} variant="blue" />
                <Badge label={sub.question.semester.name} variant="gray" />
                <Badge label={sub.question.examType.name} variant="green" />
              </div>
              <div className="flex flex-wrap gap-x-4 text-xs text-gray-500">
                <span>{formatDate(sub.createdAt)}</span>
                <span>{formatBytes(sub.fileSize)}</span>
                {sub.section && <span>Section: {sub.section}</span>}
                {sub.batch && <span>Batch: {sub.batch}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}

      {submissionsData?.meta && (
        <Pagination meta={submissionsData.meta} onPageChange={setPage} />
      )}
    </div>
  )
}
