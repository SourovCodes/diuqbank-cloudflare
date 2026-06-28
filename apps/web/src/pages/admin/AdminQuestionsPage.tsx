import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useAdminQuestions } from '../../hooks/admin'
import { useFilterOptions } from '../../hooks/useFilterOptions'
import { api } from '../../lib/api'
import { toastError, toastSuccess } from '../../lib/toast'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { Pagination } from '../../components/ui/Pagination'
import { Badge } from '../../components/ui/Badge'
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
  TableCard,
  TableHead,
  Td,
  Th,
  Toolbar,
} from '../../components/admin/ui'

export function AdminQuestionsPage() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const { data: options } = useFilterOptions()
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ departmentId: '', courseId: '', semesterId: '', examTypeId: '' })
  const { data, isPending, isError } = useAdminQuestions(token, page, filters)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  function setFilter(key: keyof typeof filters, value: string) {
    setFilters(f => ({ ...f, [key]: value }))
    setPage(1)
  }

  async function handleDelete() {
    if (!token || confirmId === null) return
    setDeleting(true)
    try {
      await api.deleteQuestion(token, confirmId)
      await queryClient.invalidateQueries({ queryKey: ['admin-questions'] })
      toastSuccess('Question deleted.')
      setConfirmId(null)
    } catch (err) {
      toastError(err, 'Delete failed.')
    } finally {
      setDeleting(false)
    }
  }

  const opt = (items: { id: number; name: string }[] | undefined) =>
    (items ?? []).map(i => ({ value: String(i.id), label: i.name }))
  const courses = options?.courses.filter(c => !filters.departmentId || String(c.departmentId) === filters.departmentId)
  const confirmQuestion = data?.data.find(q => q.id === confirmId)

  return (
    <div>
      <PageHeader
        title="Questions"
        subtitle={data && `${data.meta.total} total`}
        action={<PrimaryLink to="/admin/questions/new">New Question</PrimaryLink>}
      />

      <Toolbar>
        <div className="w-full max-w-52"><SearchableSelect placeholder="All departments" options={opt(options?.departments)} value={filters.departmentId} onChange={v => setFilter('departmentId', v)} /></div>
        <div className="w-full max-w-52"><SearchableSelect placeholder="All courses" options={opt(courses)} value={filters.courseId} onChange={v => setFilter('courseId', v)} /></div>
        <div className="w-full max-w-52"><SearchableSelect placeholder="All semesters" options={opt(options?.semesters)} value={filters.semesterId} onChange={v => setFilter('semesterId', v)} /></div>
        <div className="w-full max-w-52"><SearchableSelect placeholder="All exam types" options={opt(options?.examTypes)} value={filters.examTypeId} onChange={v => setFilter('examTypeId', v)} /></div>
      </Toolbar>

      {isPending ? (
        <LoadingState label="Loading questions" />
      ) : isError ? (
        <ErrorMessage message="Failed to load questions." />
      ) : data.data.length === 0 ? (
        <EmptyState message="No questions found." />
      ) : (
        <>
          <TableCard>
            <DataTable>
              <TableHead>
                <tr>
                  <Th>Course</Th>
                  <Th>Tags</Th>
                  <Th>Subs</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </TableHead>
              <tbody className="divide-y divide-gray-100">
                {data.data.map(q => (
                  <tr key={q.id} className="hover:bg-gray-50">
                    <Td className="font-medium text-gray-950">{q.course.name}</Td>
                    <Td>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge label={q.department.shortName} variant="blue" />
                        <Badge label={q.semester.name} variant="gray" />
                        <Badge label={q.examType.name} variant="green" />
                      </div>
                    </Td>
                    <Td className="text-gray-600">{q.submissionCount}</Td>
                    <Td>
                      <RowActions>
                        <Link to={`/questions/${q.id}`} className="text-xs font-medium text-gray-500 hover:underline">View</Link>
                        <Link to={`/admin/questions/${q.id}/edit`} className="text-xs font-medium text-blue-600 hover:underline">Edit</Link>
                        <Button type="button" variant="dangerLink" onClick={() => setConfirmId(q.id)}>Delete</Button>
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
        title="Delete question"
        description={`Delete ${confirmQuestion?.title ?? 'this question'} and its submissions? This cannot be undone.`}
        confirmLabel="Delete"
        busy={deleting}
        onCancel={() => setConfirmId(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
