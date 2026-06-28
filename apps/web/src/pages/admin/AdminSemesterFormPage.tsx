import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { semesterCreateSchema } from '@diuqbank/shared/schemas/admin/semesters'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { toastError, toastSuccess } from '../../lib/toast'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { Button, Card, Field, FormActions, LoadingState, PageHeader, SubmitButton, TextInput } from '../../components/admin/ui'

export function AdminSemesterFormPage() {
  const { token } = useAuth()
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data, isPending } = useQuery({
    queryKey: ['admin-semesters', 'detail', Number(id)],
    queryFn: () => api.adminSemester(token!, Number(id)),
    enabled: isEdit && !!token,
  })

  useEffect(() => { if (data) setName(data.name) }, [data])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    // Validate with the same Zod schema the API enforces (shared package).
    const parsed = semesterCreateSchema.safeParse({ name })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please check the form.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (isEdit) await api.updateSemester(token, Number(id), parsed.data)
      else await api.createSemester(token, parsed.data)
      queryClient.invalidateQueries({ queryKey: ['admin-semesters'] })
      toastSuccess(isEdit ? 'Semester updated.' : 'Semester created.')
      navigate('/admin/semesters')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.')
      toastError(err, 'Save failed.')
      setSaving(false)
    }
  }

  if (isEdit && isPending) return <LoadingState label="Loading semester" />

  return (
    <div className="max-w-lg">
      <PageHeader title={isEdit ? 'Edit Semester' : 'New Semester'} />
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Name" hint="e.g. Spring 2025">
            <TextInput value={name} onChange={e => setName(e.target.value)} required maxLength={100} />
          </Field>
          {error && <ErrorMessage message={error} />}
          <FormActions>
            <SubmitButton saving={saving}>{isEdit ? 'Save changes' : 'Create'}</SubmitButton>
            <Button type="button" variant="secondary" onClick={() => navigate('/admin/semesters')}>Cancel</Button>
          </FormActions>
        </form>
      </Card>
    </div>
  )
}
