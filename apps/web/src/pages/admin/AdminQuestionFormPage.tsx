import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useFilterOptions } from '../../hooks/useFilterOptions'
import { api } from '../../lib/api'
import { Spinner } from '../../components/ui/Spinner'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { SearchableSelect } from '../../components/ui/SearchableSelect'
import { PageHeader, Card, Field, SubmitButton } from '../../components/admin/ui'

export function AdminQuestionFormPage() {
  const { token } = useAuth()
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: options } = useFilterOptions()

  const [departmentId, setDepartmentId] = useState('')
  const [courseId, setCourseId] = useState('')
  const [semesterId, setSemesterId] = useState('')
  const [examTypeId, setExamTypeId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data, isPending } = useQuery({
    queryKey: ['admin-questions', 'detail', Number(id)],
    queryFn: () => api.adminQuestion(token!, Number(id)),
    enabled: isEdit && !!token,
  })

  useEffect(() => {
    if (data) {
      setDepartmentId(String(data.departmentId))
      setCourseId(String(data.courseId))
      setSemesterId(String(data.semesterId))
      setExamTypeId(String(data.examTypeId))
    }
  }, [data])

  const opt = (items: { id: number; name: string }[] | undefined) =>
    (items ?? []).map(i => ({ value: String(i.id), label: i.name }))
  const courses = options?.courses.filter(c => !departmentId || String(c.departmentId) === departmentId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    if (!departmentId || !courseId || !semesterId || !examTypeId) {
      setError('All four fields are required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const body = {
        departmentId: Number(departmentId), courseId: Number(courseId),
        semesterId: Number(semesterId), examTypeId: Number(examTypeId),
      }
      if (isEdit) await api.updateQuestion(token, Number(id), body)
      else await api.createQuestion(token, body)
      queryClient.invalidateQueries({ queryKey: ['admin-questions'] })
      navigate('/admin/questions')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.')
      setSaving(false)
    }
  }

  if (isEdit && isPending) return <div className="flex justify-center py-16"><Spinner /></div>

  return (
    <div className="max-w-lg">
      <PageHeader title={isEdit ? 'Edit Question' : 'New Question'} />
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Department">
            <SearchableSelect placeholder="Select department" options={opt(options?.departments)} value={departmentId} onChange={v => { setDepartmentId(v); setCourseId('') }} />
          </Field>
          <Field label="Course">
            <SearchableSelect placeholder="Select course" options={opt(courses)} value={courseId} onChange={setCourseId} disabled={!departmentId} />
          </Field>
          <Field label="Semester">
            <SearchableSelect placeholder="Select semester" options={opt(options?.semesters)} value={semesterId} onChange={setSemesterId} />
          </Field>
          <Field label="Exam Type">
            <SearchableSelect placeholder="Select exam type" options={opt(options?.examTypes)} value={examTypeId} onChange={setExamTypeId} />
          </Field>
          {error && <ErrorMessage message={error} />}
          <div className="flex gap-3">
            <SubmitButton saving={saving}>{isEdit ? 'Save changes' : 'Create'}</SubmitButton>
            <button type="button" onClick={() => navigate('/admin/questions')} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          </div>
        </form>
      </Card>
    </div>
  )
}
