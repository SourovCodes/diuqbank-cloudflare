import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useAdminManualSubmissions } from '../../hooks/admin'
import { Spinner } from '../../components/ui/Spinner'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { Pagination } from '../../components/ui/Pagination'
import { Badge } from '../../components/ui/Badge'
import { SearchableSelect } from '../../components/ui/SearchableSelect'
import { PageHeader, Card, TextInput, EmptyState, formatDate } from '../../components/admin/ui'
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

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="w-48">
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
        <TextInput className="w-32" placeholder="User ID" value={userId} onChange={e => { setUserId(e.target.value.replace(/\D/g, '')); setPage(1) }} />
      </div>

      {isPending ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : isError ? (
        <ErrorMessage message="Failed to load manual submissions." />
      ) : data.data.length === 0 ? (
        <EmptyState message="No manual submissions found." />
      ) : (
        <>
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Course</th>
                  <th className="px-4 py-3 font-medium">Contributor</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.data.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{s.course.name}</td>
                    <td className="px-4 py-3 text-gray-600">@{s.contributor.username}</td>
                    <td className="px-4 py-3"><Badge label={statusLabel(s.status)} variant={statusVariant(s.status)} /></td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(s.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/admin/manual-submissions/${s.id}`} className="text-xs font-medium text-blue-600 hover:underline">Review →</Link>
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
