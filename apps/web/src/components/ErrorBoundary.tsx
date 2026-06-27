import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { hasError: boolean }

// Top-level boundary: a render error in any page degrades to this fallback
// instead of white-screening the whole app. Uses window.location (not the
// router) so recovery is a guaranteed clean reset.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex py-16 justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <div className="mb-3 text-4xl">⚠️</div>
          <h2 className="mb-2 text-lg font-bold text-gray-900">Something went wrong</h2>
          <p className="mb-6 text-sm text-gray-600">
            An unexpected error occurred. Try reloading the page.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
            >
              Reload
            </button>
            <button
              onClick={() => { window.location.href = '/' }}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Go home
            </button>
          </div>
        </div>
      </div>
    )
  }
}
