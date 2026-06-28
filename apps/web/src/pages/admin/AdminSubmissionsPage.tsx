import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useAdminSubmissions } from '../../hooks/admin'
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
  TextInput,
  Th,
  Toolbar,
  formatDate,
} from '../../components/admin/ui'
import type { WatermarkStatus } from '@diuqbank/shared/types'

const watermarkVariant = (s: WatermarkStatus) =>
  s === 'completed' ? 'green' : s === 'failed' ? 'red' : 'yellow'

export function AdminSubmissionsPage() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [questionId, setQuestionId] = useState('')
  const [userId, setUserId] = useState('')
  const [watermarkStatus, setWatermarkStatus] = useState<WatermarkStatus | ''>('')
  const { data, isPending, isError } = useAdminSubmissions(token, page, { questionId, userId, watermarkStatus })
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const confirmSubmission = data?.data.find(s => s.id === confirmId)

  async function handleDelete() {
    if (!token || confirmId === null) return
    setDeleting(true)
    try {
      await api.deleteSubmission(token, confirmId)
      await queryClient.invalidateQueries({ queryKey: ['admin-submissions'] })
      toastSuccess('Submission deleted.')
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
        title="Submissions"
        subtitle={data && `${data.meta.total} total`}
        action={<PrimaryLink to="/admin/submissions/new">New Submission</PrimaryLink>}
      />

      <Toolbar>
        <TextInput className="w-full max-w-32" placeholder="Question ID" value={questionId} onChange={e => { setQuestionId(e.target.value.replace(/\D/g, '')); setPage(1) }} />
        <TextInput className="w-full max-w-32" placeholder="User ID" value={userId} onChange={e => { setUserId(e.target.value.replace(/\D/g, '')); setPage(1) }} />
        <div className="w-full max-w-48">
          <SearchableSelect
            placeholder="Any watermark"
            options={[
              { value: 'awaiting', label: 'Awaiting' },
              { value: 'completed', label: 'Completed' },
              { value: 'failed', label: 'Failed' },
            ]}
            value={watermarkStatus}
            onChange={v => { setWatermarkStatus(v as WatermarkStatus | ''); setPage(1) }}
          />
        </div>
      </Toolbar>

      {isPending ? (
        <LoadingState label="Loading submissions" />
      ) : isError ? (
        <ErrorMessage message="Failed to load submissions." />
      ) : data.data.length === 0 ? (
        <EmptyState message="No submissions found." />
      ) : (
        <>
          <TableCard>
            <DataTable>
              <TableHead>
                <tr>
                  <Th>Question</Th>
                  <Th>Contributor</Th>
                  <Th>Watermark</Th>
                  <Th>Date</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </TableHead>
              <tbody className="divide-y divide-gray-100">
                {data.data.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <Td className="max-w-md truncate font-medium text-gray-950">{s.question.title}</Td>
                    <Td className="text-gray-600">{s.contributor ? `@${s.contributor.username}` : '-'}</Td>
                    <Td><Badge label={s.watermarkStatus} variant={watermarkVariant(s.watermarkStatus)} /></Td>
                    <Td className="text-gray-500">{formatDate(s.createdAt)}</Td>
                    <Td>
                      <RowActions>
                        {s.pdfUrl && <a href={s.pdfUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-gray-500 hover:underline">PDF</a>}
                        <Link to={`/admin/submissions/${s.id}/edit`} className="text-xs font-medium text-blue-600 hover:underline">Edit</Link>
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
        title="Delete submission"
        description={`Delete ${confirmSubmission?.question.title ?? 'this submission'}? This cannot be undone.`}
        confirmLabel="Delete"
        busy={deleting}
        onCancel={() => setConfirmId(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
