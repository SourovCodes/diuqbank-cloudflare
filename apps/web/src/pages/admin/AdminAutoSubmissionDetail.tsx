import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  approveAutoSubmission,
  rejectAutoSubmission,
  reprocessAutoSubmission,
  updateAdminAutoSubmission,
} from "../../api";
import type { UpdateAutoSubmission } from "../../types/api";
import { useAdminAutoSubmission } from "../../hooks/adminQueries";
import { Button, Field, inputClass } from "../../components/ui/form";
import { Modal } from "../../components/ui/Modal";
import { SubmissionStatusBadge } from "../../components/ui/SubmissionStatusBadge";
import { DetailRow, PdfPreview } from "../../components/submissions/SubmissionParts";
import { formatDate } from "../../lib/format";
import { ErrorBox } from "./shared";

const META_FIELDS: { key: keyof UpdateAutoSubmission; label: string }[] = [
  { key: "departmentName", label: "Department" },
  { key: "departmentShortName", label: "Department short name" },
  { key: "courseName", label: "Course" },
  { key: "semesterName", label: "Semester" },
  { key: "examTypeName", label: "Exam type" },
  { key: "section", label: "Section" },
  { key: "batch", label: "Batch" },
  { key: "extraContext", label: "Extra context" },
];

// Unlike the taxonomy names above, these accept an empty string to clear the
// stored value.
const CLEARABLE_FIELDS = new Set<keyof UpdateAutoSubmission>([
  "section",
  "batch",
  "extraContext",
]);

export default function AdminAutoSubmissionDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { data: sub, isPending, isError } = useAdminAutoSubmission(id);

  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    document.title = "Review auto submission | Admin";
  }, []);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["admin", "auto-submissions"] });
    queryClient.invalidateQueries({
      queryKey: ["admin", "auto-submission", id],
    });
  }

  const approve = useMutation({
    mutationFn: () => approveAutoSubmission(Number(id)),
    onSuccess: invalidate,
  });
  const reject = useMutation({
    mutationFn: () => rejectAutoSubmission(Number(id), reason.trim()),
    onSuccess: () => {
      invalidate();
      setRejecting(false);
      setReason("");
    },
  });
  const reprocess = useMutation({
    mutationFn: () => reprocessAutoSubmission(Number(id)),
    onSuccess: invalidate,
  });

  if (isPending) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 py-14 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
        Loading submission…
      </div>
    );
  }

  if (isError || !sub) {
    return <ErrorBox message="Submission not found — it may have been removed." />;
  }

  const canReview = sub.status === "needs_review";
  const canReprocess = sub.status === "needs_review" || sub.status === "failed";
  const canEdit = sub.status !== "published" && sub.status !== "processing";

  return (
    <div>
      <Link
        to="/admin/auto-submissions"
        className="mb-6 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
      >
        ← Back to queue
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-5 dark:border-gray-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            {sub.courseName ?? "Untitled paper"}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {sub.departmentName
              ? `${sub.departmentName}${sub.departmentShortName ? ` (${sub.departmentShortName})` : ""}`
              : "No department detected"}
          </p>
        </div>
        <SubmissionStatusBadge status={sub.status} />
      </div>

      {sub.status === "rejected" && sub.rejectedReason && (
        <p className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <span className="font-semibold">Rejected:</span> {sub.rejectedReason}
        </p>
      )}
      {sub.status === "failed" && sub.processingError && (
        <p className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <span className="font-semibold">Processing failed:</span>{" "}
          {sub.processingError}
        </p>
      )}
      {sub.status === "published" && sub.questionId && (
        <p className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300">
          Published.{" "}
          <Link
            to={`/questions/${sub.questionId}`}
            className="font-semibold underline"
          >
            View the live question
          </Link>
          .
        </p>
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <PdfPreview url={sub.pdfUrl} />
        </div>

        <aside className="w-full shrink-0 space-y-4 lg:w-80">
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Detected metadata
              </h2>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  Edit
                </button>
              )}
            </div>
            <dl className="space-y-1.5 text-sm">
              <DetailRow label="Course" value={sub.courseName ?? "—"} />
              <DetailRow label="Semester" value={sub.semesterName ?? "—"} />
              <DetailRow label="Exam type" value={sub.examTypeName ?? "—"} />
              <DetailRow label="Section" value={sub.section ?? "—"} />
              <DetailRow label="Batch" value={sub.batch ?? "—"} />
              <DetailRow label="Uploaded" value={formatDate(sub.createdAt)} />
              <DetailRow label="Submitter" value={`@${sub.contributor.username}`} />
            </dl>
          </div>

          {sub.extraContext && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Uploader&apos;s extra context
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {sub.extraContext}
              </p>
            </div>
          )}

          {sub.aiReasoning && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                AI reasoning
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {sub.aiReasoning}
              </p>
            </div>
          )}

          {(canReview || canReprocess) && (
            <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Review
              </h2>
              {canReview && (
                <>
                  <Button
                    className="w-full"
                    loading={approve.isPending}
                    onClick={() => approve.mutate()}
                  >
                    Approve &amp; publish
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => setRejecting(true)}
                  >
                    Reject…
                  </Button>
                </>
              )}
              {canReprocess && (
                <Button
                  variant="secondary"
                  className="w-full"
                  loading={reprocess.isPending}
                  onClick={() => reprocess.mutate()}
                >
                  Reprocess with AI
                </Button>
              )}
              {(approve.isError || reprocess.isError) && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {((approve.error || reprocess.error) as Error).message}
                </p>
              )}
            </div>
          )}
        </aside>
      </div>

      <Modal
        open={rejecting}
        onClose={() => setRejecting(false)}
        title="Reject submission"
        description="The submitter will see this reason."
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejecting(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={reject.isPending}
              disabled={!reason.trim()}
              onClick={() => reject.mutate()}
            >
              Reject
            </Button>
          </>
        }
      >
        <Field label="Reason">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            className={inputClass}
            placeholder="e.g. Not a question paper, duplicate…"
          />
        </Field>
        {reject.isError && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">
            {(reject.error as Error).message}
          </p>
        )}
      </Modal>

      {editing && (
        <EditMetaModal
          initial={sub}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            invalidate();
          }}
        />
      )}
    </div>
  );
}

function EditMetaModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: {
    id: number;
    departmentName: string | null;
    departmentShortName: string | null;
    courseName: string | null;
    semesterName: string | null;
    examTypeName: string | null;
    section: string | null;
    batch: string | null;
    extraContext: string | null;
  };
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<UpdateAutoSubmission>({
    departmentName: initial.departmentName ?? "",
    departmentShortName: initial.departmentShortName ?? "",
    courseName: initial.courseName ?? "",
    semesterName: initial.semesterName ?? "",
    examTypeName: initial.examTypeName ?? "",
    section: initial.section ?? "",
    batch: initial.batch ?? "",
    extraContext: initial.extraContext ?? "",
  });

  const save = useMutation({
    mutationFn: () => {
      // Taxonomy names must be non-empty when sent, so skip blank ones; the
      // clearable fields are always sent ("" clears the stored value).
      const payload: UpdateAutoSubmission = {};
      for (const f of META_FIELDS) {
        const v = form[f.key]?.trim() ?? "";
        if (v || CLEARABLE_FIELDS.has(f.key)) payload[f.key] = v;
      }
      return updateAdminAutoSubmission(initial.id, payload);
    },
    onSuccess: onSaved,
  });

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit detected metadata"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={save.isPending} onClick={() => save.mutate()}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {META_FIELDS.map((f) => (
          <Field key={f.key} label={f.label} htmlFor={f.key}>
            {f.key === "extraContext" ? (
              <textarea
                id={f.key}
                value={form[f.key] ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, [f.key]: e.target.value }))
                }
                rows={3}
                maxLength={1000}
                className={inputClass}
                placeholder="Hint passed to the AI when reprocessing"
              />
            ) : (
              <input
                id={f.key}
                value={form[f.key] ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, [f.key]: e.target.value }))
                }
                className={inputClass}
              />
            )}
          </Field>
        ))}
        {save.isError && (
          <p className="text-xs text-red-600 dark:text-red-400">
            {(save.error as Error).message}
          </p>
        )}
      </div>
    </Modal>
  );
}
