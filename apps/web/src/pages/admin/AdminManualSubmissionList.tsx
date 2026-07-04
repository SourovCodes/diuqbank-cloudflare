import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminManualSubmissions } from "../../hooks/adminQueries";
import type { AdminManualSubmissionParams } from "../../api";
import type { ManualSubmissionStatus } from "../../types/api";
import { DataTable, type Column } from "../../components/admin/DataTable";
import { Pagination } from "../../components/ui/Pagination";
import { SubmissionStatusBadge } from "../../components/ui/SubmissionStatusBadge";
import { inputClass } from "../../components/ui/form";
import { formatDate } from "../../lib/format";
import { AdminHeader, ErrorBox, usePageParam } from "./shared";

type Row = NonNullable<
  ReturnType<typeof useAdminManualSubmissions>["data"]
>["data"][number];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "pending_review", label: "Pending review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "", label: "All statuses" },
];

export default function AdminManualSubmissionList() {
  const navigate = useNavigate();
  const { page, setPage, searchParams, setSearchParams } = usePageParam();
  const status = searchParams.get("status") ?? "pending_review";

  useEffect(() => {
    document.title = "Manual queue | Admin";
  }, []);

  const params: AdminManualSubmissionParams = {
    page,
    perPage: 20,
    status: status ? (status as ManualSubmissionStatus) : undefined,
  };
  const { data, isPending, isError, error, isFetching } =
    useAdminManualSubmissions(params);

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
      header: "Course",
      cell: (r) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {r.courseName}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {r.departmentShortName} · {r.semesterName} · {r.examTypeName}
          </p>
        </div>
      ),
    },
    {
      header: "Submitter",
      cell: (r) => (
        <div>
          <p className="text-gray-800 dark:text-gray-200">{r.contributor.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            @{r.contributor.username}
          </p>
        </div>
      ),
    },
    { header: "Status", cell: (r) => <SubmissionStatusBadge status={r.status} /> },
    {
      header: "Submitted",
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
        title="Manual review queue"
        description={
          data?.meta.total ? `${data.meta.total} matching submissions.` : "Submissions waiting for a reviewer."
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
            onRowClick={(r) =>
              navigate(`/admin/manual-submissions/${r.id}`)
            }
          />
          {data && <Pagination meta={data.meta} onPageChange={setPage} />}
        </>
      )}
    </div>
  );
}
