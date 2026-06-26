import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useAdminUsers } from '../../hooks/admin'
import { Spinner } from '../../components/ui/Spinner'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { Pagination } from '../../components/ui/Pagination'
import { Badge } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Avatar'
import { SearchableSelect } from '../../components/ui/SearchableSelect'
import { PageHeader, Card, TextInput, EmptyState } from '../../components/admin/ui'
import type { User } from '@diuqbank/shared/types'

export function AdminUsersPage() {
  const { token } = useAuth()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<User['role'] | ''>('')
  const { data, isPending, isError } = useAdminUsers(token, page, { search, role })

  return (
    <div>
      <PageHeader title="Users" subtitle={data && `${data.meta.total} total`} />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="max-w-xs flex-1">
          <TextInput placeholder="Search by name, username, email…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <div className="w-40">
          <SearchableSelect
            placeholder="Any role"
            options={[{ value: 'admin', label: 'Admin' }, { value: 'user', label: 'User' }]}
            value={role}
            onChange={v => { setRole(v as User['role'] | ''); setPage(1) }}
          />
        </div>
      </div>

      {isPending ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : isError ? (
        <ErrorMessage message="Failed to load users." />
      ) : data.data.length === 0 ? (
        <EmptyState message="No users found." />
      ) : (
        <>
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Subs</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.data.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} image={u.image} size={8} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-900">{u.name}</p>
                          <p className="truncate text-xs text-gray-500">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3"><Badge label={u.role} variant={u.role === 'admin' ? 'blue' : 'gray'} /></td>
                    <td className="px-4 py-3 text-gray-600">{u.submissionCount}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/admin/users/${u.id}/edit`} className="text-xs font-medium text-blue-600 hover:underline">Edit</Link>
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
