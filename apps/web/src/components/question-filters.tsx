"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useTransition } from "react";
import { Filter, RotateCcw } from "lucide-react";
import type { FilterOptions } from "@diuqbank/api-client";

type FilterValues = {
  departmentId?: number;
  courseId?: number;
  semesterId?: number;
  examTypeId?: number;
};

export function QuestionFilters({
  options,
  values,
}: {
  options: FilterOptions;
  values: FilterValues;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const courses = useMemo(
    () =>
      values.departmentId
        ? options.courses.filter((course) => course.departmentId === values.departmentId)
        : options.courses,
    [options.courses, values.departmentId],
  );

  const update = (key: keyof FilterValues, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    if (key === "departmentId") params.delete("courseId");
    params.set("page", "1");
    startTransition(() => router.push(`${pathname}?${params.toString()}`, { scroll: false }));
  };

  const clear = () => startTransition(() => router.push(pathname, { scroll: false }));
  const hasFilters = Object.values(values).some(Boolean);

  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5" aria-busy={pending}>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 font-bold text-slate-900">
          <Filter className="size-4.5 text-primary" /> Filter questions
        </h2>
        {hasFilters ? (
          <button type="button" onClick={clear} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-primary">
            <RotateCcw className="size-3.5" /> Clear
          </button>
        ) : null}
      </div>
      <div className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-4 ${pending ? "opacity-60" : ""}`}>
        <Select label="Department" value={values.departmentId} onChange={(value) => update("departmentId", value)} options={options.departments.map((item) => ({ id: item.id, name: item.shortName }))} />
        <Select label="Course" value={values.courseId} onChange={(value) => update("courseId", value)} options={courses} />
        <Select label="Semester" value={values.semesterId} onChange={(value) => update("semesterId", value)} options={options.semesters} />
        <Select label="Exam type" value={values.examTypeId} onChange={(value) => update("examTypeId", value)} options={options.examTypes} />
      </div>
    </section>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value?: number;
  options: Array<{ id: number; name: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
      {label}
      <select
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border bg-slate-50 px-3 text-sm font-medium normal-case tracking-normal text-slate-800 outline-none transition focus:border-primary focus:ring-3 focus:ring-blue-100"
      >
        <option value="">All {label.toLowerCase()}s</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>{option.name}</option>
        ))}
      </select>
    </label>
  );
}
