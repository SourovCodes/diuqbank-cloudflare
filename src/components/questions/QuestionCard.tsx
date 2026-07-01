import { Link } from "react-router-dom";
import { Badge } from "../ui/Badge";
import type { Question } from "../../types/api";

type QuestionCardProps = {
  question: Question;
};

export function QuestionCard({ question }: QuestionCardProps) {
  return (
    <Link
      to={`/questions/${question.id}`}
      className="group grid gap-4 rounded-lg border border-gray-200 bg-white p-4 transition hover:border-blue-300 hover:bg-blue-50/40 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-500 dark:hover:bg-blue-500/5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
    >
      <div className="min-w-0">
        <h3 className="text-sm font-semibold leading-6 text-gray-900 group-hover:text-blue-700 dark:text-gray-100 dark:group-hover:text-blue-400">
          {question.course.name}
        </h3>
        <p className="mt-1 truncate text-sm text-gray-500 dark:text-gray-400">
          {question.semester.name} - {question.examType.name}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge label={question.department.shortName} variant="blue" />
          <Badge label={question.semester.name} variant="gray" />
          <Badge label={question.examType.name} variant="green" />
        </div>
      </div>

      <div className="flex items-center justify-between gap-5 border-t border-gray-100 pt-3 text-xs sm:flex-col sm:items-end sm:border-t-0 sm:pt-0 dark:border-gray-800">
        <span className="whitespace-nowrap font-semibold text-gray-700 dark:text-gray-300">
          {question.submissionCount} submission
          {question.submissionCount !== 1 ? "s" : ""}
        </span>
        <span className="font-semibold text-blue-600 group-hover:text-blue-700 dark:text-blue-400">
          View
        </span>
      </div>
    </Link>
  );
}
