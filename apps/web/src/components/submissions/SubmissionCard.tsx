import { Link } from "react-router-dom";
import { SubmissionStatusBadge } from "../ui/SubmissionStatusBadge";
import type { AutoSubmission, ManualSubmission } from "../../types/api";
import { formatDate } from "../../lib/format";

type Props = {
  to: string;
  title: string;
  meta: string | null;
  status: ManualSubmission["status"] | AutoSubmission["status"];
  createdAt: number;
};

export function SubmissionCard({ to, title, meta, status, createdAt }: Props) {
  return (
    <Link
      to={to}
      className="group flex flex-col rounded-xl border border-gray-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-500"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 truncate text-sm font-semibold text-gray-900 group-hover:text-blue-700 dark:text-gray-100 dark:group-hover:text-blue-400">
          {title}
        </h3>
        <SubmissionStatusBadge status={status} />
      </div>
      <p className="mt-1.5 line-clamp-2 min-h-[2.5rem] text-xs leading-5 text-gray-500 dark:text-gray-400">
        {meta || "Details pending…"}
      </p>
      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-xs dark:border-gray-800">
        <span className="text-gray-500 dark:text-gray-400">
          {formatDate(createdAt)}
        </span>
        <span className="font-semibold text-blue-600 group-hover:text-blue-700 dark:text-blue-400">
          View →
        </span>
      </div>
    </Link>
  );
}
