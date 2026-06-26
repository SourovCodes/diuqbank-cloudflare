import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useAdminQuestions } from '../../hooks/admin'
import { useFilterOptions } from '../../hooks/useFilterOptions'
import { api } from '../../lib/api'
import { Spinner } from '../../components/ui/Spinner'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { Pagination } from '../../components/ui/Pagination'
import { Badge } from '../../components/ui/Badge'
import { SearchableSelect } from '../../components/ui/SearchableSelect'
import { PageHeader, PrimaryLink, Card, EmptyState } from '../../components/admin/ui'

export function AdminQuestionsPage() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const { data: options } = useFilterOptions()
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ departmentId: '', courseId: '', semesterId: '', examTypeId: '' })
  const { data, isPending, isError } = useAdminQuestions(token, page, filters)
  const [error, setError] = useState<string | null>(null)

  function setFilter(key: keyof typeof filters, value: string) {
    setFilters(f => ({ ...f, [key]: value }))
    setPage(1)
  }

  async function handleDelete(id: number) {
    if (!token || !window.confirm('Delete this question and all its submissions? This cannot be undone.')) return
    setError(null)
    try {
      await api.deleteQuestion(token, id)
      queryClient.invalidateQueries({ queryKey: ['admin-questions'] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.')
    }
  }

  const opt = (items: { id: number; name: string }[] | undefined) =>
    (items ?? []).map(i => ({ value: String(i.id), label: i.name }))
  const courses = options?.courses.filter(c => !filters.departmentId || String(c.departmentId) === filters.departmentId)

  return (
    <div>
      <PageHeader
        title="Questions"
        subtitle={data && `${data.meta.total} total`}
        action={<PrimaryLink to="/admin/questions/new">+ New Question</PrimaryLink>}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SearchableSelect placeholder="All departments" options={opt(options?.departments)} value={filters.departmentId} onChange={v => setFilter('departmentId', v)} />
        <SearchableSelect placeholder="All courses" options={opt(courses)} value={filters.courseId} onChange={v => setFilter('courseId', v)} />
        <SearchableSelect placeholder="All semesters" options={opt(options?.semesters)} value={filters.semesterId} onChange={v => setFilter('semesterId', v)} />
        <SearchableSelect placeholder="All exam types" options={opt(options?.examTypes)} value={filters.examTypeId} onChange={v => setFilter('examTypeId', v)} />
      </div>

      {error && <div className="mb-4"><ErrorMessage message={error} /></div>}

      {isPending ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : isError ? (
        <ErrorMessage message="Failed to load questions." />
      ) : data.data.length === 0 ? (
        <EmptyState message="No questions found." />
      ) : (
        <>
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Course</th>
                  <th className="px-4 py-3 font-medium">Tags</th>
                  <th className="px-4 py-3 font-medium">Subs</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.data.map(q => (
                  <tr key={q.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{q.course.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <Badge label={q.department.shortName} variant="blue" />
                        <Badge label={q.semester.name} variant="gray" />
                        <Badge label={q.examType.name} variant="green" />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{q.submissionCount}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Link to={`/questions/${q.id}`} className="text-xs font-medium text-gray-500 hover:underline">View</Link>
                      <Link to={`/admin/questions/${q.id}/edit`} className="ml-4 text-xs font-medium text-blue-600 hover:underline">Edit</Link>
                      <button onClick={() => handleDelete(q.id)} className="ml-4 text-xs font-medium text-red-500 hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Pagination meta={data.meta} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
