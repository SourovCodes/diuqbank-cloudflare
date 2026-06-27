import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { examTypeCreateSchema } from '@diuqbank/shared/schemas/admin/exam-types'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { Spinner } from '../../components/ui/Spinner'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { PageHeader, Card, Field, TextInput, SubmitButton } from '../../components/admin/ui'

export function AdminExamTypeFormPage() {
  const { token } = useAuth()
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data, isPending } = useQuery({
    queryKey: ['admin-exam-types', 'detail', Number(id)],
    queryFn: () => api.adminExamType(token!, Number(id)),
    enabled: isEdit && !!token,
  })

  useEffect(() => { if (data) setName(data.name) }, [data])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    // Validate with the same Zod schema the API enforces (shared package).
    const parsed = examTypeCreateSchema.safeParse({ name })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please check the form.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (isEdit) await api.updateExamType(token, Number(id), parsed.data)
      else await api.createExamType(token, parsed.data)
      queryClient.invalidateQueries({ queryKey: ['admin-exam-types'] })
      navigate('/admin/exam-types')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.')
      setSaving(false)
    }
  }

  if (isEdit && isPending) return <div className="flex justify-center py-16"><Spinner /></div>

  return (
    <div className="max-w-lg">
      <PageHeader title={isEdit ? 'Edit Exam Type' : 'New Exam Type'} />
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Name" hint="e.g. Midterm, Final">
            <TextInput value={name} onChange={e => setName(e.target.value)} required maxLength={100} />
          </Field>
          {error && <ErrorMessage message={error} />}
          <div className="flex gap-3">
            <SubmitButton saving={saving}>{isEdit ? 'Save changes' : 'Create'}</SubmitButton>
            <button type="button" onClick={() => navigate('/admin/exam-types')} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          </div>
        </form>
      </Card>
    </div>
  )
}
