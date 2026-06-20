import { Book, Calendar, FileText, Filter, School } from "lucide-react";
import type { FilterOptions } from "@diuqbank/api-client";
import { Badge } from "@/components/ui/badge";
import { ClearFiltersButton } from "@/components/clear-filters-button";
import { ComboboxFilter } from "@/components/combobox-filter";
import { cn } from "@/lib/utils";

type FilterId = "department" | "course" | "semester" | "examType";
type InitialFilters = Record<FilterId, number | null>;
const filterKeys: Record<FilterId, string> = { department: "departmentId", course: "courseId", semester: "semesterId", examType: "examTypeId" };

export async function QuestionFilters({ initialFilters, filterOptions }: { initialFilters: InitialFilters; filterOptions: FilterOptions }) {
  const configs: Array<{ id: FilterId; label: string; icon: React.ReactNode; options: Array<{ id: number; name: string }>; clearParam?: string }> = [
    { id: "department", label: "Department", icon: <School className="size-4 text-blue-600 dark:text-blue-400" />, options: filterOptions.departments.map((item) => ({ id: item.id, name: item.shortName })), clearParam: "courseId" },
    { id: "course", label: "Course", icon: <Book className="size-4 text-emerald-600 dark:text-emerald-400" />, options: initialFilters.department ? filterOptions.courses.filter((item) => item.departmentId === initialFilters.department) : filterOptions.courses },
    { id: "semester", label: "Semester", icon: <Calendar className="size-4 text-purple-600 dark:text-purple-400" />, options: filterOptions.semesters },
    { id: "examType", label: "Exam Type", icon: <FileText className="size-4 text-amber-600 dark:text-amber-400" />, options: filterOptions.examTypes },
  ];
  const active = configs.flatMap((config) => { const value = initialFilters[config.id]; const option = value ? config.options.find((item) => item.id === value) : null; return option ? [{ id: config.id, name: option.name, icon: config.icon }] : []; });

  return <div className="rounded-xl border bg-card p-4 shadow-sm"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-lg font-medium"><Filter className="size-5 text-blue-600 dark:text-blue-400" />Filter Questions</h2><div className="flex flex-wrap items-center gap-2">{active.length ? <><div className="mr-2 flex flex-wrap gap-2">{active.map((filter) => <Badge key={filter.id} className={cn("gap-1 bg-primary/10 px-2 py-1 text-primary hover:bg-primary/20")}>{filter.icon}<span>{filter.name}</span></Badge>)}</div><ClearFiltersButton count={active.length} /></> : null}</div></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{configs.map((config) => { const value = initialFilters[config.id]; return <div key={config.id}><ComboboxFilter id={config.id} urlParam={filterKeys[config.id]} label={config.label} icon={config.icon} options={config.options} value={value ? String(value) : "all"} isActive={value !== null} clearParam={config.clearParam} /></div>; })}</div></div>;
}
