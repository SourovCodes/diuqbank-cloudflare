import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getFilterOptions, getQuestions } from "../api";
import { FilterBar } from "../components/questions/FilterBar";
import { QuestionCard } from "../components/questions/QuestionCard";
import { Pagination } from "../components/ui/Pagination";
import { cx } from "../lib/cx";

export default function QuestionList() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = {
    page: Number(searchParams.get("page")) || 1,
    departmentId: searchParams.get("departmentId") ?? "",
    courseId: searchParams.get("courseId") ?? "",
    semesterId: searchParams.get("semesterId") ?? "",
    examTypeId: searchParams.get("examTypeId") ?? "",
  };

  const [options, setOptions] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getFilterOptions().then(setOptions).catch(() => {});
  }, []);

  // Filters live in the URL, so refetch whenever the query string changes.
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getQuestions({
      page: Number(searchParams.get("page")) || 1,
      perPage: 20,
      departmentId: searchParams.get("departmentId") ?? "",
      courseId: searchParams.get("courseId") ?? "",
      semesterId: searchParams.get("semesterId") ?? "",
      examTypeId: searchParams.get("examTypeId") ?? "",
    })
      .then((r) => active && setResult(r))
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [searchParams]);

  function updateFilter(key, value) {
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

  function handleDepartmentChange(deptId) {
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

  function goToPage(page) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", String(page));
      return next;
    });
  }

  return (
    <main className="container mx-auto flex-1 px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Browse Questions</h1>
        {result && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {result.meta.total.toLocaleString()} questions found
          </p>
        )}
      </div>

      {options && (
        <div className="mb-6">
          <FilterBar
            options={options}
            filters={filters}
            onFilterChange={updateFilter}
            onDepartmentChange={handleDepartmentChange}
            onClear={clearFilters}
          />
        </div>
      )}

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          Failed to load questions: {error}
        </p>
      ) : loading && !result ? (
        <p className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
          Loading…
        </p>
      ) : (
        <>
          <div
            className={cx(
              "flex flex-col gap-3 transition-opacity",
              loading && "opacity-60"
            )}
          >
            {result?.data.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-gray-200 py-16 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
                No questions match your filters.
              </div>
            ) : (
              result?.data.map((q) => <QuestionCard key={q.id} question={q} />)
            )}
          </div>

          {result && <Pagination meta={result.meta} onPageChange={goToPage} />}
        </>
      )}
    </main>
  );
}
