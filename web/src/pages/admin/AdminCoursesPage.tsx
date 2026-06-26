import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useAdminCourses } from '../../hooks/admin'
import { useFilterOptions } from '../../hooks/useFilterOptions'
import { api } from '../../lib/api'
import { Spinner } from '../../components/ui/Spinner'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { Pagination } from '../../components/ui/Pagination'
import { SearchableSelect } from '../../components/ui/SearchableSelect'
import { PageHeader, PrimaryLink, Card, TextInput, EmptyState } from '../../components/admin/ui'

export function AdminCoursesPage() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const { data, isPending, isError } = useAdminCourses(token, page, departmentId, search)
  const { data: options } = useFilterOptions()
  const [error, setError] = useState<string | null>(null)

  const deptName = (id: number) => options?.departments.find(d => d.id === id)?.shortName ?? `#${id}`

  async function handleDelete(id: number) {
    if (!token || !window.confirm('Delete this course? This cannot be undone.')) return
    setError(null)
    try {
      await api.deleteCourse(token, id)
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.')
    }
  }

  return (
    <div>
      <PageHeader
        title="Courses"
        subtitle={data && `${data.meta.total} total`}
        action={<PrimaryLink to="/admin/courses/new">+ New Course</PrimaryLink>}
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="max-w-xs flex-1">
          <TextInput placeholder="Search courses…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <div className="w-56">
          <SearchableSelect
            placeholder="All departments"
            options={(options?.departments ?? []).map(d => ({ value: String(d.id), label: d.name }))}
            value={departmentId}
            onChange={v => { setDepartmentId(v); setPage(1) }}
          />
        </div>
      </div>

      {error && <div className="mb-4"><ErrorMessage message={error} /></div>}

      {isPending ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : isError ? (
        <ErrorMessage message="Failed to load courses." />
      ) : data.data.length === 0 ? (
        <EmptyState message="No courses found." />
      ) : (
        <>
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.data.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                    <td className="px-4 py-3 text-gray-600">{deptName(c.departmentId)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/admin/courses/${c.id}/edit`} className="text-xs font-medium text-blue-600 hover:underline">Edit</Link>
                      <button onClick={() => handleDelete(c.id)} className="ml-4 text-xs font-medium text-red-500 hover:underline">Delete</button>
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
