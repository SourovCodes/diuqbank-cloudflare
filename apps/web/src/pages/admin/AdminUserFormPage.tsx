import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { Spinner } from '../../components/ui/Spinner'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { SearchableSelect } from '../../components/ui/SearchableSelect'
import { PageHeader, Card, Field, TextInput, SubmitButton } from '../../components/admin/ui'
import type { User } from '@diuqbank/shared/types'

const USERNAME_RE = /^[a-z0-9_.-]+$/

export function AdminUserFormPage() {
  const { token } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [role, setRole] = useState<User['role']>('user')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data, isPending } = useQuery({
    queryKey: ['admin-users', 'detail', Number(id)],
    queryFn: () => api.adminUser(token!, Number(id)),
    enabled: !!token,
  })

  useEffect(() => {
    if (data) { setName(data.name); setUsername(data.username); setRole(data.role) }
  }, [data])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    if (username.length < 3 || username.length > 50 || !USERNAME_RE.test(username)) {
      setError('Username must be 3–50 chars: lowercase letters, numbers, dots, underscores, hyphens.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await api.updateUser(token, Number(id), { name, username, role })
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      navigate('/admin/users')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.')
      setSaving(false)
    }
  }

  if (isPending) return <div className="flex justify-center py-16"><Spinner /></div>

  return (
    <div className="max-w-lg">
      <PageHeader title="Edit User" subtitle={data && data.email} />
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Full name">
            <TextInput value={name} onChange={e => setName(e.target.value)} required maxLength={100} />
          </Field>
          <Field label="Username" hint="3–50 chars; lowercase letters, numbers, . _ -">
            <TextInput value={username} onChange={e => setUsername(e.target.value)} required />
          </Field>
          <Field label="Role">
            <SearchableSelect
              options={[{ value: 'admin', label: 'Admin' }, { value: 'user', label: 'User' }]}
              value={role}
              onChange={v => setRole(v as User['role'])}
            />
          </Field>
          {error && <ErrorMessage message={error} />}
          <div className="flex gap-3">
            <SubmitButton saving={saving}>Save changes</SubmitButton>
            <button type="button" onClick={() => navigate('/admin/users')} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          </div>
        </form>
      </Card>
    </div>
  )
}
