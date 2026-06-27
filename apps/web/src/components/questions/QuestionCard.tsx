import { Link } from 'react-router-dom'
import { Badge } from '../ui/Badge'
import type { Question } from '@diuqbank/shared/types'

type Props = { question: Question; variant?: 'grid' | 'list' }

export function QuestionCard({ question, variant = 'grid' }: Props) {
  const base = 'group rounded-xl border border-gray-200 bg-white shadow-sm transition hover:border-blue-300 hover:shadow-md'

  if (variant === 'list') {
    return (
      <Link to={`/questions/${question.id}`} className={`${base} flex flex-col gap-2 px-5 py-4`}>
        <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-700">
          {question.title}
        </h3>
        <p className="truncate text-xs text-gray-500">{question.course.name}</p>
        <div className="flex flex-wrap gap-1.5">
          <Badge label={question.department.shortName} variant="blue" />
          <Badge label={question.semester.name} variant="gray" />
          <Badge label={question.examType.name} variant="green" />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-gray-600">
            {question.submissionCount} submission{question.submissionCount !== 1 ? 's' : ''}
          </span>
          <span className="text-blue-600 group-hover:underline">View →</span>
        </div>
      </Link>
    )
  }

  return (
    <Link to={`/questions/${question.id}`} className={`${base} flex flex-col gap-3 p-5`}>
      <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-700">
        {question.title}
      </h3>
      <div className="flex flex-wrap gap-1.5">
        <Badge label={question.department.shortName} variant="blue" />
        <Badge label={question.semester.name} variant="gray" />
        <Badge label={question.examType.name} variant="green" />
      </div>
      <p className="truncate text-xs text-gray-500">{question.course.name}</p>
      <div className="mt-auto flex items-center justify-between text-xs">
        <span className="font-medium text-gray-700">
          {question.submissionCount} submission{question.submissionCount !== 1 ? 's' : ''}
        </span>
        <span className="text-blue-600 group-hover:underline">View →</span>
      </div>
    </Link>
  )
}
