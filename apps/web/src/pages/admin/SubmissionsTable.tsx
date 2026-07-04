import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminSubmissions } from "../../hooks/adminQueries";
import type { AdminSubmission } from "../../types/api";
import { DataTable, type Column } from "../../components/admin/DataTable";
import { Pagination } from "../../components/ui/Pagination";
import { Badge } from "../../components/ui/Badge";
import { formatBytes, formatDate } from "../../lib/format";
import { ErrorBox } from "./shared";

// eslint-disable-next-line react/only-export-components -- badge variant map co-located with the table that renders it
export const WATERMARK_VARIANT = {
  awaiting: "yellow",
  completed: "green",
  failed: "red",
} as const;

/**
 * Embedded list of published submissions scoped to one question or one user,
 * used on the admin detail pages. Pagination is local component state so it
 * doesn't fight the host page's URL params.
 */
export function SubmissionsTable({
  questionId,
  userId,
  showQuestion = false,
}: {
  questionId?: number;
  userId?: number;
  showQuestion?: boolean;
}) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const { data, isPending, isError, error, isFetching } = useAdminSubmissions({
    page,
    perPage: 10,
    questionId,
    userId,
  });

  if (isError) {
    return <ErrorBox message={`Failed to load submissions: ${error.message}`} />;
  }

  const columns: Column<AdminSubmission>[] = [
    ...(showQuestion
      ? [
          {
            header: "Question",
            cell: (s: AdminSubmission) => (
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {s.question.title}
              </p>
            ),
          },
        ]
      : []),
    {
      header: "Contributor",
      cell: (s) => (
        <span className="text-gray-600 dark:text-gray-300">
          {s.contributor ? `@${s.contributor.username}` : "—"}
        </span>
      ),
    },
    {
      header: "Section / Batch",
      cell: (s) => (
        <span className="text-gray-600 dark:text-gray-300">
          {[s.section, s.batch].filter(Boolean).join(" / ") || "—"}
        </span>
      ),
    },
    {
      header: "Size",
      cell: (s) => (
        <span className="whitespace-nowrap tabular-nums text-gray-500 dark:text-gray-400">
          {formatBytes(s.fileSize)}
        </span>
      ),
      className: "text-right",
    },
    {
      header: "Views",
      cell: (s) => <span className="tabular-nums">{s.viewCount}</span>,
      className: "text-right",
    },
    {
      header: "Watermark",
      cell: (s) => (
        <Badge
          label={s.watermarkStatus}
          variant={WATERMARK_VARIANT[s.watermarkStatus]}
        />
      ),
    },
    {
      header: "Created",
      cell: (s) => (
        <span className="whitespace-nowrap text-gray-500 dark:text-gray-400">
          {formatDate(s.createdAt)}
        </span>
      ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        rowKey={(s) => s.id}
        isLoading={isPending}
        isFetching={isFetching}
        emptyMessage="No published submissions."
        onRowClick={(s) => navigate(`/admin/submissions/${s.id}`)}
      />
      {data && <Pagination meta={data.meta} onPageChange={setPage} />}
    </>
  );
}
