import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useFilterOptions, useQuestions } from "../hooks/queries";
import { FilterBar } from "../components/questions/FilterBar";
import { QuestionCard } from "../components/questions/QuestionCard";
import { Pagination } from "../components/ui/Pagination";
import { cx } from "../lib/cx";
import type { QuestionFilters } from "../types/api";

type FilterKey = Exclude<keyof QuestionFilters, "page" | "perPage">;

export default function QuestionList() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: QuestionFilters = {
    page: Number(searchParams.get("page")) || 1,
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
    <main className="container mx-auto flex-1 px-4 py-6 sm:py-8">
      <div className="mb-6">
        <FilterBar
          options={options}
          filters={filters}
          onFilterChange={updateFilter}
          onDepartmentChange={handleDepartmentChange}
          onClear={clearFilters}
          disabled={isFilterOptionsPending}
        />
      </div>

      {isError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          Failed to load questions: {error.message}
        </p>
      ) : isPending ? (
        <p className="rounded-lg border border-dashed border-gray-200 py-14 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
          Loading questions...
        </p>
      ) : (
        <>
          <div
            className={cx(
              "flex flex-col gap-3 transition-opacity",
              isFetching && "opacity-60"
            )}
          >
            {result.data.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 py-16 text-center dark:border-gray-800">
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

          <Pagination meta={result.meta} onPageChange={goToPage} />
        </>
      )}
    </main>
  );
}
