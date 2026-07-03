import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  useAdminAutoSubmissions,
  useAdminManualSubmissions,
  useAdminQuestions,
  useAdminSubmissions,
  useAdminUsers,
} from "../../hooks/adminQueries";
import { AdminHeader } from "./shared";

function StatCard({
  label,
  value,
  hint,
  to,
  highlight,
}: {
  label: string;
  value: number | undefined;
  hint?: string;
  to: string;
  highlight?: boolean;
}) {
  return (
    <Link
      to={to}
      className={
        "rounded-xl border p-5 transition hover:shadow-sm " +
        (highlight && value
          ? "border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10"
          : "border-gray-200 bg-white hover:border-blue-300 dark:border-gray-800 dark:bg-gray-900")
      }
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
        {value ?? "—"}
      </p>
      {hint && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>
      )}
    </Link>
  );
}

export default function AdminDashboard() {
  useEffect(() => {
    document.title = "Admin | DIUQBank";
  }, []);

  // perPage: 1 — we only need `meta.total`, not the rows.
  const manualPending = useAdminManualSubmissions({
    page: 1,
    perPage: 1,
    status: "pending_review",
  });
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Manual — pending review"
          value={manualPending.data?.meta.total}
          hint="Awaiting approval"
          to="/admin/manual-submissions"
          highlight
        />
        <StatCard
          label="Auto — needs review"
          value={autoNeedsReview.data?.meta.total}
          hint="AI flagged for a human"
          to="/admin/auto-submissions"
          highlight
        />
        <StatCard
          label="Users"
          value={users.data?.meta.total}
          to="/admin/users"
        />
        <StatCard
          label="Questions"
          value={questions.data?.meta.total}
          to="/admin/questions"
        />
        <StatCard
          label="Published submissions"
          value={submissions.data?.meta.total}
          to="/admin/submissions"
        />
      </div>
    </div>
  );
}
