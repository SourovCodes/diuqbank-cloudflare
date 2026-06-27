import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="flex py-16 justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mb-2 text-5xl font-extrabold text-blue-600">404</div>
        <h1 className="mb-2 text-lg font-bold text-gray-900">Page not found</h1>
        <p className="mb-6 text-sm text-gray-600">
          The page you're looking for doesn't exist or may have moved.
        </p>
        <Link
          to="/"
          className="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
        >
          Back to home
        </Link>
      </div>
    </div>
  )
}
