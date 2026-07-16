import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteAutoSubmission } from "../api";
import { useAutoSubmission } from "../hooks/queries";
import { Button } from "../components/ui/form";
import { SubmissionStatusBadge } from "../components/ui/SubmissionStatusBadge";
import { DetailRow, PdfPreview } from "../components/submissions/SubmissionParts";
import { formatDate } from "../lib/format";

export default function AutoSubmissionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: sub, isPending, isError } = useAutoSubmission(id);

  useEffect(() => {
    document.title = "AI submission | DIUQBank";
  }, []);

  const remove = useMutation({
    mutationFn: () => deleteAutoSubmission(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auto-submissions"] });
      navigate("/submissions/auto", { replace: true });
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
      <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center dark:border-gray-800">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Submission not found
        </h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
          This submission may have been removed, or the link may be incorrect.
        </p>
        <Link
          to="/submissions/auto"
          className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Back to submissions
        </Link>
      </div>
    );
  }

  const metadata: [string, string | null][] = [
    ["Department", sub.departmentName],
    ["Course", sub.courseName],
    ["Semester", sub.semesterName],
    ["Exam type", sub.examTypeName],
    ["Section", sub.section],
    ["Batch", sub.batch],
  ];
  const hasMetadata = metadata.some(([, v]) => v);

  return (
    <div>
      <Link
        to="/submissions/auto"
        className="mb-6 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
      >
        Back to submissions
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-5 dark:border-gray-800">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          {sub.courseName ?? "AI submission"}
        </h1>
        <SubmissionStatusBadge status={sub.status} />
      </div>

      {sub.status === "processing" && (
        <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          The AI is reading your PDF. This page updates automatically when it's
          done.
        </p>
      )}
      {sub.status === "published" && sub.questionId && (
        <p className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300">
          Published automatically.{" "}
          <Link to={`/questions/${sub.questionId}`} className="font-semibold underline">
            View the live question
          </Link>
          .
        </p>
      )}
      {sub.status === "rejected" && sub.rejectedReason && (
        <p className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <span className="font-semibold">Rejected:</span> {sub.rejectedReason}
        </p>
      )}
      {sub.status === "failed" && (
        <p className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          Processing failed. Try deleting this and uploading again.
        </p>
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <PdfPreview url={sub.pdfUrl} />
        </div>

        <aside className="w-full shrink-0 space-y-4 lg:w-80">
          {hasMetadata && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Extracted details
              </h2>
              <dl className="space-y-1.5 text-sm">
                {metadata.map(([label, value]) =>
                  value ? <DetailRow key={label} label={label} value={value} /> : null
                )}
                <DetailRow label="Uploaded" value={formatDate(sub.createdAt)} />
              </dl>
            </div>
          )}

          {sub.aiReasoning && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                AI reasoning
              </h2>
              <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
                {sub.aiReasoning}
              </p>
            </div>
          )}

          {sub.status !== "published" && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <Button
                variant="danger"
                loading={remove.isPending}
                className="w-full"
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
          )}
        </aside>
      </div>
    </div>
  );
}
