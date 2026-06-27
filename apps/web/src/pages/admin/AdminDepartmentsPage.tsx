import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useAdminDepartments } from '../../hooks/admin'
import { api } from '../../lib/api'
import { Spinner } from '../../components/ui/Spinner'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { Pagination } from '../../components/ui/Pagination'
import { PageHeader, PrimaryLink, Card, TextInput, EmptyState } from '../../components/admin/ui'

export function AdminDepartmentsPage() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const { data, isPending, isError } = useAdminDepartments(token, page, search)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete(id: number) {
    if (!token || !window.confirm('Delete this department? This cannot be undone.')) return
    setError(null)
    try {
      await api.deleteDepartment(token, id)
      queryClient.invalidateQueries({ queryKey: ['admin-departments'] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.')
    }
  }

  return (
    <div>
      <PageHeader
        title="Departments"
        subtitle={data && `${data.meta.total} total`}
        action={<PrimaryLink to="/admin/departments/new">+ New Department</PrimaryLink>}
      />

      <div className="mb-4 max-w-xs">
        <TextInput
          placeholder="Search departments…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
        />
      </div>

      {error && <div className="mb-4"><ErrorMessage message={error} /></div>}

      {isPending ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : isError ? (
        <ErrorMessage message="Failed to load departments." />
      ) : data.data.length === 0 ? (
        <EmptyState message="No departments found." />
      ) : (
        <>
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Short Name</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.data.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{d.name}</td>
                    <td className="px-4 py-3 text-gray-600">{d.shortName}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/admin/departments/${d.id}/edit`} className="text-xs font-medium text-blue-600 hover:underline">Edit</Link>
                      <button onClick={() => handleDelete(d.id)} className="ml-4 text-xs font-medium text-red-500 hover:underline">Delete</button>
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
