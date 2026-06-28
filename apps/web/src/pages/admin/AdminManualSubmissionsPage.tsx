import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useAdminManualSubmissions } from '../../hooks/admin'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { Pagination } from '../../components/ui/Pagination'
import { Badge } from '../../components/ui/Badge'
import { SearchableSelect } from '../../components/ui/SearchableSelect'
import {
  DataTable,
  EmptyState,
  LoadingState,
  PageHeader,
  RowActions,
  TableCard,
  TableHead,
  Td,
  TextInput,
  Th,
  Toolbar,
  formatDate,
} from '../../components/admin/ui'
import type { ManualSubmission } from '@diuqbank/shared/types'

const statusVariant = (s: ManualSubmission['status']) =>
  s === 'approved' ? 'green' : s === 'rejected' ? 'red' : 'yellow'
const statusLabel = (s: ManualSubmission['status']) =>
  s === 'approved' ? 'Approved' : s === 'rejected' ? 'Rejected' : 'Pending Review'

export function AdminManualSubmissionsPage() {
  const { token } = useAuth()
  const [searchParams] = useSearchParams()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<ManualSubmission['status'] | ''>(
    (searchParams.get('status') as ManualSubmission['status'] | null) ?? ''
  )
  const [userId, setUserId] = useState('')
  const { data, isPending, isError } = useAdminManualSubmissions(token, page, { status, userId })

  return (
    <div>
      <PageHeader title="Manual Submissions" subtitle={data && `${data.meta.total} total`} />

      <Toolbar>
        <div className="w-full max-w-52">
          <SearchableSelect
            placeholder="Any status"
            options={[
              { value: 'pending_review', label: 'Pending Review' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
            ]}
            value={status}
            onChange={v => { setStatus(v as ManualSubmission['status'] | ''); setPage(1) }}
          />
        </div>
        <TextInput className="w-full max-w-32" placeholder="User ID" value={userId} onChange={e => { setUserId(e.target.value.replace(/\D/g, '')); setPage(1) }} />
      </Toolbar>

      {isPending ? (
        <LoadingState label="Loading manual submissions" />
      ) : isError ? (
        <ErrorMessage message="Failed to load manual submissions." />
      ) : data.data.length === 0 ? (
        <EmptyState message="No manual submissions found." />
      ) : (
        <>
          <TableCard>
            <DataTable>
              <TableHead>
                <tr>
                  <Th>Course</Th>
                  <Th>Contributor</Th>
                  <Th>Status</Th>
                  <Th>Date</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </TableHead>
              <tbody className="divide-y divide-gray-100">
                {data.data.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <Td className="font-medium text-gray-950">{s.course.name}</Td>
                    <Td className="text-gray-600">@{s.contributor.username}</Td>
                    <Td><Badge label={statusLabel(s.status)} variant={statusVariant(s.status)} /></Td>
                    <Td className="text-gray-500">{formatDate(s.createdAt)}</Td>
                    <Td>
                      <RowActions>
                        <Link to={`/admin/manual-submissions/${s.id}`} className="text-xs font-medium text-blue-600 hover:underline">Review</Link>
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
    </div>
  )
}
