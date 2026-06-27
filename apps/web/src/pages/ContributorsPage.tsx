import { useState } from 'react'
import { DEFAULT_PER_PAGE } from '@diuqbank/shared'
import { useContributors } from '../hooks/useContributors'
import { ContributorCard } from '../components/contributors/ContributorCard'
import { Pagination } from '../components/ui/Pagination'
import { Skeleton } from '../components/ui/Skeleton'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export function ContributorsPage() {
  useDocumentTitle('Contributors')
  const [page, setPage] = useState(1)
  const { data, isPending, isError } = useContributors(page, DEFAULT_PER_PAGE)

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Contributors</h1>
      {data && (
        <p className="mb-6 text-sm text-gray-500">
          {data.meta.total.toLocaleString()} people who have shared question papers with the community.
        </p>
      )}

      {isPending ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorMessage message="Failed to load contributors." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {data?.data.map(c => <ContributorCard key={c.id} contributor={c} />)}
          </div>
          {data?.meta && <Pagination meta={data.meta} onPageChange={setPage} />}
        </>
      )}
    </div>
  )
}
