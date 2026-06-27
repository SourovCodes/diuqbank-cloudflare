import { Link } from 'react-router-dom'
import { QuestionCard } from '../components/questions/QuestionCard'
import { Spinner } from '../components/ui/Spinner'
import { useQuestions } from '../hooks/useQuestions'
import { useContributors } from '../hooks/useContributors'

export function HomePage() {
  const { data: questionsData, isPending: questionsLoading } = useQuestions({
    page: 1,
    perPage: 6,
    departmentId: '',
    courseId: '',
    semesterId: '',
    examTypeId: '',
  })

  const { data: contributorsData } = useContributors(1)

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-blue-700 to-blue-600 px-4 py-20 text-center text-white">
        <h1 className="mb-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
          DIU Question Bank
        </h1>
        <p className="mx-auto mb-8 max-w-xl text-blue-100 text-lg">
          Find past exam question papers by department, course, and semester — for Daffodil International University students.
        </p>
        <Link
          to="/questions"
          className="inline-flex items-center rounded-xl bg-white px-6 py-3 text-base font-semibold text-blue-700 shadow hover:bg-blue-50 transition"
        >
          Browse Questions →
        </Link>
      </section>

      {/* Stats */}
      <section className="border-b border-gray-100 bg-white py-8">
        <div className="container mx-auto flex justify-center gap-16 px-4">
          <div className="text-center">
            <div className="text-4xl font-extrabold text-blue-700">
              {questionsData ? questionsData.meta.total.toLocaleString() : '—'}
            </div>
            <div className="mt-1 text-sm text-gray-500">Questions</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-extrabold text-blue-700">
              {contributorsData ? contributorsData.meta.total.toLocaleString() : '—'}
            </div>
            <div className="mt-1 text-sm text-gray-500">Contributors</div>
          </div>
        </div>
      </section>

      {/* Recent Questions */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Recently Added</h2>
            <Link to="/questions" className="text-sm font-medium text-blue-600 hover:underline">
              View all →
            </Link>
          </div>

          {questionsLoading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {questionsData?.data.map(q => (
                <QuestionCard key={q.id} question={q} />
              ))}
            </div>
          )}

          <div className="mt-8 text-center">
            <Link
              to="/questions"
              className="inline-flex items-center rounded-lg border border-blue-600 px-5 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50 transition"
            >
              Browse all questions →
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
