import type { Metadata } from "next";
import { FileText } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { CustomPagination } from "@/components/custom-pagination";
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Question Bank</h1>
        <p className="mt-2 text-muted-foreground">Browse past exam questions by department, course, semester, and exam type.</p>
      </div>

      <QuestionFilters
        initialFilters={{
          department: filters.departmentId ?? null,
          course: filters.courseId ?? null,
          semester: filters.semesterId ?? null,
          examType: filters.examTypeId ?? null,
        }}
        filterOptions={options}
      />

      <div className="mt-7 flex items-center justify-between gap-4 text-sm text-muted-foreground">
        <p>{questions.meta.total} question{questions.meta.total === 1 ? "" : "s"}</p>
        <p>Page {questions.meta.page} of {questions.meta.totalPages}</p>
      </div>

      {questions.data.length ? (
        <div className="mt-4 grid gap-4">
          {questions.data.map((question) => <QuestionCard key={question.id} question={question} />)}
        </div>
      ) : (
        <div className="mt-5"><EmptyState icon={FileText} title="No questions found" description="Try adjusting your filters or check back later for new questions." /></div>
      )}

      <CustomPagination currentPage={questions.meta.page} totalPages={questions.meta.totalPages} />
    </div>
  );
}
