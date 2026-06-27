import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useAdminSubmissions } from '../../hooks/admin'
import { api } from '../../lib/api'
import { Spinner } from '../../components/ui/Spinner'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { Pagination } from '../../components/ui/Pagination'
import { Badge } from '../../components/ui/Badge'
import { SearchableSelect } from '../../components/ui/SearchableSelect'
import { PageHeader, PrimaryLink, Card, TextInput, EmptyState, formatDate } from '../../components/admin/ui'
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
  const [error, setError] = useState<string | null>(null)

  async function handleDelete(id: number) {
    if (!token || !window.confirm('Delete this submission? This cannot be undone.')) return
    setError(null)
    try {
      await api.deleteSubmission(token, id)
      queryClient.invalidateQueries({ queryKey: ['admin-submissions'] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.')
    }
  }

  return (
    <div>
      <PageHeader
        title="Submissions"
        subtitle={data && `${data.meta.total} total`}
        action={<PrimaryLink to="/admin/submissions/new">+ New Submission</PrimaryLink>}
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <TextInput className="w-32" placeholder="Question ID" value={questionId} onChange={e => { setQuestionId(e.target.value.replace(/\D/g, '')); setPage(1) }} />
        <TextInput className="w-32" placeholder="User ID" value={userId} onChange={e => { setUserId(e.target.value.replace(/\D/g, '')); setPage(1) }} />
        <div className="w-48">
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
      </div>

      {error && <div className="mb-4"><ErrorMessage message={error} /></div>}

      {isPending ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : isError ? (
        <ErrorMessage message="Failed to load submissions." />
      ) : data.data.length === 0 ? (
        <EmptyState message="No submissions found." />
      ) : (
        <>
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Question</th>
                  <th className="px-4 py-3 font-medium">Contributor</th>
                  <th className="px-4 py-3 font-medium">Watermark</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.data.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{s.question.title}</td>
                    <td className="px-4 py-3 text-gray-600">{s.contributor ? `@${s.contributor.username}` : '—'}</td>
                    <td className="px-4 py-3"><Badge label={s.watermarkStatus} variant={watermarkVariant(s.watermarkStatus)} /></td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(s.createdAt)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {s.pdfUrl && <a href={s.pdfUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-gray-500 hover:underline">PDF</a>}
                      <Link to={`/admin/submissions/${s.id}/edit`} className="ml-4 text-xs font-medium text-blue-600 hover:underline">Edit</Link>
                      <button onClick={() => handleDelete(s.id)} className="ml-4 text-xs font-medium text-red-500 hover:underline">Delete</button>
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
