import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deleteAdminSubmission,
  replaceSubmissionPdf,
  updateAdminSubmission,
} from "../../api";
import type { AdminSubmission, UpdateSubmission } from "../../types/api";
import { useAdminSubmissions } from "../../hooks/adminQueries";
import { DataTable, type Column } from "../../components/admin/DataTable";
import { Pagination } from "../../components/ui/Pagination";
import { Badge } from "../../components/ui/Badge";
import { Button, Field, inputClass } from "../../components/ui/form";
import { Modal } from "../../components/ui/Modal";
import { FileUpload } from "../../components/ui/FileUpload";
import { formatBytes, formatDate } from "../../lib/format";
import { AdminHeader, ErrorBox, usePageParam } from "./shared";

const WATERMARK_VARIANT = {
  awaiting: "yellow",
  completed: "green",
  failed: "red",
} as const;

export default function AdminSubmissionList() {
  const { page, setPage } = usePageParam();
  const [editing, setEditing] = useState<AdminSubmission | null>(null);

  useEffect(() => {
    document.title = "Submissions | Admin";
  }, []);

  const { data, isPending, isError, error, isFetching } = useAdminSubmissions({
    page,
    perPage: 20,
  });

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
    {
      header: "",
      cell: (s) => (
        <button
          type="button"
          onClick={() => setEditing(s)}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          Manage
        </button>
      ),
      className: "text-right",
    },
  ];

  return (
    <div>
      <AdminHeader
        title="Published submissions"
        description={
          data?.meta.total ? `${data.meta.total} submissions.` : undefined
        }
      />

      {isError ? (
        <ErrorBox message={`Failed to load submissions: ${error.message}`} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={data?.data ?? []}
            rowKey={(s) => s.id}
            isLoading={isPending}
            isFetching={isFetching}
            emptyMessage="No submissions yet."
          />
          {data && <Pagination meta={data.meta} onPageChange={setPage} />}
        </>
      )}

      {editing && (
        <ManageSubmissionModal
          submission={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function ManageSubmissionModal({
  submission,
  onClose,
}: {
  submission: AdminSubmission;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<UpdateSubmission>({
    section: submission.section,
    batch: submission.batch,
    watermarkStatus: submission.watermarkStatus,
  });
  const [pdf, setPdf] = useState<File | null>(null);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["admin", "submissions"] });
  }

  const save = useMutation({
    mutationFn: () =>
      updateAdminSubmission(submission.id, {
        section: form.section || null,
        batch: form.batch || null,
        watermarkStatus: form.watermarkStatus,
      }),
    onSuccess: () => {
      invalidate();
      onClose();
    },
  });

  const replace = useMutation({
    mutationFn: () => replaceSubmissionPdf(submission.id, pdf as File),
    onSuccess: () => {
      invalidate();
      setPdf(null);
    },
  });

  const remove = useMutation({
    mutationFn: () => deleteAdminSubmission(submission.id),
    onSuccess: () => {
      invalidate();
      onClose();
    },
  });

  return (
    <Modal
      open
      onClose={onClose}
      title="Manage submission"
      description={submission.question.title}
      footer={
        <>
          <Button
            variant="danger"
            className="mr-auto"
            loading={remove.isPending}
            onClick={() => {
              if (confirm("Delete this submission? This cannot be undone.")) {
                remove.mutate();
              }
            }}
          >
            Delete
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={save.isPending} onClick={() => save.mutate()}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Section" htmlFor="sub-section">
            <input
              id="sub-section"
              value={form.section ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, section: e.target.value }))
              }
              className={inputClass}
            />
          </Field>
          <Field label="Batch" htmlFor="sub-batch">
            <input
              id="sub-batch"
              value={form.batch ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, batch: e.target.value }))}
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="Watermark status" htmlFor="sub-watermark">
          <select
            id="sub-watermark"
            value={form.watermarkStatus}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                watermarkStatus: e.target
                  .value as UpdateSubmission["watermarkStatus"],
              }))
            }
            className={inputClass}
          >
            <option value="awaiting">awaiting</option>
            <option value="completed">completed</option>
            <option value="failed">failed</option>
          </select>
        </Field>

        <div className="border-t border-gray-100 pt-3 dark:border-gray-800">
          <Field label="Replace PDF">
            <FileUpload file={pdf} onChange={setPdf} />
          </Field>
          <Button
            variant="secondary"
            className="mt-2 w-full"
            disabled={!pdf}
            loading={replace.isPending}
            onClick={() => replace.mutate()}
          >
            Upload replacement
          </Button>
          {replace.isError && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              {(replace.error as Error).message}
            </p>
          )}
        </div>

        {(save.isError || remove.isError) && (
          <p className="text-xs text-red-600 dark:text-red-400">
            {((save.error || remove.error) as Error).message}
          </p>
        )}
      </div>
    </Modal>
  );
}
