import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useAdminExamTypes } from '../../hooks/admin'
import { api } from '../../lib/api'
import { Spinner } from '../../components/ui/Spinner'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { Pagination } from '../../components/ui/Pagination'
import { PageHeader, PrimaryLink, Card, TextInput, EmptyState } from '../../components/admin/ui'

export function AdminExamTypesPage() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const { data, isPending, isError } = useAdminExamTypes(token, page, search)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete(id: number) {
    if (!token || !window.confirm('Delete this exam type? This cannot be undone.')) return
    setError(null)
    try {
      await api.deleteExamType(token, id)
      queryClient.invalidateQueries({ queryKey: ['admin-exam-types'] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.')
    }
  }

  return (
    <div>
      <PageHeader
        title="Exam Types"
        subtitle={data && `${data.meta.total} total`}
        action={<PrimaryLink to="/admin/exam-types/new">+ New Exam Type</PrimaryLink>}
      />

      <div className="mb-4 max-w-xs">
        <TextInput placeholder="Search exam types…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
      </div>

      {error && <div className="mb-4"><ErrorMessage message={error} /></div>}

      {isPending ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : isError ? (
        <ErrorMessage message="Failed to load exam types." />
      ) : data.data.length === 0 ? (
        <EmptyState message="No exam types found." />
      ) : (
        <>
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.data.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/admin/exam-types/${t.id}/edit`} className="text-xs font-medium text-blue-600 hover:underline">Edit</Link>
                      <button onClick={() => handleDelete(t.id)} className="ml-4 text-xs font-medium text-red-500 hover:underline">Delete</button>
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
