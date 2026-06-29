import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useAdminCourses } from '../../hooks/admin'
import { useFilterOptions } from '../../hooks/useFilterOptions'
import { api } from '../../lib/api'
import { toastError, toastSuccess } from '../../lib/toast'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { Pagination } from '../../components/ui/Pagination'
import { SearchableSelect } from '../../components/ui/SearchableSelect'
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

export function AdminCoursesPage() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const { data, isPending, isError } = useAdminCourses(token, page, departmentId, search)
  const { data: options } = useFilterOptions()
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const deptName = (id: number) => options?.departments.find(d => d.id === id)?.shortName ?? `#${id}`
  const confirmCourse = data?.data.find(c => c.id === confirmId)

  async function handleDelete() {
    if (!token || confirmId === null) return
    setDeleting(true)
    try {
      await api.deleteCourse(token, confirmId)
      await queryClient.invalidateQueries({ queryKey: ['admin-courses'] })
      toastSuccess('Course deleted.')
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
        title="Courses"
        subtitle={data && `${data.meta.total} total`}
        action={
          <div className="flex gap-2">
            <SecondaryLink to="/admin/courses/merge">Merge</SecondaryLink>
            <PrimaryLink to="/admin/courses/new">New Course</PrimaryLink>
          </div>
        }
      />

      <Toolbar>
        <div className="w-full max-w-xs">
          <TextInput placeholder="Search courses" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <div className="w-full max-w-56">
          <SearchableSelect
            placeholder="All departments"
            options={(options?.departments ?? []).map(d => ({ value: String(d.id), label: d.name }))}
            value={departmentId}
            onChange={v => { setDepartmentId(v); setPage(1) }}
          />
        </div>
      </Toolbar>

      {isPending ? (
        <LoadingState label="Loading courses" />
      ) : isError ? (
        <ErrorMessage message="Failed to load courses." />
      ) : data.data.length === 0 ? (
        <EmptyState message="No courses found." />
      ) : (
        <>
          <TableCard>
            <DataTable>
              <TableHead>
                <tr>
                  <Th>Name</Th>
                  <Th>Department</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </TableHead>
              <tbody className="divide-y divide-gray-100">
                {data.data.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <Td className="font-medium text-gray-950">{c.name}</Td>
                    <Td className="text-gray-600">{deptName(c.departmentId)}</Td>
                    <Td>
                      <RowActions>
                        <Link to={`/admin/courses/${c.id}/edit`} className="text-xs font-medium text-blue-600 hover:underline">Edit</Link>
                        <Button type="button" variant="dangerLink" onClick={() => setConfirmId(c.id)}>Delete</Button>
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
        title="Delete course"
        description={`Delete ${confirmCourse?.name ?? 'this course'}? This cannot be undone.`}
        confirmLabel="Delete"
        busy={deleting}
        onCancel={() => setConfirmId(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
