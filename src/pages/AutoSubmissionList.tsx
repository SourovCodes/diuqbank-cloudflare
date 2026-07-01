import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAutoSubmissions } from "../hooks/queries";
import { Pagination } from "../components/ui/Pagination";
import { SubmissionStatusBadge } from "../components/ui/SubmissionStatusBadge";
import { SubmissionTabs } from "../components/submissions/SubmissionTabs";
import { cx } from "../lib/cx";
import { formatDate } from "../lib/format";
import { parsePositiveIntParam } from "../lib/searchParams";

export default function AutoSubmissionList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePositiveIntParam(searchParams, "page");
  const { data, isPending, isError, error, isFetching } = useAutoSubmissions({
    page,
    perPage: 10,
  });

  useEffect(() => {
    document.title = "Auto submissions | DIUQBank";
  }, []);

  function goToPage(next: number) {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("page", String(next));
      return params;
    });
  }

  return (
    <main className="container mx-auto max-w-4xl flex-1 px-4 py-8 sm:py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-3xl">
          My submissions
        </h1>
        <Link
          to="/submissions/auto/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          New AI upload
        </Link>
      </div>

      <div className="mb-6">
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
            No AI submissions yet
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Just upload a PDF — our AI reads the paper and fills in the details
            for you.
          </p>
          <Link
            to="/submissions/auto/new"
            className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Upload a PDF
          </Link>
        </div>
      ) : (
        <>
          <div className={cx("flex flex-col gap-3 transition-opacity", isFetching && "opacity-60")}>
            {data.data.map((sub) => {
              const title = sub.courseName ?? "Processing…";
              const meta = [sub.departmentShortName, sub.semesterName, sub.examTypeName]
                .filter(Boolean)
                .join(" · ");
              return (
                <Link
                  key={sub.id}
                  to={`/submissions/auto/${sub.id}`}
                  className="group grid gap-3 rounded-lg border border-gray-200 bg-white p-4 transition hover:border-blue-300 hover:bg-blue-50/40 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-500 dark:hover:bg-blue-500/5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-gray-900 group-hover:text-blue-700 dark:text-gray-100 dark:group-hover:text-blue-400">
                      {title}
                    </h3>
                    {meta && (
                      <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
                        {meta}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 sm:justify-end">
                    <SubmissionStatusBadge status={sub.status} />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(sub.createdAt)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
          <Pagination meta={data.meta} onPageChange={goToPage} />
        </>
      )}
    </main>
  );
}
