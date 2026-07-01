import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuestion, useSubmissions } from "../hooks/queries";
import { Badge } from "../components/ui/Badge";
import { cx } from "../lib/cx";
import { formatBytes, formatDate } from "../lib/format";

export default function QuestionDetail() {
  const { id } = useParams();
  const { data: question, isPending, isError } = useQuestion(id);
  const { data: submissionsData } = useSubmissions(id);

  const submissions = useMemo(
    () =>
      (submissionsData?.data ?? [])
        .slice()
        .sort((a, b) => b.createdAt - a.createdAt),
    [submissionsData]
  );

  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Auto-select the newest submission that has a PDF once they load.
  useEffect(() => {
    setSelectedId(submissions.find((s) => s.pdfUrl)?.id ?? null);
  }, [submissions]);

  useEffect(() => {
    document.title = question?.title
      ? `${question.title} | DIUQBank`
      : "Question | DIUQBank";
  }, [question?.title]);

  if (isPending)
    return (
      <div className="container mx-auto flex-1 px-4 py-16">
        <div className="rounded-lg border border-dashed border-gray-200 py-14 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
          Loading question...
        </div>
      </div>
    );

  if (isError || !question)
    return (
      <div className="container mx-auto flex-1 px-4 py-12">
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          Question not found or failed to load.
        </p>
        <Link
          to="/questions"
          className="mt-4 inline-block text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          Back to questions
        </Link>
      </div>
    );

  const selected = submissions.find((s) => s.id === selectedId);

  return (
    <main className="container mx-auto flex-1 px-4 py-10 sm:py-12">
      <Link
        to="/questions"
        className="mb-6 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
      >
        Back to questions
      </Link>

      <div className="mb-7 flex flex-col gap-4 border-b border-gray-200 pb-6 dark:border-gray-800">
        <h1 className="max-w-4xl text-2xl font-bold leading-tight tracking-tight text-gray-900 dark:text-gray-100 sm:text-3xl">
          {question.course.name}
        </h1>
        <div className="flex flex-wrap gap-2">
          <Badge label={question.department.name} variant="blue" />
          <Badge label={question.course.name} variant="gray" />
          <Badge label={question.semester.name} variant="gray" />
          <Badge label={question.examType.name} variant="green" />
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          {selected?.pdfUrl ? (
            <iframe
              key={selected.id}
              src={selected.pdfUrl}
              title="Question paper"
              className="w-full rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
              style={{ height: "calc(100vh - 260px)", minHeight: "440px" }}
            />
          ) : (
            <div
              className="flex items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
              style={{ minHeight: "560px" }}
            >
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {submissions.length === 0
                  ? "No submissions yet."
                  : "No PDF available for this question."}
              </p>
            </div>
          )}
        </div>

        <aside className="w-full shrink-0 lg:sticky lg:top-20 lg:w-80">
          <div className="flex flex-col gap-4">
            <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Submissions
                </h2>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {submissions.length}
                </span>
              </div>

              {submissions.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No submissions yet.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {submissions.map((sub) => {
                    const canView = !!sub.pdfUrl;
                    const isSelected = sub.id === selectedId;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        disabled={!canView}
                        onClick={() => canView && setSelectedId(sub.id)}
                        className={cx(
                          "w-full rounded-lg border p-3 text-left transition",
                          canView
                            ? "cursor-pointer hover:border-blue-300"
                            : "cursor-not-allowed opacity-50",
                          isSelected
                            ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500 dark:bg-blue-500/10"
                            : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
                        )}
                      >
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {sub.contributor?.name ?? "Anonymous"}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(sub.createdAt)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {selected && (
              <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Contributor
                </h3>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                    {selected.contributor?.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {selected.contributor?.name ?? "Anonymous"}
                    </p>
                    {selected.contributor?.username && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        @{selected.contributor.username}
                      </p>
                    )}
                  </div>
                </div>

                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Details
                </h3>
                <dl className="space-y-1.5 text-sm">
                  <Row label="Date" value={formatDate(selected.createdAt)} />
                  <Row label="File size" value={formatBytes(selected.fileSize)} />
                  {selected.section && <Row label="Section" value={selected.section} />}
                  {selected.batch && <Row label="Batch" value={selected.batch} />}
                </dl>

                {selected.pdfUrl && (
                  <a
                    href={selected.pdfUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-4 flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    Open in new tab
                  </a>
                )}
              </section>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}

type RowProps = {
  label: string;
  value: string;
};

function Row({ label, value }: RowProps) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="font-medium text-gray-800 dark:text-gray-200">{value}</dd>
    </div>
  );
}
