import Link from "next/link";
import { Calendar, CalendarDays, ExternalLink, School } from "lucide-react";
import type { ContributorSubmission } from "@diuqbank/api-client";

import { Button } from "@/components/ui/button";

export function ContributorSubmissionCard({ submission }: { submission: ContributorSubmission }) {
  const { question } = submission;
  const batchSection = [submission.batch, submission.section].filter(Boolean).join(" / ") || "General";

  return (
    <article className="flex h-full flex-col rounded-xl border bg-card p-4 shadow-sm transition-colors hover:border-primary/50">
      <Link
        href={`/questions/${question.id}`}
        className="line-clamp-2 text-sm font-semibold transition-colors hover:text-primary"
      >
        {question.course.name}
      </Link>

      <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium">
        <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-1 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          <School className="size-3.5" />{question.department.shortName}
        </span>
        <span className="rounded-md bg-amber-100 px-2 py-1 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
          {question.examType.name}
        </span>
        <span className="inline-flex items-center gap-1 rounded-md bg-purple-100 px-2 py-1 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
          <Calendar className="size-3" />{question.semester.name}
        </span>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">{batchSection}</p>

      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarDays className="size-3.5" />
        {formatDate(submission.createdAt)}
        <span aria-hidden>·</span>
        {formatSize(submission.fileSize)}
      </div>

      {submission.pdfUrl ? (
        <Button asChild variant="outline" size="sm" className="mt-3 w-full">
          <a href={submission.pdfUrl} target="_blank" rel="noreferrer">
            <ExternalLink /> View PDF
          </a>
        </Button>
      ) : null}
    </article>
  );
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(timestamp * 1000));
}

function formatSize(bytes: number) {
  if (!bytes) return "Unknown";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}
