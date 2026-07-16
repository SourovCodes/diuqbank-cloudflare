import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useManualSubmissions } from "../hooks/queries";
import { Pagination } from "../components/ui/Pagination";
import { SubmissionCard } from "../components/submissions/SubmissionCard";
import { SkeletonCard } from "../components/ui/Card";
import { cx } from "../lib/cx";
import { parsePositiveIntParam } from "../lib/searchParams";

export default function SubmissionList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePositiveIntParam(searchParams, "page");
  const { data, isPending, isError, error, isFetching } = useManualSubmissions({
    page,
    perPage: 12,
  });

  useEffect(() => {
    document.title = "Your submissions | DIUQBank";
  }, []);

  function goToPage(next: number) {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("page", String(next));
      return params;
    });
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-gray-200 pb-6 dark:border-gray-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-3xl">
            Your submissions
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Uploads awaiting review, published, or rejected.
            {data?.meta.total ? ` ${data.meta.total} total.` : ""}
          </p>
        </div>
        <Link
          to="/submissions/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          New upload
        </Link>
      </div>

      {isError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          Failed to load submissions: {error.message}
        </p>
      ) : isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : data.data.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            No submissions yet
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Upload a question paper PDF with its details — a reviewer publishes
            it once it checks out.
          </p>
          <Link
            to="/submissions/new"
            className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Upload a PDF
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
            {data.data.map((sub) => {
              const meta = [sub.departmentName, sub.semesterName, sub.examTypeName]
                .filter(Boolean)
                .join(" · ");
              return (
                <SubmissionCard
                  key={sub.id}
                  to={`/submissions/${sub.id}`}
                  title={sub.courseName ?? "Untitled"}
                  meta={meta || null}
                  status={sub.status}
                  createdAt={sub.createdAt}
                />
              );
            })}
          </div>
          <Pagination meta={data.meta} onPageChange={goToPage} />
        </>
      )}
    </div>
  );
}
