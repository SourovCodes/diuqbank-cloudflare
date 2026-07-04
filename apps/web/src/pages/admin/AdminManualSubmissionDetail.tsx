import { ALLOWED_EXAM_TYPES } from "@diuqbank/shared";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  approveManualSubmission,
  deleteAdminManualSubmission,
  getAdminManualSubmissions,
  rejectManualSubmission,
  updateAdminManualSubmission,
} from "../../api";
import type { UpdateManualSubmission } from "../../types/api";
import { useAdminManualSubmission } from "../../hooks/adminQueries";
import { Button, Field, inputClass } from "../../components/ui/form";
import { Modal } from "../../components/ui/Modal";
import { SubmissionStatusBadge } from "../../components/ui/SubmissionStatusBadge";
import { DetailRow, PdfPreview } from "../../components/submissions/SubmissionParts";
import { formatDate } from "../../lib/format";
import { ErrorBox } from "./shared";
import { useAdvanceQueue } from "./useAdvanceQueue";

const META_FIELDS: { key: keyof UpdateManualSubmission; label: string }[] = [
  { key: "departmentName", label: "Department" },
  { key: "departmentShortName", label: "Department short name" },
  { key: "courseName", label: "Course" },
  { key: "semesterName", label: "Semester" },
  { key: "examTypeName", label: "Exam type" },
];

export default function AdminManualSubmissionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: sub, isPending, isError } = useAdminManualSubmission(id);

  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    document.title = "Review submission | Admin";
  }, []);

  const advance = useAdvanceQueue({
    listPath: "/admin/manual-submissions",
    currentId: Number(id),
    fetchPending: () =>
      getAdminManualSubmissions({
        page: 1,
        perPage: 2,
        status: "pending_review",
      }).then((r) => r.data),
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["admin", "manual-submissions"] });
    queryClient.invalidateQueries({
      queryKey: ["admin", "manual-submission", id],
    });
  }

  const approve = useMutation({
    mutationFn: () => approveManualSubmission(Number(id)),
    onSuccess: () => {
      invalidate();
      advance();
    },
  });
  const reject = useMutation({
    mutationFn: () => rejectManualSubmission(Number(id), reason.trim()),
    onSuccess: () => {
      invalidate();
      setRejecting(false);
      setReason("");
      advance();
    },
  });
  const remove = useMutation({
    mutationFn: () => deleteAdminManualSubmission(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "manual-submissions"],
      });
      navigate("/admin/manual-submissions", { replace: true });
    },
  });

  if (isPending) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 py-14 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
        Loading submission…
      </div>
    );
  }

  if (isError || !sub) {
    return (
      <ErrorBox message="Submission not found — it may have been removed." />
    );
  }

  const isApproved = sub.status === "approved";

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link
          to="/admin/manual-submissions"
          className="inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          ← Back to queue
        </Link>
        <button
          type="button"
          onClick={() => advance()}
          className="text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          Skip to next →
        </button>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-5 dark:border-gray-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            {sub.courseName}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {sub.departmentName} ({sub.departmentShortName})
          </p>
        </div>
        <SubmissionStatusBadge status={sub.status} />
      </div>

      {sub.status === "rejected" && sub.rejectedReason && (
        <p className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <span className="font-semibold">Rejected:</span> {sub.rejectedReason}
        </p>
      )}
      {isApproved && sub.questionId && (
        <p className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300">
          Approved and published.{" "}
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
                Details
              </h2>
              {!isApproved && (
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
              <DetailRow label="Course" value={sub.courseName} />
              <DetailRow label="Semester" value={sub.semesterName} />
              <DetailRow label="Exam type" value={sub.examTypeName} />
              <DetailRow label="Submitted" value={formatDate(sub.createdAt)} />
              <DetailRow label="Submitter" value={`@${sub.contributor.username}`} />
            </dl>
            {sub.note && (
              <p className="mt-3 border-t border-gray-100 pt-3 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-300">
                {sub.note}
              </p>
            )}
          </div>

          {!isApproved && (
            <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Review
              </h2>
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                Approving matches the metadata against existing records. Create
                any missing department/course/semester/exam type first.
              </p>
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
              {approve.isError && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {(approve.error as Error).message}
                </p>
              )}
            </div>
          )}

          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <Button
              variant="danger"
              className="w-full"
              loading={remove.isPending}
              onClick={() => {
                if (confirm("Delete this submission? This cannot be undone.")) {
                  remove.mutate();
                }
              }}
            >
              Delete submission
            </Button>
            {remove.isError && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                {(remove.error as Error).message}
              </p>
            )}
          </div>
        </aside>
      </div>

      <RejectModal
        open={rejecting}
        reason={reason}
        onReason={setReason}
        onClose={() => setRejecting(false)}
        onSubmit={() => reject.mutate()}
        loading={reject.isPending}
        error={reject.isError ? (reject.error as Error).message : null}
      />

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

function RejectModal({
  open,
  reason,
  onReason,
  onClose,
  onSubmit,
  loading,
  error,
}: {
  open: boolean;
  reason: string;
  onReason: (v: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  loading: boolean;
  error: string | null;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Reject submission"
      description="The submitter will see this reason."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={loading}
            disabled={!reason.trim()}
            onClick={onSubmit}
          >
            Reject
          </Button>
        </>
      }
    >
      <Field label="Reason">
        <textarea
          value={reason}
          onChange={(e) => onReason(e.target.value)}
          rows={4}
          className={inputClass}
          placeholder="e.g. Wrong course, unreadable scan…"
        />
      </Field>
      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </Modal>
  );
}

function EditMetaModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: {
    id: number;
    departmentName: string;
    departmentShortName: string;
    courseName: string;
    semesterName: string;
    examTypeName: string;
  };
  onClose: () => void;
  onSaved: () => void;
}) {
  // Kept as plain strings while editing; the API-side enum narrows examTypeName
  // on submit (the select below only offers allowed values anyway).
  const [form, setForm] = useState<
    Record<(typeof META_FIELDS)[number]["key"], string>
  >({
    departmentName: initial.departmentName,
    departmentShortName: initial.departmentShortName,
    courseName: initial.courseName,
    semesterName: initial.semesterName,
    examTypeName: initial.examTypeName,
  });

  const save = useMutation({
    mutationFn: () => {
      // The API requires each provided string field to be non-empty, so send
      // only the fields the admin actually filled in.
      const payload: Record<string, string> = {};
      for (const f of META_FIELDS) {
        const v = form[f.key]?.trim();
        if (v) payload[f.key] = v;
      }
      return updateAdminManualSubmission(
        initial.id,
        payload as UpdateManualSubmission,
      );
    },
    onSuccess: onSaved,
  });

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit submission metadata"
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
            {f.key === "examTypeName" ? (
              <select
                id={f.key}
                value={form[f.key] ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, [f.key]: e.target.value }))
                }
                className={inputClass}
              >
                <option value="">Select exam type…</option>
                {ALLOWED_EXAM_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
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
