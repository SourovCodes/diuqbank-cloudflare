import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function AboutPage() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 text-3xl font-extrabold text-gray-900">About DIU Question Bank</h1>
        <p className="mb-8 text-gray-500">A community-driven archive of past exam papers for Daffodil International University students.</p>

        <div className="space-y-8 text-sm leading-relaxed text-gray-700">
          <section>
            <h2 className="mb-2 text-lg font-bold text-gray-900">What is this?</h2>
            <p>
              DIU Question Bank is a free resource where DIU students can find and share past exam question papers.
              Browse by department, course, semester, and exam type to quickly find what you need.
              All papers are contributed by fellow students.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-gray-900">How to Contribute</h2>
            <p className="mb-4">
              Sign in with your <strong>@diu.edu.bd</strong> Google account and choose one of two upload methods:
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <h3 className="mb-1 font-semibold text-blue-900">✋ Manual Submission</h3>
                <p className="text-xs text-blue-800">
                  Upload your PDF and fill in the question details manually. An admin will review and approve your submission.
                </p>
                <Link to="/submit/manual" className="mt-3 inline-block text-xs font-semibold text-blue-700 hover:underline">
                  Submit manually →
                </Link>
              </div>
              <div className="rounded-xl border border-purple-100 bg-purple-50 p-4">
                <h3 className="mb-1 font-semibold text-purple-900">🤖 Auto Submission</h3>
                <p className="text-xs text-purple-800">
                  Upload your PDF and let AI extract the course, semester, and exam type automatically. Review and confirm — no admin wait.
                </p>
                <Link to="/submit/auto" className="mt-3 inline-block text-xs font-semibold text-purple-700 hover:underline">
                  Auto submit →
                </Link>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-gray-900">Contributors</h2>
            <p>
              Check out our <Link to="/contributors" className="font-medium text-blue-600 hover:underline">contributors page</Link> to
              see who has shared the most question papers with the community.
            </p>
          </section>
        </div>

        {!isAuthenticated && (
          <div className="mt-10 rounded-xl border border-blue-200 bg-blue-50 p-6 text-center">
            <p className="mb-3 text-sm font-medium text-blue-900">Ready to contribute?</p>
            <Link
              to="/auth"
              className="inline-flex rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition"
            >
              Sign in with Google
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
