import { Link } from 'react-router-dom'
import { Avatar } from '../ui/Avatar'
import type { Contributor } from '@diuqbank/shared/types'

export function ContributorCard({ contributor }: { contributor: Contributor }) {
  return (
    <Link
      to={`/contributors/${contributor.username}`}
      className="group flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white p-5 text-center shadow-sm transition hover:border-blue-300 hover:shadow-md"
    >
      <Avatar name={contributor.name} image={contributor.image} size={12} />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-gray-900 group-hover:text-blue-700">
          {contributor.name}
        </p>
        <p className="text-xs text-gray-500">@{contributor.username}</p>
      </div>
      <span className="rounded-full bg-blue-50 px-3 py-0.5 text-xs font-semibold text-blue-700">
        {contributor.submissionCount} submission{contributor.submissionCount !== 1 ? 's' : ''}
      </span>
    </Link>
  )
}
