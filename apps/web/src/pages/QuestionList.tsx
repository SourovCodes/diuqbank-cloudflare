import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useFilterOptions, useQuestions } from "../hooks/queries";
import { FilterBar } from "../components/questions/FilterBar";
import { QuestionCard, QuestionCardSkeleton } from "../components/questions/QuestionCard";
import { AdSlot } from "../components/AdSlot";
import { Pagination } from "../components/ui/Pagination";
import { cx } from "../lib/cx";
import { parsePositiveIntParam } from "../lib/searchParams";
import type { QuestionFilters } from "../types/api";

type FilterKey = Exclude<keyof QuestionFilters, "page" | "perPage">;

export default function QuestionList() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: QuestionFilters = {
    page: parsePositiveIntParam(searchParams, "page"),
    perPage: 20,
    departmentId: searchParams.get("departmentId") ?? "",
    courseId: searchParams.get("courseId") ?? "",
    semesterId: searchParams.get("semesterId") ?? "",
    examTypeId: searchParams.get("examTypeId") ?? "",
  };

  const { data: options, isPending: isFilterOptionsPending } = useFilterOptions();
  const { data: result, isPending, isError, error, isFetching } =
    useQuestions(filters);

  useEffect(() => {
    document.title = "Questions | DIUQBank";
  }, []);

  function updateFilter(key: FilterKey, value: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        next.set("page", "1");
        return next;
      },
      { replace: true }
    );
  }

  function handleDepartmentChange(deptId: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (deptId) next.set("departmentId", deptId);
        else next.delete("departmentId");
        next.delete("courseId"); // department change invalidates course
        next.set("page", "1");
        return next;
      },
      { replace: true }
    );
  }

  function clearFilters() {
    setSearchParams({}, { replace: true });
  }

  function goToPage(page: number) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", String(page));
      return next;
    });
  }

  return (
    <main className="container mx-auto flex-1 px-4 py-8 sm:py-10">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
          Question archive
        </p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl dark:text-gray-100">
          Browse past questions
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">
          Filter by department, course, semester and exam type, then open any
          paper right in your browser.
        </p>
      </header>

      <div className="mb-5">
        <FilterBar
          options={options}
          filters={filters}
          onFilterChange={updateFilter}
          onDepartmentChange={handleDepartmentChange}
          onClear={clearFilters}
          disabled={isFilterOptionsPending}
        />
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          {isError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              Failed to load questions: {error.message}
            </p>
          ) : isPending ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <QuestionCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <>
              <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
                <span className="font-bold text-gray-900 dark:text-gray-100">
                  {result.meta.total.toLocaleString()}
                </span>{" "}
                {result.meta.total === 1 ? "paper" : "papers"} found
              </p>

              <div
                className={cx(
                  "flex flex-col gap-3 transition-opacity",
                  isFetching && "opacity-60"
                )}
              >
                {result.data.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center dark:border-gray-800">
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      No questions found
                    </h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Try relaxing one of the filters and search again.
                    </p>
                  </div>
                ) : (
                  result.data.map((q) => <QuestionCard key={q.id} question={q} />)
                )}
              </div>

              {result.data.length > 0 && <AdSlot name="questions-list" />}

              <Pagination meta={result.meta} onPageChange={goToPage} />
            </>
          )}
        </div>

        <aside className="hidden w-full shrink-0 lg:sticky lg:top-20 lg:block lg:w-80">
          <AdSlot name="questions-sidebar" className="!my-0" />
        </aside>
      </div>
    </main>
  );
}
