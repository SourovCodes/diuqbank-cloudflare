import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useAdminUsers } from '../../hooks/admin'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { Pagination } from '../../components/ui/Pagination'
import { Badge } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Avatar'
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
} from '../../components/admin/ui'
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

      <Toolbar>
        <div className="w-full max-w-xs">
          <TextInput placeholder="Search name, username, email" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <div className="w-full max-w-40">
          <SearchableSelect
            placeholder="Any role"
            options={[{ value: 'admin', label: 'Admin' }, { value: 'user', label: 'User' }]}
            value={role}
            onChange={v => { setRole(v as User['role'] | ''); setPage(1) }}
          />
        </div>
      </Toolbar>

      {isPending ? (
        <LoadingState label="Loading users" />
      ) : isError ? (
        <ErrorMessage message="Failed to load users." />
      ) : data.data.length === 0 ? (
        <EmptyState message="No users found." />
      ) : (
        <>
          <TableCard>
            <DataTable>
              <TableHead>
                <tr>
                  <Th>User</Th>
                  <Th>Email</Th>
                  <Th>Role</Th>
                  <Th>Subs</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </TableHead>
              <tbody className="divide-y divide-gray-100">
                {data.data.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} image={u.image} size={8} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-950">{u.name}</p>
                          <p className="truncate text-xs text-gray-500">@{u.username}</p>
                        </div>
                      </div>
                    </Td>
                    <Td className="text-gray-600">{u.email}</Td>
                    <Td><Badge label={u.role} variant={u.role === 'admin' ? 'blue' : 'gray'} /></Td>
                    <Td className="text-gray-600">{u.submissionCount}</Td>
                    <Td>
                      <RowActions>
                        <Link to={`/admin/users/${u.id}/edit`} className="text-xs font-medium text-blue-600 hover:underline">Edit</Link>
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
