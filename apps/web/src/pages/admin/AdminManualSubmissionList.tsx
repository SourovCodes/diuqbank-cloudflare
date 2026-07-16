import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminManualSubmissions } from "../../hooks/adminQueries";
import {
  approveManualSubmission,
  deleteAdminManualSubmission,
  rejectManualSubmission,
  type AdminManualSubmissionParams,
} from "../../api";
import type { ManualSubmissionStatus } from "../../types/api";
import { DataTable, type Column } from "../../components/admin/DataTable";
import {
  BulkBar,
  BulkButton,
  BulkRejectModal,
  useBulkActions,
} from "../../components/admin/bulk";
import { Pagination } from "../../components/ui/Pagination";
import { SubmissionStatusBadge } from "../../components/ui/SubmissionStatusBadge";
import { inputClass } from "../../components/ui/form";
import { formatDate } from "../../lib/format";
import { AdminHeader, ErrorBox, usePageParam } from "./shared";

type Row = NonNullable<
  ReturnType<typeof useAdminManualSubmissions>["data"]
>["data"][number];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "pending", label: "Pending review" },
  { value: "published", label: "Published" },
  { value: "rejected", label: "Rejected" },
  { value: "", label: "All statuses" },
];

export default function AdminManualSubmissionList() {
  const navigate = useNavigate();
  const { page, setPage, searchParams, setSearchParams } = usePageParam();
  const status = searchParams.get("status") ?? "pending";
  const bulk = useBulkActions([
    ["admin", "manual-submissions"],
    ["admin", "manual-submission"],
  ]);
  const [rejectOpen, setRejectOpen] = useState(false);

  useEffect(() => {
    document.title = "Review queue | Admin";
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
      header: "Paper",
      cell: (r) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {r.courseName ?? "Untitled"}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {[r.departmentName, r.semesterName, r.examTypeName]
              .filter(Boolean)
              .join(" · ") || "No details"}
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
        title="Review queue"
        description={
          data?.meta.total
            ? `${data.meta.total} matching submissions.`
            : "User uploads awaiting review."
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
          <BulkBar bulk={bulk}>
            <BulkButton
              label="Approve & publish"
              bulk={bulk}
              onClick={() => bulk.run("Approve", approveManualSubmission)}
            />
            <BulkButton
              label="Reject…"
              bulk={bulk}
              variant="danger"
              onClick={() => setRejectOpen(true)}
            />
            <BulkButton
              label="Delete"
              bulk={bulk}
              variant="danger"
              onClick={() => {
                if (
                  confirm(
                    `Delete ${bulk.selected.size} manual submission(s) and their uploaded PDFs? Published live submissions keep their own copies.`
                  )
                ) {
                  bulk.run("Delete", deleteAdminManualSubmission);
                }
              }}
            />
          </BulkBar>
          <DataTable
            columns={columns}
            rows={data?.data ?? []}
            rowKey={(r) => r.id}
            isLoading={isPending}
            isFetching={isFetching}
            emptyMessage="No submissions match this filter."
            onRowClick={(r) => navigate(`/admin/manual-submissions/${r.id}`)}
            selection={{
              selected: bulk.selected,
              onChange: bulk.onSelectionChange,
            }}
          />
          {data && <Pagination meta={data.meta} onPageChange={setPage} />}
        </>
      )}

      <BulkRejectModal
        open={rejectOpen}
        count={bulk.selected.size}
        onClose={() => setRejectOpen(false)}
        onSubmit={(reason) => {
          setRejectOpen(false);
          bulk.run("Reject", (id) => rejectManualSubmission(id, reason));
        }}
      />
    </div>
  );
}
