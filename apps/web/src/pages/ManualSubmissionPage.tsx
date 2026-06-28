import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useFilterOptions } from '../hooks/useFilterOptions'
import { api } from '../lib/api'
import { SearchableSelect } from '../components/ui/SearchableSelect'
import { CreatableSelect } from '../components/ui/CreatableSelect'
import { FileUpload } from '../components/ui/FileUpload'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { toastError, toastSuccess } from '../lib/toast'

export function ManualSubmissionPage() {
  useDocumentTitle('Manual Submission')
  const { token } = useAuth()
  const navigate = useNavigate()
  const { data: filterOptions } = useFilterOptions()

  const [departmentName, setDepartmentName] = useState('')
  const [departmentShortName, setDepartmentShortName] = useState('')
  const [courseName, setCourseName] = useState('')
  const [semesterName, setSemesterName] = useState('')
  const [examTypeId, setExamTypeId] = useState('')
  const [section, setSection] = useState('')
  const [batch, setBatch] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const examType = filterOptions?.examTypes.find(e => String(e.id) === examTypeId)

  const matchedDept = filterOptions?.departments.find(
    d => d.name.trim().toLowerCase() === departmentName.trim().toLowerCase()
  )
  const isCustomDept = departmentName.trim() !== '' && !matchedDept

  const visibleCourses = matchedDept
    ? (filterOptions?.courses.filter(c => c.departmentId === matchedDept.id) ?? [])
    : []

  function handleDeptChange(name: string) {
    setDepartmentName(name)
    setDepartmentShortName('')
    setCourseName('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token || !file || !examType) return
    const deptShortName = matchedDept?.shortName ?? departmentShortName.trim()
    if (!departmentName.trim() || !deptShortName || !courseName.trim() || !semesterName.trim()) return
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('pdf', file)
      fd.append('departmentName', departmentName.trim())
      fd.append('departmentShortName', deptShortName)
      fd.append('courseName', courseName.trim())
      fd.append('semesterName', semesterName.trim())
      fd.append('examTypeName', examType.name)
      if (section.trim()) fd.append('section', section.trim())
      if (batch.trim()) fd.append('batch', batch.trim())
      const created = await api.createManualSubmission(token, fd)
      toastSuccess('Submitted for review.')
      navigate(`/my/manual-submissions/${created.id}`)
    } catch (err) {
      toastError(err, 'Submission failed.')
      setSubmitting(false)
    }
  }

  const isValid =
    !!file &&
    !!departmentName.trim() &&
    (!isCustomDept || !!departmentShortName.trim()) &&
    !!courseName.trim() &&
    !!semesterName.trim() &&
    !!examTypeId

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
            <CreatableSelect
              options={filterOptions?.departments.map(d => ({ value: d.name, label: `${d.name} (${d.shortName})` })) ?? []}
              value={departmentName}
              onChange={handleDeptChange}
              placeholder="Select or type a department"
            />
          </div>

          {isCustomDept && (
            <div>
              <label className={labelClass}>Department Short Name *</label>
              <input
                type="text"
                value={departmentShortName}
                onChange={e => setDepartmentShortName(e.target.value)}
                placeholder="e.g. CSE"
                className={inputClass}
              />
            </div>
          )}

          <div>
            <label className={labelClass}>Course *</label>
            <CreatableSelect
              options={visibleCourses.map(c => ({ value: c.name, label: c.name }))}
              value={courseName}
              onChange={setCourseName}
              placeholder={departmentName.trim() ? 'Select or type a course' : 'Select department first'}
              disabled={!departmentName.trim()}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Semester *</label>
              <CreatableSelect
                options={filterOptions?.semesters.map(s => ({ value: s.name, label: s.name })) ?? []}
                value={semesterName}
                onChange={setSemesterName}
                placeholder="Select or type a semester"
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
