import { useSearchParams } from 'react-router-dom'
import { DEFAULT_PER_PAGE } from '@diuqbank/shared'
import { FilterBar } from '../components/questions/FilterBar'
import { QuestionCard } from '../components/questions/QuestionCard'
import { Pagination } from '../components/ui/Pagination'
import { Spinner } from '../components/ui/Spinner'
import { SkeletonList } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { useFilterOptions } from '../hooks/useFilterOptions'
import { useQuestions } from '../hooks/useQuestions'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import type { QuestionFilters } from '@diuqbank/shared/types'

export function QuestionsPage() {
  useDocumentTitle('Browse Questions')
  const [searchParams, setSearchParams] = useSearchParams()

  const filters: QuestionFilters = {
    page: Number(searchParams.get('page')) || 1,
    perPage: DEFAULT_PER_PAGE,
    departmentId: searchParams.get('departmentId') ?? '',
    courseId: searchParams.get('courseId') ?? '',
    semesterId: searchParams.get('semesterId') ?? '',
    examTypeId: searchParams.get('examTypeId') ?? '',
  }

  const { data: filterOptions, isPending: optionsLoading } = useFilterOptions()
  const { data, isPending: questionsLoading, isError } = useQuestions(filters)

  function updateFilter(key: keyof QuestionFilters, value: string) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      next.set('page', '1')
      return next
    }, { replace: true })
  }

  function handleDepartmentChange(deptId: string) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (deptId) next.set('departmentId', deptId)
      else next.delete('departmentId')
      next.delete('courseId')
      next.set('page', '1')
      return next
    }, { replace: true })
  }

  function clearFilters() {
    setSearchParams({}, { replace: true })
  }

  function goToPage(page: number) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('page', String(page))
      return next
    })
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Browse Questions</h1>
        {data && (
          <p className="mt-1 text-sm text-gray-500">
            {data.meta.total.toLocaleString()} questions found
          </p>
        )}
      </div>

      {optionsLoading ? (
        <div className="mb-6 flex justify-center py-4">
          <Spinner className="h-5 w-5" />
        </div>
      ) : filterOptions ? (
        <div className="mb-6">
          <FilterBar
            options={filterOptions}
            filters={filters}
            onFilterChange={updateFilter}
            onDepartmentChange={handleDepartmentChange}
            onClear={clearFilters}
          />
        </div>
      ) : null}

      {isError ? (
        <ErrorMessage message="Failed to load questions. Please try again." />
      ) : questionsLoading && !data ? (
        <SkeletonList count={6} />
      ) : (
        <>
          <div className={`flex flex-col gap-3 transition-opacity ${questionsLoading ? 'opacity-60' : ''}`}>
            {data?.data.length === 0 ? (
              <EmptyState message="No questions match your filters." />
            ) : (
              data?.data.map(q => <QuestionCard key={q.id} question={q} variant="list" />)
            )}
          </div>

          {data && <Pagination meta={data.meta} onPageChange={goToPage} />}
        </>
      )}
    </div>
  )
}
