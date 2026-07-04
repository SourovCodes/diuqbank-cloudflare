import { SearchableSelect } from "../ui/SearchableSelect";
import type { FilterOptions, QuestionFilters, SelectOption } from "../../types/api";

const labelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400";

type FilterKey = Exclude<keyof QuestionFilters, "page" | "perPage">;

type FilterBarProps = {
  options?: FilterOptions;
  filters: QuestionFilters;
  onFilterChange: (key: FilterKey, value: string) => void;
  onDepartmentChange: (deptId: string) => void;
  onClear: () => void;
  disabled?: boolean;
};

function withInvalidOption(
  options: SelectOption[],
  value: string,
  invalidLabel: string,
  optionsLoaded: boolean
) {
  if (!optionsLoaded || !value || options.some((o) => o.value === value)) {
    return options;
  }

  return [{ value, label: invalidLabel }, ...options];
}

export function FilterBar({
  options,
  filters,
  onFilterChange,
  onDepartmentChange,
  onClear,
  disabled = false,
}: FilterBarProps) {
  const departments = options?.departments ?? [];
  const courses = options?.courses ?? [];
  const semesters = options?.semesters ?? [];
  const examTypes = options?.examTypes ?? [];
  const optionsLoaded = !!options;

  const visibleCourses = filters.departmentId
    ? courses.filter((c) => c.departmentId === Number(filters.departmentId))
    : courses;

  const deptShort = new Map(departments.map((d) => [d.id, d.shortName]));
  const departmentOptions = withInvalidOption(
    departments.map((d) => ({ value: String(d.id), label: d.name })),
    filters.departmentId,
    "Invalid Department",
    optionsLoaded
  );
  const courseOptions = withInvalidOption(
    visibleCourses.map((c) => ({
      value: String(c.id),
      label: filters.departmentId
        ? c.name
        : `${c.name} (${deptShort.get(c.departmentId) ?? "?"})`,
    })),
    filters.courseId,
    "Invalid Course",
    optionsLoaded
  );
  const semesterOptions = withInvalidOption(
    semesters.map((s) => ({ value: String(s.id), label: s.name })),
    filters.semesterId,
    "Invalid Semester",
    optionsLoaded
  );
  const examTypeOptions = withInvalidOption(
    examTypes.map((e) => ({ value: String(e.id), label: e.name })),
    filters.examTypeId,
    "Invalid Exam Type",
    optionsLoaded
  );

  const hasFilters = !!(
    filters.departmentId ||
    filters.courseId ||
    filters.semesterId ||
    filters.examTypeId
  );

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <span id="department-filter-label" className={labelClass}>
            Department
          </span>
          <SearchableSelect
            id="department-filter"
            label="Department"
            options={departmentOptions}
            value={filters.departmentId}
            onChange={onDepartmentChange}
            placeholder="All departments"
            disabled={disabled}
          />
        </div>
        <div>
          <span id="course-filter-label" className={labelClass}>
            Course
          </span>
          <SearchableSelect
            id="course-filter"
            label="Course"
            options={courseOptions}
            value={filters.courseId}
            onChange={(v) => onFilterChange("courseId", v)}
            placeholder="All courses"
            disabled={disabled}
          />
        </div>
        <div>
          <span id="semester-filter-label" className={labelClass}>
            Semester
          </span>
          <SearchableSelect
            id="semester-filter"
            label="Semester"
            options={semesterOptions}
            value={filters.semesterId}
            onChange={(v) => onFilterChange("semesterId", v)}
            placeholder="All semesters"
            disabled={disabled}
          />
        </div>
        <div>
          <span id="exam-type-filter-label" className={labelClass}>
            Exam Type
          </span>
          <SearchableSelect
            id="exam-type-filter"
            label="Exam Type"
            options={examTypeOptions}
            value={filters.examTypeId}
            onChange={(v) => onFilterChange("examTypeId", v)}
            placeholder="All types"
            disabled={disabled}
          />
        </div>
      </div>

      {hasFilters && (
        <div className="mt-3 flex justify-end">
          <button
            onClick={onClear}
            className="rounded-md px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 hover:text-blue-800 dark:text-blue-400 dark:hover:bg-blue-500/10"
          >
            Clear filters
          </button>
        </div>
      )}
    </section>
  );
}
