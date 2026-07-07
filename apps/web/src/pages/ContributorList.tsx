import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useContributors } from "../hooks/queries";
import { Pagination } from "../components/ui/Pagination";
import { AdSlot } from "../components/AdSlot";
import { SkeletonCard } from "../components/ui/Card";
import { cx } from "../lib/cx";
import { formatDate } from "../lib/format";
import { parsePositiveIntParam } from "../lib/searchParams";
import type { Contributor } from "../types/api";

export default function ContributorList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePositiveIntParam(searchParams, "page");
  const params = { page, perPage: 24 };
  const { data: result, isPending, isError, error, isFetching } =
    useContributors(params);

  useEffect(() => {
    document.title = "Contributors | DIUQBank";
  }, []);

  function goToPage(nextPage: number) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", String(nextPage));
      return next;
    });
  }

  return (
    <main className="container mx-auto flex-1 px-4 py-8 sm:py-10">
      <div className="mb-7 border-b border-gray-200 pb-6 dark:border-gray-800">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
          The community
        </p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl dark:text-gray-100">
          Contributors
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">
          Browse the people who helped build the question archive.
        </p>
      </div>

      {isError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          Failed to load contributors: {error.message}
        </p>
      ) : isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <>
          <div
            className={cx(
              "grid gap-3 transition-opacity sm:grid-cols-2 lg:grid-cols-3",
              isFetching && "opacity-60"
            )}
          >
            {result.data.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 py-16 text-center dark:border-gray-800 sm:col-span-2 lg:col-span-3">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  No contributors found
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Contributors will appear here once submissions are published.
                </p>
              </div>
            ) : (
              result.data.map((contributor) => (
                <ContributorCard
                  key={contributor.id}
                  contributor={contributor}
                />
              ))
            )}
          </div>

          {result.data.length > 0 && <AdSlot name="contributors-list" />}

          <Pagination meta={result.meta} onPageChange={goToPage} />
        </>
      )}
    </main>
  );
}

type ContributorCardProps = {
  contributor: Contributor;
};

function ContributorCard({ contributor }: ContributorCardProps) {
  return (
    <Link
      to={`/contributors/${encodeURIComponent(contributor.username)}`}
      state={{ contributor }}
      className="group flex min-w-0 gap-4 rounded-xl border border-gray-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-500"
    >
      <Avatar contributor={contributor} />

      <div className="min-w-0 flex-1">
        <h2 className="truncate text-sm font-semibold leading-6 text-gray-900 group-hover:text-blue-700 dark:text-gray-100 dark:group-hover:text-blue-400">
          {contributor.name}
        </h2>
        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
          @{contributor.username}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span className="font-semibold text-gray-800 dark:text-gray-200">
            {contributor.submissionCount} submission
            {contributor.submissionCount !== 1 ? "s" : ""}
          </span>
          <span className="text-gray-500 dark:text-gray-400">
            Since {formatDate(contributor.createdAt)}
          </span>
        </div>
      </div>
    </Link>
  );
}

function Avatar({ contributor }: ContributorCardProps) {
  if (contributor.image) {
    return (
      <img
        src={contributor.image}
        alt=""
        className="h-12 w-12 shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-sm font-bold text-white">
      {contributor.name[0]?.toUpperCase() ?? "?"}
    </div>
  );
}
