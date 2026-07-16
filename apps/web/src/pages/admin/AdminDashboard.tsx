import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  useAdminAutoSubmissions,
  useAdminQuestions,
  useAdminSubmissions,
  useAdminUsers,
} from "../../hooks/adminQueries";
import {
  ChevronRightIcon,
  FileQuestionIcon,
  FileTextIcon,
  SparklesIcon,
  UsersIcon,
  type Icon,
} from "../../components/icons";
import { cx } from "../../lib/cx";
import { AdminHeader } from "./shared";

function SectionLabel({ children }: { children: string }) {
  return (
    <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-600">
      {children}
    </h2>
  );
}

function CountSkeleton({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        "inline-block animate-pulse rounded-md bg-gray-200 dark:bg-gray-800",
        className
      )}
    />
  );
}

/** A review queue that needs a human — highlighted while items are waiting. */
function QueueCard({
  icon: QueueIcon,
  label,
  hint,
  count,
  to,
}: {
  icon: Icon;
  label: string;
  hint: string;
  count: number | undefined;
  to: string;
}) {
  const pending = (count ?? 0) > 0;

  return (
    <Link
      to={to}
      className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 transition hover:border-gray-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
    >
      <span
        className={cx(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          pending
            ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
            : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
        )}
      >
        <QueueIcon className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">
          {label}
        </span>
        <span className="mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400">
          {count === 0 ? "Queue is clear" : hint}
        </span>
      </span>
      {count === undefined ? (
        <CountSkeleton className="h-7 w-8" />
      ) : (
        <span
          className={cx(
            "text-2xl font-semibold tabular-nums tracking-tight",
            pending
              ? "text-amber-600 dark:text-amber-400"
              : "text-gray-300 dark:text-gray-600"
          )}
        >
          {count.toLocaleString()}
        </span>
      )}
      <ChevronRightIcon className="h-4 w-4 shrink-0 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-gray-500 dark:text-gray-600 dark:group-hover:text-gray-400" />
    </Link>
  );
}

/** A plain total for the content library. */
function StatCard({
  icon: StatIcon,
  label,
  value,
  to,
}: {
  icon: Icon;
  label: string;
  value: number | undefined;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="group rounded-xl border border-gray-200 bg-white p-5 transition hover:border-gray-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <StatIcon
          className="h-4 w-4 text-gray-300 transition group-hover:text-gray-400 dark:text-gray-600 dark:group-hover:text-gray-500"
          strokeWidth={1.75}
        />
      </div>
      {value === undefined ? (
        <CountSkeleton className="mt-3 h-8 w-14" />
      ) : (
        <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-gray-900 dark:text-gray-100">
          {value.toLocaleString()}
        </p>
      )}
    </Link>
  );
}

export default function AdminDashboard() {
  useEffect(() => {
    document.title = "Admin | DIUQBank";
  }, []);

  // perPage: 1 — we only need `meta.total`, not the rows.
  const autoNeedsReview = useAdminAutoSubmissions({
    page: 1,
    perPage: 1,
    status: "needs_review",
  });
  const users = useAdminUsers({ page: 1, perPage: 1 });
  const questions = useAdminQuestions({ page: 1, perPage: 1 });
  const submissions = useAdminSubmissions({ page: 1, perPage: 1 });

  return (
    <div>
      <AdminHeader
        title="Dashboard"
        description="Review queues and content at a glance."
      />

      <section>
        <SectionLabel>Needs attention</SectionLabel>
        <div className="grid gap-4 xl:grid-cols-2">
          <QueueCard
            icon={SparklesIcon}
            label="Auto submissions"
            hint="AI flagged for a human"
            count={autoNeedsReview.data?.meta.total}
            to="/admin/auto-submissions"
          />
        </div>
      </section>

      <section className="mt-8">
        <SectionLabel>Library</SectionLabel>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            icon={FileQuestionIcon}
            label="Questions"
            value={questions.data?.meta.total}
            to="/admin/questions"
          />
          <StatCard
            icon={FileTextIcon}
            label="Published submissions"
            value={submissions.data?.meta.total}
            to="/admin/submissions"
          />
          <StatCard
            icon={UsersIcon}
            label="Users"
            value={users.data?.meta.total}
            to="/admin/users"
          />
        </div>
      </section>
    </div>
  );
}
