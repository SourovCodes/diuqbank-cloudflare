import type { Metadata } from "next";
import { FileSearch } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Pagination } from "@/components/pagination";
import { QuestionCard } from "@/components/question-card";
import { QuestionFilters } from "@/components/question-filters";
import { getFilterOptions, getQuestions } from "@/lib/api/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Questions",
  description: "Browse DIU exam questions by department, course, semester, and exam type.",
};

type SearchParams = Record<string, string | string[] | undefined>;

const positiveInt = (value: string | string[] | undefined) => {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

export default async function QuestionsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const raw = await searchParams;
  const filters = {
    departmentId: positiveInt(raw.departmentId),
    courseId: positiveInt(raw.courseId),
    semesterId: positiveInt(raw.semesterId),
    examTypeId: positiveInt(raw.examTypeId),
  };
  const page = positiveInt(raw.page) ?? 1;

  const [options, questions] = await Promise.all([
    getFilterOptions(),
    getQuestions({ ...filters, page, perPage: 12 }),
  ]);

  const hrefForPage = (nextPage: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) if (value) params.set(key, String(value));
    if (nextPage > 1) params.set("page", String(nextPage));
    const query = params.toString();
    return query ? `/questions?${query}` : "/questions";
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Archive</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-950">Question bank</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">Filter previous exam papers and open any available submission in the reader.</p>
      </div>

      <QuestionFilters options={options} values={filters} />

      <div className="mt-7 flex items-center justify-between gap-4 text-sm text-muted-foreground">
        <p>{questions.meta.total} question{questions.meta.total === 1 ? "" : "s"}</p>
        <p>Page {questions.meta.page} of {questions.meta.totalPages}</p>
      </div>

      {questions.data.length ? (
        <div className="mt-4 grid gap-4">
          {questions.data.map((question) => <QuestionCard key={question.id} question={question} />)}
        </div>
      ) : (
        <div className="mt-5"><EmptyState icon={FileSearch} title="No questions found" description="Try clearing one or more filters, or check back after more papers are added." /></div>
      )}

      <Pagination currentPage={questions.meta.page} totalPages={questions.meta.totalPages} hrefForPage={hrefForPage} />
    </div>
  );
}
