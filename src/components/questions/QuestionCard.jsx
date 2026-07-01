import { Link } from "react-router-dom";
import { Badge } from "../ui/Badge";

export function QuestionCard({ question }) {
  return (
    <Link
      to={`/questions/${question.id}`}
      className="group flex flex-col gap-2 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-500"
    >
      <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 dark:text-gray-100 dark:group-hover:text-blue-400">
        {question.title}
      </h3>
      <p className="truncate text-xs text-gray-500 dark:text-gray-400">
        {question.course.name}
      </p>
      <div className="flex flex-wrap gap-1.5">
        <Badge label={question.department.shortName} variant="blue" />
        <Badge label={question.semester.name} variant="gray" />
        <Badge label={question.examType.name} variant="green" />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-gray-600 dark:text-gray-300">
          {question.submissionCount} submission
          {question.submissionCount !== 1 ? "s" : ""}
        </span>
        <span className="text-blue-600 group-hover:underline dark:text-blue-400">
          View →
        </span>
      </div>
    </Link>
  );
}
