import { Link } from "react-router-dom";
import { Badge } from "../ui/Badge";
import { formatCount } from "../../lib/format";
import type { Question } from "../../types/api";

type QuestionCardProps = {
  question: Question;
};

export function QuestionCard({ question }: QuestionCardProps) {
  return (
    <Link
      to={`/questions/${question.id}`}
      state={{ question }}
      className="group grid gap-4 rounded-xl border border-gray-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-500 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
    >
      <div className="min-w-0">
        <h3 className="text-base font-semibold leading-6 text-gray-900 group-hover:text-blue-700 dark:text-gray-100 dark:group-hover:text-blue-400">
          {question.course.name}
        </h3>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge label={question.department.shortName} variant="blue" />
          <Badge label={question.semester.name} variant="gray" />
          <Badge label={question.examType.name} variant="green" />
        </div>
      </div>

      <div className="flex items-center justify-between gap-5 border-t border-gray-100 pt-3 text-xs sm:flex-col sm:items-end sm:border-t-0 sm:pt-0 dark:border-gray-800">
        <span className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
          <span className="whitespace-nowrap font-semibold text-gray-700 dark:text-gray-300">
            {question.submissionCount} submission
            {question.submissionCount !== 1 ? "s" : ""}
          </span>
          <span className="whitespace-nowrap text-gray-500 dark:text-gray-400">
            {formatCount(question.viewCount)} view
            {question.viewCount !== 1 ? "s" : ""}
          </span>
        </span>
        <span className="font-semibold text-blue-600 group-hover:text-blue-700 dark:text-blue-400">
          View
        </span>
      </div>
    </Link>
  );
}

export function QuestionCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="h-4 w-2/5 rounded bg-gray-200 dark:bg-gray-800" />
      <div className="mt-3.5 flex gap-1.5">
        <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-800" />
        <div className="h-5 w-20 rounded-full bg-gray-200 dark:bg-gray-800" />
        <div className="h-5 w-14 rounded-full bg-gray-200 dark:bg-gray-800" />
      </div>
    </div>
  );
}
