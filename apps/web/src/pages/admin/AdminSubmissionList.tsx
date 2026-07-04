import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { deleteAdminSubmission } from "../../api";
import type { AdminSubmission } from "../../types/api";
import { useAdminSubmissions } from "../../hooks/adminQueries";
import { DataTable, type Column } from "../../components/admin/DataTable";
import {
  BulkBar,
  BulkButton,
  useBulkActions,
} from "../../components/admin/bulk";
import { Pagination } from "../../components/ui/Pagination";
import { Badge } from "../../components/ui/Badge";
import { inputClass } from "../../components/ui/form";
import { formatBytes, formatDate } from "../../lib/format";
import { AdminHeader, ErrorBox, usePageParam } from "./shared";
import { WATERMARK_VARIANT } from "./SubmissionsTable";

type WatermarkStatus = "awaiting" | "completed" | "failed";

const WATERMARK_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All watermark states" },
  { value: "awaiting", label: "Awaiting" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

export default function AdminSubmissionList() {
  const navigate = useNavigate();
  const { page, setPage, searchParams, setSearchParams } = usePageParam();
  const watermark = searchParams.get("watermark") ?? "";
  const bulk = useBulkActions([["admin", "submissions"]]);

  useEffect(() => {
    document.title = "Submissions | Admin";
  }, []);

  const { data, isPending, isError, error, isFetching } = useAdminSubmissions({
    page,
    perPage: 20,
    watermarkStatus: watermark ? (watermark as WatermarkStatus) : undefined,
  });

  function setWatermark(next: string) {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (next) p.set("watermark", next);
      else p.delete("watermark");
      p.set("page", "1");
      return p;
    });
  }

  const columns: Column<AdminSubmission>[] = [
    {
      header: "Question",
      cell: (s) => (
        <p className="font-medium text-gray-900 dark:text-gray-100">
          {s.question.title}
        </p>
      ),
    },
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
      cell: (s) => (
        <span className="whitespace-nowrap tabular-nums text-gray-500 dark:text-gray-400">
          {s.viewCount}
        </span>
      ),
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
    <div>
      <AdminHeader
        title="Published submissions"
        description={
          data?.meta.total ? `${data.meta.total} submissions.` : undefined
        }
        actions={
          <select
            value={watermark}
            onChange={(e) => setWatermark(e.target.value)}
            className={`${inputClass} w-auto`}
          >
            {WATERMARK_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        }
      />

      {isError ? (
        <ErrorBox message={`Failed to load submissions: ${error.message}`} />
      ) : (
        <>
          <BulkBar bulk={bulk}>
            <BulkButton
              label="Delete"
              bulk={bulk}
              variant="danger"
              onClick={() => {
                if (
                  confirm(
                    `Delete ${bulk.selected.size} submission(s)? This cannot be undone.`
                  )
                ) {
                  bulk.run("Delete", deleteAdminSubmission);
                }
              }}
            />
          </BulkBar>
          <DataTable
            columns={columns}
            rows={data?.data ?? []}
            rowKey={(s) => s.id}
            isLoading={isPending}
            isFetching={isFetching}
            emptyMessage="No submissions yet."
            onRowClick={(s) => navigate(`/admin/submissions/${s.id}`)}
            selection={{
              selected: bulk.selected,
              onChange: bulk.onSelectionChange,
            }}
          />
          {data && <Pagination meta={data.meta} onPageChange={setPage} />}
        </>
      )}
    </div>
  );
}
