import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAutoSubmissions } from "../../hooks/adminQueries";
import type { AdminAutoSubmissionParams } from "../../api";
import type { AutoSubmissionStatus } from "../../types/api";
import { DataTable, type Column } from "../../components/admin/DataTable";
import { Pagination } from "../../components/ui/Pagination";
import { SubmissionStatusBadge } from "../../components/ui/SubmissionStatusBadge";
import { inputClass } from "../../components/ui/form";
import { formatDate } from "../../lib/format";
import { AdminHeader, ErrorBox, usePageParam } from "./shared";

type Row = NonNullable<
  ReturnType<typeof useAdminAutoSubmissions>["data"]
>["data"][number];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "needs_review", label: "Needs review" },
  { value: "processing", label: "Processing" },
  { value: "published", label: "Published" },
  { value: "rejected", label: "Rejected" },
  { value: "failed", label: "Failed" },
  { value: "", label: "All statuses" },
];

export default function AdminAutoSubmissionList() {
  const navigate = useNavigate();
  const { page, setPage, searchParams, setSearchParams } = usePageParam();
  const status = searchParams.get("status") ?? "needs_review";

  useEffect(() => {
    document.title = "Auto queue | Admin";
  }, []);

  const params: AdminAutoSubmissionParams = {
    page,
    perPage: 20,
    status: status ? (status as AutoSubmissionStatus) : undefined,
  };
  const { data, isPending, isError, error, isFetching } =
    useAdminAutoSubmissions(params);

  function setStatus(next: string) {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (next) p.set("status", next);
      else p.delete("status");
      p.set("page", "1");
      return p;
    });
  }

  const columns: Column<Row>[] = [
    {
      header: "Detected paper",
      cell: (r) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {r.courseName ?? "Untitled"}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {[r.departmentShortName, r.semesterName, r.examTypeName]
              .filter(Boolean)
              .join(" · ") || "No metadata yet"}
          </p>
        </div>
      ),
    },
    {
      header: "Submitter",
      cell: (r) => (
        <span className="text-gray-800 dark:text-gray-200">
          @{r.contributor.username}
        </span>
      ),
    },
    { header: "Status", cell: (r) => <SubmissionStatusBadge status={r.status} /> },
    {
      header: "Uploaded",
      cell: (r) => (
        <span className="whitespace-nowrap text-gray-500 dark:text-gray-400">
          {formatDate(r.createdAt)}
        </span>
      ),
    },
  ];

  return (
    <div>
      <AdminHeader
        title="Auto review queue"
        description={
          data?.meta.total
            ? `${data.meta.total} matching submissions.`
            : "AI-processed uploads flagged for review."
        }
        actions={
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={`${inputClass} w-auto`}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        }
      />

      {isError ? (
        <ErrorBox message={`Failed to load queue: ${error.message}`} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={data?.data ?? []}
            rowKey={(r) => r.id}
            isLoading={isPending}
            isFetching={isFetching}
            emptyMessage="No submissions match this filter."
            onRowClick={(r) => navigate(`/admin/auto-submissions/${r.id}`)}
          />
          {data && <Pagination meta={data.meta} onPageChange={setPage} />}
        </>
      )}
    </div>
  );
}
