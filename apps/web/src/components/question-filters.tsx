"use client";

import { usePathname, useRouter } from "next/navigation";
import { Book, Calendar, FileText, Filter, FilterX, School } from "lucide-react";
import type { FilterOptions } from "@diuqbank/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ComboboxFilter } from "@/components/combobox-filter";

type Values = { departmentId?: number; courseId?: number; semesterId?: number; examTypeId?: number };

export function QuestionFilters({ options, values }: { options: FilterOptions; values: Values }) {
  const router = useRouter();
  const pathname = usePathname();
  const courses = values.departmentId ? options.courses.filter((item) => item.departmentId === values.departmentId) : options.courses;
  const selected = [
    values.departmentId ? options.departments.find((item) => item.id === values.departmentId)?.shortName : null,
    values.courseId ? options.courses.find((item) => item.id === values.courseId)?.name : null,
    values.semesterId ? options.semesters.find((item) => item.id === values.semesterId)?.name : null,
    values.examTypeId ? options.examTypes.find((item) => item.id === values.examTypeId)?.name : null,
  ].filter(Boolean) as string[];

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-medium"><Filter className="size-5 text-blue-600 dark:text-blue-400" />Filter Questions</h2>
        {selected.length ? <div className="flex flex-wrap items-center gap-2">{selected.map((name) => <Badge key={name} className="bg-primary/10 text-primary">{name}</Badge>)}<Button variant="outline" size="sm" onClick={() => router.push(pathname, { scroll: false })}><FilterX />Clear{selected.length > 1 ? ` (${selected.length})` : ""}</Button></div> : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ComboboxFilter label="Department" param="departmentId" value={values.departmentId} options={options.departments.map((item) => ({ id: item.id, name: item.shortName }))} clearCourse icon={<School className="size-4 text-blue-600 dark:text-blue-400" />} />
        <ComboboxFilter label="Course" param="courseId" value={values.courseId} options={courses} icon={<Book className="size-4 text-emerald-600 dark:text-emerald-400" />} />
        <ComboboxFilter label="Semester" param="semesterId" value={values.semesterId} options={options.semesters} icon={<Calendar className="size-4 text-purple-600 dark:text-purple-400" />} />
        <ComboboxFilter label="Exam Type" param="examTypeId" value={values.examTypeId} options={options.examTypes} icon={<FileText className="size-4 text-amber-600 dark:text-amber-400" />} />
      </div>
    </section>
  );
}
