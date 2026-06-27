import { Link } from 'react-router-dom'
import { QuestionCard } from '../components/questions/QuestionCard'
import { Spinner } from '../components/ui/Spinner'
import { useQuestions } from '../hooks/useQuestions'
import { useContributors } from '../hooks/useContributors'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export function HomePage() {
  useDocumentTitle()
  const { data: questionsData, isPending: questionsLoading, isError: questionsError } = useQuestions({
    page: 1,
    perPage: 6,
    departmentId: '',
    courseId: '',
    semesterId: '',
    examTypeId: '',
  })

  const { data: contributorsData, isPending: contributorsLoading } = useContributors(1)
  const totalQuestions = questionsLoading ? '...' : questionsData?.meta.total.toLocaleString() ?? '--'
  const totalContributors = contributorsLoading ? '...' : contributorsData?.meta.total.toLocaleString() ?? '--'
  const recentQuestions = questionsData?.data ?? []

  return (
    <div className="bg-gray-50">
      <section className="border-b border-gray-200 bg-white">
        <div className="container mx-auto grid gap-10 px-4 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-18">
          <div className="max-w-3xl">
            <p className="mb-4 inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
              Daffodil International University
            </p>
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-950 sm:text-5xl">
              Find DIU question papers faster.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-600">
              Browse past exam papers by department, course, semester, and exam type in a clean question bank built for DIU students.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/questions"
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                Browse questions
              </Link>
              <Link
                to="/contributors"
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-800 transition hover:border-gray-400 hover:bg-gray-50"
              >
                View contributors
              </Link>
            </div>

            <div className="mt-10 grid max-w-xl grid-cols-2 overflow-hidden rounded-lg border border-gray-200 bg-white">
              <div className="border-r border-gray-200 px-5 py-4">
                <div className="text-3xl font-extrabold tracking-tight text-gray-950">{totalQuestions}</div>
                <div className="mt-1 text-sm text-gray-500">Questions</div>
              </div>
              <div className="px-5 py-4">
                <div className="text-3xl font-extrabold tracking-tight text-gray-950">{totalContributors}</div>
                <div className="mt-1 text-sm text-gray-500">Contributors</div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 shadow-sm">
            <div className="rounded-md border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Quick browse</p>
                  <h2 className="mt-1 text-base font-bold text-gray-950">Start from here</h2>
                </div>
                <Link to="/questions" className="text-sm font-semibold text-blue-700 hover:text-blue-800">
                  All
                </Link>
              </div>

              <div className="mt-4 grid gap-2">
                <Link to="/questions" className="rounded-lg border border-gray-200 px-4 py-3 transition hover:border-blue-200 hover:bg-blue-50">
                  <div className="text-sm font-semibold text-gray-900">Browse all papers</div>
                  <div className="mt-1 text-xs text-gray-500">Newest uploads across departments</div>
                </Link>
                <Link to="/submit/manual" className="rounded-lg border border-gray-200 px-4 py-3 transition hover:border-green-200 hover:bg-green-50">
                  <div className="text-sm font-semibold text-gray-900">Share a question paper</div>
                  <div className="mt-1 text-xs text-gray-500">Add missing papers for classmates</div>
                </Link>
                <Link to="/contributors" className="rounded-lg border border-gray-200 px-4 py-3 transition hover:border-gray-300 hover:bg-gray-50">
                  <div className="text-sm font-semibold text-gray-900">See contributors</div>
                  <div className="mt-1 text-xs text-gray-500">People keeping the bank useful</div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Questions */}
      <section className="py-12 sm:py-14">
        <div className="container mx-auto px-4">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-blue-700">Recently added</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-gray-950">Fresh question papers</h2>
            </div>
            <Link to="/questions" className="shrink-0 text-sm font-semibold text-blue-700 hover:text-blue-800">
              View all
            </Link>
          </div>

          {questionsLoading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : questionsError ? (
            <div className="rounded-lg border border-gray-200 bg-white px-5 py-8 text-center text-sm text-gray-500">
              Recent questions could not be loaded right now.
            </div>
          ) : recentQuestions.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white px-5 py-8 text-center text-sm text-gray-500">
              No question papers have been added yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recentQuestions.map(q => (
                <QuestionCard key={q.id} question={q} />
              ))}
            </div>
          )}

          <div className="mt-8 text-center">
            <Link
              to="/questions"
              className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
            >
              Browse all questions
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
