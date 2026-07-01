import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useManualSubmissions } from "../hooks/queries";
import { Pagination } from "../components/ui/Pagination";
import { SubmissionTabs } from "../components/submissions/SubmissionTabs";
import { SubmissionCard } from "../components/submissions/SubmissionCard";
import { cx } from "../lib/cx";
import { parsePositiveIntParam } from "../lib/searchParams";

export default function ManualSubmissionList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePositiveIntParam(searchParams, "page");
  const { data, isPending, isError, error, isFetching } = useManualSubmissions({
    page,
    perPage: 12,
  });

  useEffect(() => {
    document.title = "Manual submissions | DIUQBank";
  }, []);

  function goToPage(next: number) {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("page", String(next));
      return params;
    });
  }

  return (
    <main className="container mx-auto flex-1 px-4 py-8 sm:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-gray-200 pb-6 dark:border-gray-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-3xl">
            Your submissions
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Papers you've submitted for review.
            {data?.meta.total ? ` ${data.meta.total} total.` : ""}
          </p>
        </div>
        <Link
          to="/submissions/manual/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          New submission
        </Link>
      </div>

      <div className="mb-6 max-w-md">
        <SubmissionTabs />
      </div>

      {isError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          Failed to load submissions: {error.message}
        </p>
      ) : isPending ? (
        <p className="rounded-lg border border-dashed border-gray-200 py-14 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
          Loading submissions…
        </p>
      ) : data.data.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 py-16 text-center dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            No manual submissions yet
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Upload a question paper with the department, course, semester, and
            exam type filled in for a reviewer.
          </p>
          <Link
            to="/submissions/manual/new"
            className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Create your first submission
          </Link>
        </div>
      ) : (
        <>
          <div
            className={cx(
              "grid gap-4 transition-opacity sm:grid-cols-2 xl:grid-cols-3",
              isFetching && "opacity-60"
            )}
          >
            {data.data.map((sub) => (
              <SubmissionCard
                key={sub.id}
                to={`/submissions/manual/${sub.id}`}
                title={sub.courseName}
                meta={`${sub.departmentShortName} · ${sub.semesterName} · ${sub.examTypeName}`}
                status={sub.status}
                createdAt={sub.createdAt}
              />
            ))}
          </div>
          <Pagination meta={data.meta} onPageChange={goToPage} />
        </>
      )}
    </main>
  );
}
