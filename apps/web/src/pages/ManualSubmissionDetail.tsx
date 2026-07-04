import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteManualSubmission } from "../api";
import { useManualSubmission } from "../hooks/queries";
import { Button } from "../components/ui/form";
import { SubmissionStatusBadge } from "../components/ui/SubmissionStatusBadge";
import { DetailRow, PdfPreview } from "../components/submissions/SubmissionParts";
import { formatDate } from "../lib/format";

export default function ManualSubmissionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: sub, isPending, isError } = useManualSubmission(id);

  useEffect(() => {
    document.title = "Submission | DIUQBank";
  }, []);

  const remove = useMutation({
    mutationFn: () => deleteManualSubmission(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manual-submissions"] });
      navigate("/submissions/manual", { replace: true });
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
          to="/submissions/manual"
          className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Back to submissions
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        to="/submissions/manual"
        className="mb-6 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
      >
        Back to submissions
      </Link>

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
      {sub.status === "approved" && sub.questionId && (
        <p className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300">
          Approved and published.{" "}
          <Link to={`/questions/${sub.questionId}`} className="font-semibold underline">
            View the live question
          </Link>
          .
        </p>
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <PdfPreview url={sub.pdfUrl} />
        </div>

        <aside className="w-full shrink-0 lg:w-72">
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Details
            </h2>
            <dl className="space-y-1.5 text-sm">
              <DetailRow label="Semester" value={sub.semesterName} />
              <DetailRow label="Exam type" value={sub.examTypeName} />
              <DetailRow label="Submitted" value={formatDate(sub.createdAt)} />
            </dl>
            {sub.note && (
              <p className="mt-3 border-t border-gray-100 pt-3 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-300">
                {sub.note}
              </p>
            )}

            {sub.status !== "approved" && (
              <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
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
          </div>
        </aside>
      </div>
    </div>
  );
}
