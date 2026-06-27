import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useFilterOptions } from '../hooks/useFilterOptions'
import { api } from '../lib/api'
import { SearchableSelect } from '../components/ui/SearchableSelect'
import { FileUpload } from '../components/ui/FileUpload'
import { ErrorMessage } from '../components/ui/ErrorMessage'

export function ManualSubmissionPage() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const { data: filterOptions } = useFilterOptions()

  const [departmentId, setDepartmentId] = useState('')
  const [courseId, setCourseId] = useState('')
  const [semesterId, setSemesterId] = useState('')
  const [examTypeId, setExamTypeId] = useState('')
  const [section, setSection] = useState('')
  const [batch, setBatch] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dept = filterOptions?.departments.find(d => String(d.id) === departmentId)
  const course = filterOptions?.courses.find(c => String(c.id) === courseId)
  const semester = filterOptions?.semesters.find(s => String(s.id) === semesterId)
  const examType = filterOptions?.examTypes.find(e => String(e.id) === examTypeId)

  const visibleCourses = departmentId
    ? (filterOptions?.courses.filter(c => c.departmentId === Number(departmentId)) ?? [])
    : (filterOptions?.courses ?? [])

  function handleDeptChange(id: string) {
    setDepartmentId(id)
    setCourseId('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token || !file || !dept || !course || !semester || !examType) return
    setSubmitting(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('pdf', file)
      fd.append('departmentName', dept.name)
      fd.append('departmentShortName', dept.shortName)
      fd.append('courseName', course.name)
      fd.append('semesterName', semester.name)
      fd.append('examTypeName', examType.name)
      if (section.trim()) fd.append('section', section.trim())
      if (batch.trim()) fd.append('batch', batch.trim())
      const created = await api.createManualSubmission(token, fd)
      navigate(`/my/manual-submissions/${created.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed.')
      setSubmitting(false)
    }
  }

  const isValid = !!file && !!departmentId && !!courseId && !!semesterId && !!examTypeId

  const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
  const labelClass = 'mb-1 block text-xs font-medium text-gray-500'

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Manual Submission</h1>
      <p className="mb-6 text-sm text-gray-500">Upload a question paper PDF for admin review.</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Question Details</h2>

          <div>
            <label className={labelClass}>Department *</label>
            <SearchableSelect
              options={filterOptions?.departments.map(d => ({ value: String(d.id), label: d.name })) ?? []}
              value={departmentId}
              onChange={handleDeptChange}
              placeholder="Select department"
            />
          </div>

          <div>
            <label className={labelClass}>Course *</label>
            <SearchableSelect
              options={visibleCourses.map(c => ({ value: String(c.id), label: c.name }))}
              value={courseId}
              onChange={setCourseId}
              placeholder={departmentId ? 'Select course' : 'Select department first'}
              disabled={!departmentId}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Semester *</label>
              <SearchableSelect
                options={filterOptions?.semesters.map(s => ({ value: String(s.id), label: s.name })) ?? []}
                value={semesterId}
                onChange={setSemesterId}
                placeholder="Select semester"
              />
            </div>
            <div>
              <label className={labelClass}>Exam Type *</label>
              <SearchableSelect
                options={filterOptions?.examTypes.map(e => ({ value: String(e.id), label: e.name })) ?? []}
                value={examTypeId}
                onChange={setExamTypeId}
                placeholder="Select type"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Section (optional)</label>
              <input type="text" value={section} onChange={e => setSection(e.target.value)} placeholder="e.g. 46 H" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Batch (optional)</label>
              <input type="text" value={batch} onChange={e => setBatch(e.target.value)} placeholder="e.g. 46" className={inputClass} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">PDF File *</h2>
          <FileUpload file={file} onChange={setFile} disabled={submitting} />
        </div>

        {error && <ErrorMessage message={error} />}

        <button
          type="submit"
          disabled={!isValid || submitting}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Submitting…' : 'Submit for Review'}
        </button>
      </form>
    </div>
  )
}
