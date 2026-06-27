import { useState } from 'react'
import { useContributors } from '../hooks/useContributors'
import { ContributorCard } from '../components/contributors/ContributorCard'
import { Pagination } from '../components/ui/Pagination'
import { Spinner } from '../components/ui/Spinner'
import { ErrorMessage } from '../components/ui/ErrorMessage'

export function ContributorsPage() {
  const [page, setPage] = useState(1)
  const { data, isPending, isError } = useContributors(page, 20)

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Contributors</h1>
      {data && (
        <p className="mb-6 text-sm text-gray-500">
          {data.meta.total.toLocaleString()} people who have shared question papers with the community.
        </p>
      )}

      {isPending ? (
        <div className="flex justify-center py-16"><Spinner /></div>
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
