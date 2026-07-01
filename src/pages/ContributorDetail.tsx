import { useEffect } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import {
  useContributor,
  useContributorSubmissions,
} from "../hooks/queries";
import { Badge } from "../components/ui/Badge";
import { Pagination } from "../components/ui/Pagination";
import { StatusPage } from "../components/ui/StatusPage";
import { cx } from "../lib/cx";
import { formatBytes, formatDate } from "../lib/format";
import type {
  Contributor,
  ContributorSubmission,
} from "../types/api";

type ContributorDetailLocationState = {
  contributor?: Contributor;
};

export default function ContributorDetail() {
  const { username } = useParams();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get("page")) || 1;
  const initialContributor = (
    location.state as ContributorDetailLocationState | null
  )?.contributor;
  const {
    data: contributor,
    isPending: isContributorPending,
    isError: isContributorError,
  } = useContributor(username, initialContributor);
  const {
    data: submissions,
    isPending: isSubmissionsPending,
    isError: isSubmissionsError,
    error: submissionsError,
    isFetching: isSubmissionsFetching,
  } = useContributorSubmissions(username, { page, perPage: 12 });

  useEffect(() => {
    document.title = isContributorError
      ? "Contributor Not Found | DIUQBank"
      : contributor?.name
        ? `${contributor.name} | DIUQBank`
        : "Contributor | DIUQBank";
  }, [contributor?.name, isContributorError]);

  function goToPage(nextPage: number) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", String(nextPage));
      return next;
    });
  }

  if (isContributorPending) {
    return (
      <div className="container mx-auto flex-1 px-4 py-16">
        <div className="rounded-lg border border-dashed border-gray-200 py-14 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
          Loading contributor...
        </div>
      </div>
    );
  }

  if (isContributorError || !contributor) {
    return (
      <StatusPage
        eyebrow="Contributor unavailable"
        title="Contributor not found"
        description="This profile may have been removed, unpublished, or the link may be incorrect."
        actions={[
          { label: "Browse Contributors", to: "/contributors" },
          { label: "Browse Questions", to: "/questions", variant: "secondary" },
        ]}
      />
    );
  }

  return (
    <main className="container mx-auto flex-1 px-4 py-10 sm:py-12">
      <Link
        to="/contributors"
        className="mb-6 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
      >
        Back to contributors
      </Link>

      <header className="mb-7 flex flex-col gap-5 border-b border-gray-200 pb-6 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar contributor={contributor} size="large" />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-3xl">
              {contributor.name}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              @{contributor.username}
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-3 sm:min-w-72">
          <Stat label="Submissions" value={String(contributor.submissionCount)} />
          <Stat label="Joined" value={formatDate(contributor.createdAt)} />
        </dl>
      </header>

      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Published submissions
          </h2>
          {submissions?.meta.total ? (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {submissions.meta.total} total
            </span>
          ) : null}
        </div>

        {isSubmissionsError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            Failed to load submissions: {submissionsError.message}
          </p>
        ) : isSubmissionsPending ? (
          <p className="rounded-lg border border-dashed border-gray-200 py-14 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
            Loading submissions...
          </p>
        ) : (
          <>
            <div
              className={cx(
                "flex flex-col gap-3 transition-opacity",
                isSubmissionsFetching && "opacity-60"
              )}
            >
              {submissions.data.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 py-16 text-center dark:border-gray-800">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    No submissions found
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Published submissions from this contributor will appear here.
                  </p>
                </div>
              ) : (
                submissions.data.map((submission) => (
                  <SubmissionRow
                    key={submission.id}
                    submission={submission}
                  />
                ))
              )}
            </div>

            <Pagination meta={submissions.meta} onPageChange={goToPage} />
          </>
        )}
      </section>
    </main>
  );
}

type StatProps = {
  label: string;
  value: string;
};

function Stat({ label, value }: StatProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-bold text-gray-900 dark:text-gray-100">
        {value}
      </dd>
    </div>
  );
}

type SubmissionRowProps = {
  submission: ContributorSubmission;
};

function SubmissionRow({ submission }: SubmissionRowProps) {
  return (
    <Link
      to={`/questions/${submission.question.id}`}
      className="group rounded-lg border border-gray-200 bg-white p-4 transition hover:border-blue-300 hover:bg-blue-50/40 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-500 dark:hover:bg-blue-500/5"
    >
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-6 text-gray-900 group-hover:text-blue-700 dark:text-gray-100 dark:group-hover:text-blue-400">
            {submission.question.title}
          </h3>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge label={submission.question.department.shortName} variant="blue" />
            <Badge label={submission.question.semester.name} variant="gray" />
            <Badge label={submission.question.examType.name} variant="green" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 sm:justify-end dark:text-gray-400">
          <span>{formatDate(submission.createdAt)}</span>
          <span>{formatBytes(submission.fileSize)}</span>
          <span className="font-semibold text-blue-600 group-hover:text-blue-700 dark:text-blue-400">
            View
          </span>
        </div>
      </div>

      {(submission.section || submission.batch) && (
        <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-gray-100 pt-3 text-xs dark:border-gray-800">
          {submission.section && (
            <Meta label="Section" value={submission.section} />
          )}
          {submission.batch && <Meta label="Batch" value={submission.batch} />}
        </dl>
      )}
    </Link>
  );
}

function Meta({ label, value }: StatProps) {
  return (
    <div className="flex gap-1">
      <dt className="text-gray-500 dark:text-gray-400">{label}:</dt>
      <dd className="font-medium text-gray-800 dark:text-gray-200">{value}</dd>
    </div>
  );
}

type AvatarProps = {
  contributor: Contributor;
  size: "large";
};

function Avatar({ contributor }: AvatarProps) {
  if (contributor.image) {
    return (
      <img
        src={contributor.image}
        alt=""
        className="h-16 w-16 shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
      {contributor.name[0]?.toUpperCase() ?? "?"}
    </div>
  );
}
