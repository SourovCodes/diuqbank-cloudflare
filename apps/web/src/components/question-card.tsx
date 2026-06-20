import Link from "next/link";
import { ArrowRight, CalendarDays, Files, School } from "lucide-react";
import type { QuestionListItem } from "@diuqbank/api-client";

export function QuestionCard({ question }: { question: QuestionListItem }) {
  return (
    <Link
      href={`/questions/${question.id}`}
      className="group grid gap-4 rounded-2xl border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg sm:grid-cols-[1fr_auto] sm:items-center"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">
            {question.department.shortName}
          </span>
          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-700">
            {question.examType.name}
          </span>
        </div>
        <h2 className="mt-3 text-lg font-bold tracking-tight text-slate-950 group-hover:text-primary sm:text-xl">
          {question.title}
        </h2>
        <p className="mt-1 truncate text-sm text-muted-foreground">{question.course.name}</p>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <School className="size-4 text-slate-400" /> {question.department.name}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4 text-slate-400" /> {question.semester.name}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Files className="size-4 text-slate-400" /> {question.submissionCount} submission{question.submissionCount === 1 ? "" : "s"}
          </span>
        </div>
      </div>
      <span className="hidden size-10 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition group-hover:bg-primary group-hover:text-white sm:flex">
        <ArrowRight className="size-4.5" />
      </span>
    </Link>
  );
}
