import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useAdminDepartments } from '../../hooks/admin'
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

export function AdminDepartmentsPage() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const { data, isPending, isError } = useAdminDepartments(token, page, search)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const confirmDepartment = data?.data.find(d => d.id === confirmId)

  async function handleDelete() {
    if (!token || confirmId === null) return
    setDeleting(true)
    try {
      await api.deleteDepartment(token, confirmId)
      await queryClient.invalidateQueries({ queryKey: ['admin-departments'] })
      toastSuccess('Department deleted.')
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
        title="Departments"
        subtitle={data && `${data.meta.total} total`}
        action={<PrimaryLink to="/admin/departments/new">New Department</PrimaryLink>}
      />

      <Toolbar>
        <div className="w-full max-w-xs">
          <TextInput
            placeholder="Search departments"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
      </Toolbar>

      {isPending ? (
        <LoadingState label="Loading departments" />
      ) : isError ? (
        <ErrorMessage message="Failed to load departments." />
      ) : data.data.length === 0 ? (
        <EmptyState message="No departments found." />
      ) : (
        <>
          <TableCard>
            <DataTable>
              <TableHead>
                <tr>
                  <Th>Name</Th>
                  <Th>Short Name</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </TableHead>
              <tbody className="divide-y divide-gray-100">
                {data.data.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <Td className="font-medium text-gray-950">{d.name}</Td>
                    <Td className="text-gray-600">{d.shortName}</Td>
                    <Td>
                      <RowActions>
                        <Link to={`/admin/departments/${d.id}/edit`} className="text-xs font-medium text-blue-600 hover:underline">Edit</Link>
                        <Button type="button" variant="dangerLink" onClick={() => setConfirmId(d.id)}>Delete</Button>
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
        title="Delete department"
        description={`Delete ${confirmDepartment?.name ?? 'this department'}? This cannot be undone.`}
        confirmLabel="Delete"
        busy={deleting}
        onCancel={() => setConfirmId(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
