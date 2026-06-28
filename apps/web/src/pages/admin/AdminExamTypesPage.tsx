import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useAdminExamTypes } from '../../hooks/admin'
import { api } from '../../lib/api'
import { toastError, toastSuccess } from '../../lib/toast'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { Pagination } from '../../components/ui/Pagination'
import {
  Button,
  ConfirmDialog,
  DataTable,
  EmptyState,
  LoadingState,
  PageHeader,
  PrimaryLink,
  RowActions,
  TableCard,
  TableHead,
  Td,
  TextInput,
  Th,
  Toolbar,
} from '../../components/admin/ui'

export function AdminExamTypesPage() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const { data, isPending, isError } = useAdminExamTypes(token, page, search)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const confirmExamType = data?.data.find(t => t.id === confirmId)

  async function handleDelete() {
    if (!token || confirmId === null) return
    setDeleting(true)
    try {
      await api.deleteExamType(token, confirmId)
      await queryClient.invalidateQueries({ queryKey: ['admin-exam-types'] })
      toastSuccess('Exam type deleted.')
      setConfirmId(null)
    } catch (err) {
      toastError(err, 'Delete failed.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Exam Types"
        subtitle={data && `${data.meta.total} total`}
        action={<PrimaryLink to="/admin/exam-types/new">New Exam Type</PrimaryLink>}
      />

      <Toolbar>
        <div className="w-full max-w-xs">
          <TextInput placeholder="Search exam types" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
      </Toolbar>

      {isPending ? (
        <LoadingState label="Loading exam types" />
      ) : isError ? (
        <ErrorMessage message="Failed to load exam types." />
      ) : data.data.length === 0 ? (
        <EmptyState message="No exam types found." />
      ) : (
        <>
          <TableCard>
            <DataTable>
              <TableHead>
                <tr>
                  <Th>Name</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </TableHead>
              <tbody className="divide-y divide-gray-100">
                {data.data.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <Td className="font-medium text-gray-950">{t.name}</Td>
                    <Td>
                      <RowActions>
                        <Link to={`/admin/exam-types/${t.id}/edit`} className="text-xs font-medium text-blue-600 hover:underline">Edit</Link>
                        <Button type="button" variant="dangerLink" onClick={() => setConfirmId(t.id)}>Delete</Button>
                      </RowActions>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </TableCard>
          <Pagination meta={data.meta} onPageChange={setPage} />
        </>
      )}

      <ConfirmDialog
        open={confirmId !== null}
        title="Delete exam type"
        description={`Delete ${confirmExamType?.name ?? 'this exam type'}? This cannot be undone.`}
        confirmLabel="Delete"
        busy={deleting}
        onCancel={() => setConfirmId(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
