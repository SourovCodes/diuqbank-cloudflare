import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useQuestion, useSubmissions } from "../hooks/queries";
import { useAuth } from "../auth";
import { Badge } from "../components/ui/Badge";
import { StatusPage } from "../components/ui/StatusPage";
import { PdfPreview } from "../components/submissions/SubmissionParts";
import { SubmissionViewTracker } from "../components/submissions/SubmissionViewTracker";
import { AdSlot } from "../components/AdSlot";
import { cx } from "../lib/cx";
import { formatBytes, formatCount, formatDate } from "../lib/format";
import type { QuestionDetail as QuestionDetailData } from "../types/api";

type QuestionDetailLocationState = {
  question?: QuestionDetailData;
};

export default function QuestionDetail() {
  const { id } = useParams();
  const location = useLocation();
  const initialQuestion = (location.state as QuestionDetailLocationState | null)
    ?.question;
  const { data: question, isPending, isError } = useQuestion(id, initialQuestion);
  const { user } = useAuth();
  // Admin panel routes are guarded by role, so only admins get the shortcuts.
  const isAdmin = user?.role === "admin";
  const {
    data: submissionsData,
    isPending: isSubmissionsPending,
    isError: isSubmissionsError,
  } = useSubmissions(id);

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
    document.title = isError
      ? "Question Not Found | DIUQBank"
      : question?.title
        ? `${question.title} | DIUQBank`
        : "Question | DIUQBank";
  }, [isError, question?.title]);

  if (isPending) return <QuestionDetailSkeleton />;

  if (isError || !question)
    return (
      <StatusPage
        eyebrow="Question unavailable"
        title="Question not found"
        description="This question may have been removed, unpublished, or the link may be incorrect."
        actions={[
          { label: "Browse Questions", to: "/questions" },
          { label: "Go Home", to: "/", variant: "secondary" },
        ]}
      />
    );

  const selected = submissions.find((s) => s.id === selectedId);
  const selectedContributorPath = selected?.contributor?.username
    ? `/contributors/${encodeURIComponent(selected.contributor.username)}`
    : null;
  const showSubmissionSelector = !isSubmissionsPending && submissions.length > 1;
  const showSubmissionSidebar =
    isSubmissionsPending || showSubmissionSelector || selected;

  return (
    <main className="container mx-auto flex-1 px-4 py-10 sm:py-12">
      <div className="mb-6 flex flex-col gap-3 border-b border-gray-200 pb-5 dark:border-gray-800">
        <h1 className="max-w-4xl text-2xl font-bold leading-tight tracking-tight text-gray-900 dark:text-gray-100 sm:text-3xl">
          {question.title}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Badge label={question.department.name} variant="blue" />
          <Badge label={question.course.name} variant="gray" />
          <Badge label={question.semester.name} variant="gray" />
          <Badge label={question.examType.name} variant="green" />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {formatCount(question.viewCount)} view
            {question.viewCount !== 1 ? "s" : ""}
          </span>
          {isAdmin && (
            <Link
              to={`/admin/questions/${question.id}`}
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Open in admin
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          {isSubmissionsPending ? (
            <div className="pdf-frame flex items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Loading submissions...
              </p>
            </div>
          ) : selected?.pdfUrl ? (
            <>
              <PdfPreview
                key={selected.id}
                url={selected.pdfUrl}
                title="Question paper"
              />
              <SubmissionViewTracker
                key={`view-${selected.id}`}
                submissionId={selected.id}
              />
            </>
          ) : (
            <div className="pdf-frame flex items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isSubmissionsError
                  ? "Failed to load submissions."
                  : submissions.length === 0
                    ? "No submissions yet."
                    : "No PDF available for this question."}
              </p>
            </div>
          )}

          <AdSlot name="question-below-viewer" />
        </div>

        {showSubmissionSidebar && (
          <aside className="w-full shrink-0 lg:sticky lg:top-20 lg:w-80">
            <div className="flex flex-col gap-4">
              {isSubmissionsPending && (
                <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Submissions
                  </h2>
                  <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                    Loading submissions...
                  </p>
                </section>
              )}

              {showSubmissionSelector && (
                <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Submissions
                    </h2>
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {submissions.length}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {submissions.map((sub) => {
                      const canView = !!sub.pdfUrl;
                      const isSelected = sub.id === selectedId;
                      const name = sub.contributor?.name ?? "Anonymous";
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          disabled={!canView}
                          onClick={() => canView && setSelectedId(sub.id)}
                          className={cx(
                            "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition",
                            canView
                              ? "cursor-pointer hover:border-blue-300"
                              : "cursor-not-allowed opacity-50",
                            isSelected
                              ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500 dark:bg-blue-500/10"
                              : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
                          )}
                        >
                          {sub.contributor?.image ? (
                            <img
                              src={sub.contributor.image}
                              alt=""
                              className="h-8 w-8 shrink-0 rounded-full object-cover"
                            />
                          ) : (
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-xs font-bold text-white">
                              {name[0]?.toUpperCase() ?? "?"}
                            </span>
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {name}
                            </span>
                            <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(sub.createdAt)}
                              {` · ${formatCount(sub.viewCount)} view${sub.viewCount !== 1 ? "s" : ""}`}
                              {!canView && " · No PDF"}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {selected && (
                <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Contributor
                  </h3>
                  <ContributorIdentity
                    name={selected.contributor?.name ?? "Anonymous"}
                    username={selected.contributor?.username}
                    image={selected.contributor?.image}
                    to={selectedContributorPath}
                  />

                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Details
                  </h3>
                  <dl className="space-y-1.5 text-sm">
                    <Row label="Date" value={formatDate(selected.createdAt)} />
                    <Row label="File size" value={formatBytes(selected.fileSize)} />
                    <Row label="Views" value={formatCount(selected.viewCount)} />
                    {selected.section && <Row label="Section" value={selected.section} />}
                    {selected.batch && <Row label="Batch" value={selected.batch} />}
                  </dl>

                  {isAdmin && (
                    <Link
                      to={`/admin/submissions/${selected.id}`}
                      className="mt-3 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      Open submission in admin
                    </Link>
                  )}

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

              <AdSlot name="question-sidebar" className="hidden !my-0 lg:block" />
            </div>
          </aside>
        )}
      </div>

      <AdSlot name="question-bottom" />
    </main>
  );
}

// Mirrors the loaded layout (title, badges, PDF frame, sidebar card) so the
// page doesn't jump when the data arrives.
function QuestionDetailSkeleton() {
  return (
    <main className="container mx-auto flex-1 animate-pulse px-4 py-10 sm:py-12">
      <div className="mb-6 flex flex-col gap-3 border-b border-gray-200 pb-5 dark:border-gray-800">
        <div className="h-8 w-2/3 max-w-xl rounded bg-gray-200 dark:bg-gray-800" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-6 w-24 rounded-full bg-gray-200 dark:bg-gray-800" />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="pdf-frame min-w-0 flex-1 rounded-lg bg-gray-100 dark:bg-gray-900" />
        <aside className="w-full shrink-0 lg:w-80">
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 rounded-full bg-gray-200 dark:bg-gray-800" />
              <div className="min-w-0 flex-1">
                <div className="h-4 w-3/5 rounded bg-gray-200 dark:bg-gray-800" />
                <div className="mt-1.5 h-3 w-2/5 rounded bg-gray-200 dark:bg-gray-800" />
              </div>
            </div>
            <div className="mt-5 space-y-2.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-3.5 rounded bg-gray-200 dark:bg-gray-800" />
              ))}
            </div>
            <div className="mt-5 h-9 rounded-lg bg-gray-200 dark:bg-gray-800" />
          </div>
        </aside>
      </div>
    </main>
  );
}

type ContributorIdentityProps = {
  name: string;
  username?: string;
  image?: string | null;
  to: string | null;
};

function ContributorIdentity({
  name,
  username,
  image,
  to,
}: ContributorIdentityProps) {
  const content = (
    <>
      {image ? (
        <img
          src={image}
          alt=""
          className="h-10 w-10 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-sm font-bold text-white">
          {name[0]?.toUpperCase() ?? "?"}
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
          {name}
        </p>
        {username && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            @{username}
          </p>
        )}
      </div>
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        className="mb-4 flex items-center gap-3 rounded-lg transition hover:text-blue-700 dark:hover:text-blue-400"
      >
        {content}
      </Link>
    );
  }

  return <div className="mb-4 flex items-center gap-3">{content}</div>;
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
