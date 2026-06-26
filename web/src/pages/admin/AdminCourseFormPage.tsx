import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { courseCreateSchema } from '@diuqbank/shared/schemas/admin/courses'
import { useAuth } from '../../context/AuthContext'
import { useFilterOptions } from '../../hooks/useFilterOptions'
import { api } from '../../lib/api'
import { Spinner } from '../../components/ui/Spinner'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { SearchableSelect } from '../../components/ui/SearchableSelect'
import { PageHeader, Card, Field, TextInput, SubmitButton } from '../../components/admin/ui'

export function AdminCourseFormPage() {
  const { token } = useAuth()
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: options } = useFilterOptions()

  const [name, setName] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data, isPending } = useQuery({
    queryKey: ['admin-courses', 'detail', Number(id)],
    queryFn: () => api.adminCourse(token!, Number(id)),
    enabled: isEdit && !!token,
  })

  useEffect(() => {
    if (data) { setName(data.name); setDepartmentId(String(data.departmentId)) }
  }, [data])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    if (!departmentId) { setError('Please select a department.'); return }
    // Validate with the same Zod schema the API enforces (shared package).
    const parsed = courseCreateSchema.safeParse({ name, departmentId: Number(departmentId) })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please check the form.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (isEdit) await api.updateCourse(token, Number(id), parsed.data)
      else await api.createCourse(token, parsed.data)
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] })
      navigate('/admin/courses')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.')
      setSaving(false)
    }
  }

  if (isEdit && isPending) return <div className="flex justify-center py-16"><Spinner /></div>

  return (
    <div className="max-w-lg">
      <PageHeader title={isEdit ? 'Edit Course' : 'New Course'} />
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Department">
            <SearchableSelect
              placeholder="Select department"
              options={(options?.departments ?? []).map(d => ({ value: String(d.id), label: d.name }))}
              value={departmentId}
              onChange={setDepartmentId}
            />
          </Field>
          <Field label="Name">
            <TextInput value={name} onChange={e => setName(e.target.value)} required maxLength={150} />
          </Field>
          {error && <ErrorMessage message={error} />}
          <div className="flex gap-3">
            <SubmitButton saving={saving}>{isEdit ? 'Save changes' : 'Create'}</SubmitButton>
            <button type="button" onClick={() => navigate('/admin/courses')} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          </div>
        </form>
      </Card>
    </div>
  )
}
