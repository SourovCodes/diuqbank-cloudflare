import { SearchableSelect } from '../ui/SearchableSelect'
import type { FilterOptions, QuestionFilters } from '@diuqbank/shared/types'

type Props = {
  options: FilterOptions
  filters: QuestionFilters
  onFilterChange: (key: keyof QuestionFilters, value: string) => void
  onDepartmentChange: (deptId: string) => void
  onClear: () => void
}

export function FilterBar({ options, filters, onFilterChange, onDepartmentChange, onClear }: Props) {
  const visibleCourses = filters.departmentId
    ? options.courses.filter(c => c.departmentId === Number(filters.departmentId))
    : options.courses

  const hasFilters = !!(filters.departmentId || filters.courseId || filters.semesterId || filters.examTypeId)

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Department</label>
          <SearchableSelect
            options={options.departments.map(d => ({ value: String(d.id), label: d.name }))}
            value={filters.departmentId}
            onChange={onDepartmentChange}
            placeholder="All departments"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Course</label>
          <SearchableSelect
            options={visibleCourses.map(c => ({ value: String(c.id), label: c.name }))}
            value={filters.courseId}
            onChange={v => onFilterChange('courseId', v)}
            placeholder={filters.departmentId ? 'All courses' : 'Select dept first'}
            disabled={!filters.departmentId}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Semester</label>
          <SearchableSelect
            options={options.semesters.map(s => ({ value: String(s.id), label: s.name }))}
            value={filters.semesterId}
            onChange={v => onFilterChange('semesterId', v)}
            placeholder="All semesters"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Exam Type</label>
          <SearchableSelect
            options={options.examTypes.map(e => ({ value: String(e.id), label: e.name }))}
            value={filters.examTypeId}
            onChange={v => onFilterChange('examTypeId', v)}
            placeholder="All types"
          />
        </div>
      </div>

      {hasFilters && (
        <div className="mt-3 flex justify-end">
          <button
            onClick={onClear}
            className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  )
}
