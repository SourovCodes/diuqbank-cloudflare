import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deleteAdminSubmission,
  incrementSubmissionViews,
  replaceSubmissionPdf,
  updateAdminSubmission,
} from "../../api";
import type { AdminSubmission, UpdateSubmission } from "../../types/api";
import { useAdminSubmission } from "../../hooks/adminQueries";
import { Badge } from "../../components/ui/Badge";
import { Button, Field, inputClass } from "../../components/ui/form";
import { FileUpload } from "../../components/ui/FileUpload";
import { DetailRow, PdfPreview } from "../../components/submissions/SubmissionParts";
import { formatBytes, formatDate } from "../../lib/format";
import { ErrorBox } from "./shared";
import { WATERMARK_VARIANT } from "./SubmissionsTable";

export default function AdminSubmissionDetail() {
  const { id } = useParams();
  const { data: sub, isPending, isError } = useAdminSubmission(id);

  useEffect(() => {
    document.title = "Submission | Admin";
  }, []);

  if (isPending) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 py-14 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
        Loading submission…
      </div>
    );
  }

  if (isError || !sub) {
    return <ErrorBox message="Submission not found — it may have been deleted." />;
  }

  return (
    <div>
      <Link
        to="/admin/submissions"
        className="mb-6 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
      >
        ← Back to submissions
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-5 dark:border-gray-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            {sub.question.title}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            <Link
              to={`/admin/questions/${sub.question.id}`}
              className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              View question
            </Link>
            {sub.contributor && (
              <>
                {" · by "}
                <Link
                  to={`/admin/users/${sub.contributor.id}`}
                  className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  @{sub.contributor.username}
                </Link>
              </>
            )}
            {sub.autoSubmissionId !== null && (
              <>
                {" · "}
                <Link
                  to={`/admin/auto-submissions/${sub.autoSubmissionId}`}
                  className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  View auto submission
                </Link>
              </>
            )}
            {sub.manualSubmissionId !== null && (
              <>
                {" · "}
                <Link
                  to={`/admin/manual-submissions/${sub.manualSubmissionId}`}
                  className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  View manual submission
                </Link>
              </>
            )}
          </p>
        </div>
        <Badge
          label={`watermark: ${sub.watermarkStatus}`}
          variant={WATERMARK_VARIANT[sub.watermarkStatus]}
        />
      </div>

      {sub.watermarkStatus === "failed" && sub.watermarkError && (
        <p className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <span className="font-semibold">Watermarking failed:</span>{" "}
          {sub.watermarkError}
        </p>
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <PdfPreview
            url={sub.watermarkedPdfUrl ?? sub.pdfUrl}
            title={sub.watermarkedPdfUrl ? "Watermarked PDF" : "Original PDF"}
          />
          {sub.watermarkedPdfUrl && sub.pdfUrl && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              <a
                href={sub.pdfUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Open the original (pre-watermark) PDF
              </a>
            </p>
          )}
        </div>

        <aside className="w-full shrink-0 space-y-4 lg:w-80">
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Details
            </h2>
            <dl className="space-y-1.5 text-sm">
              <DetailRow label="File size" value={formatBytes(sub.fileSize)} />
              <DetailRow label="Views" value={String(sub.viewCount)} />
              <DetailRow label="Created" value={formatDate(sub.createdAt)} />
            </dl>
          </div>

          <ManageCard key={sub.id} submission={sub} />
        </aside>
      </div>
    </div>
  );
}

function ManageCard({ submission }: { submission: AdminSubmission }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<UpdateSubmission>({
    section: submission.section,
    batch: submission.batch,
    watermarkStatus: submission.watermarkStatus,
  });
  const [pdf, setPdf] = useState<File | null>(null);
  const [viewsToAdd, setViewsToAdd] = useState("1");

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["admin", "submissions"] });
    queryClient.invalidateQueries({
      queryKey: ["admin", "submission", String(submission.id)],
    });
  }

  const viewsToAddNumber = Number(viewsToAdd);
  const viewsToAddValid =
    Number.isInteger(viewsToAddNumber) && viewsToAddNumber > 0;

  const save = useMutation({
    mutationFn: () =>
      updateAdminSubmission(submission.id, {
        section: form.section || null,
        batch: form.batch || null,
        watermarkStatus: form.watermarkStatus,
      }),
    onSuccess: invalidate,
  });

  const addViews = useMutation({
    mutationFn: () =>
      incrementSubmissionViews(submission.id, viewsToAddNumber),
    onSuccess: invalidate,
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
      queryClient.invalidateQueries({ queryKey: ["admin", "submissions"] });
      navigate("/admin/submissions");
    },
  });

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Manage
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Section" htmlFor="sub-section">
          <input
            id="sub-section"
            value={form.section ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))}
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
      <div className="flex items-center gap-2">
        <Button loading={save.isPending} onClick={() => save.mutate()}>
          Save
        </Button>
        {save.isSuccess && !save.isPending && (
          <span className="text-xs text-green-600 dark:text-green-400">
            Saved.
          </span>
        )}
      </div>
      {save.isError && (
        <p className="text-xs text-red-600 dark:text-red-400">
          {(save.error as Error).message}
        </p>
      )}

      <div className="border-t border-gray-100 pt-3 dark:border-gray-800">
        <Field
          label={`Add views (currently ${submission.viewCount})`}
          htmlFor="sub-views"
        >
          <div className="flex gap-2">
            <input
              id="sub-views"
              type="number"
              min={1}
              step={1}
              value={viewsToAdd}
              onChange={(e) => setViewsToAdd(e.target.value)}
              className={inputClass}
            />
            <Button
              variant="secondary"
              disabled={!viewsToAddValid}
              loading={addViews.isPending}
              onClick={() => addViews.mutate()}
            >
              Add
            </Button>
          </div>
        </Field>
        {addViews.isError && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
            {(addViews.error as Error).message}
          </p>
        )}
        {addViews.isSuccess && (
          <p className="mt-1 text-xs text-green-600 dark:text-green-400">
            Views added.
          </p>
        )}
      </div>

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

      <div className="border-t border-gray-100 pt-3 dark:border-gray-800">
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
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
            {(remove.error as Error).message}
          </p>
        )}
      </div>
    </div>
  );
}
