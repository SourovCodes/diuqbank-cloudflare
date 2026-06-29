import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useAdminSemesters } from '../../hooks/admin'
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
  SecondaryLink,
  TableCard,
  TableHead,
  Td,
  TextInput,
  Th,
  Toolbar,
} from '../../components/admin/ui'

export function AdminSemestersPage() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const { data, isPending, isError } = useAdminSemesters(token, page, search)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const confirmSemester = data?.data.find(s => s.id === confirmId)

  async function handleDelete() {
    if (!token || confirmId === null) return
    setDeleting(true)
    try {
      await api.deleteSemester(token, confirmId)
      await queryClient.invalidateQueries({ queryKey: ['admin-semesters'] })
      toastSuccess('Semester deleted.')
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
        title="Semesters"
        subtitle={data && `${data.meta.total} total`}
        action={
          <div className="flex gap-2">
            <SecondaryLink to="/admin/semesters/merge">Merge</SecondaryLink>
            <PrimaryLink to="/admin/semesters/new">New Semester</PrimaryLink>
          </div>
        }
      />

      <Toolbar>
        <div className="w-full max-w-xs">
          <TextInput placeholder="Search semesters" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
      </Toolbar>

      {isPending ? (
        <LoadingState label="Loading semesters" />
      ) : isError ? (
        <ErrorMessage message="Failed to load semesters." />
      ) : data.data.length === 0 ? (
        <EmptyState message="No semesters found." />
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
                {data.data.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <Td className="font-medium text-gray-950">{s.name}</Td>
                    <Td>
                      <RowActions>
                        <Link to={`/admin/semesters/${s.id}/edit`} className="text-xs font-medium text-blue-600 hover:underline">Edit</Link>
                        <Button type="button" variant="dangerLink" onClick={() => setConfirmId(s.id)}>Delete</Button>
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
        title="Delete semester"
        description={`Delete ${confirmSemester?.name ?? 'this semester'}? This cannot be undone.`}
        confirmLabel="Delete"
        busy={deleting}
        onCancel={() => setConfirmId(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
